/**
 * Host half of the requirement/task view.
 *
 * Registers a handful of POST routes on the client connection
 * (`/api/task-hub/*`) and keeps API credentials in the host credentials
 * service. The active source (TAPD / ZenTao / GitLab) is part of the settings,
 * so the panel stays self-contained and can switch between trackers.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { DispatchError, deliverAssets, dispatchStory } from './dispatch.js'
import { fetchIssueAssets } from './gitlab.js'
import {
  TapdError,
  downloadAttachment,
  fetchStory,
  fetchStoryAttachments,
  fetchStoryImages,
  listProjects,
} from './tapd.js'
import { listContainers, resetZentaoTokens } from './zentao.js'
import { listTasks, fetchTask, providerOf, PROVIDERS, uidOf } from './sources.js'
import {
  DATA_DIR,
  findDispatch,
  loadSettings,
  loadState,
  putDispatch,
  saveSettings,
} from './store.js'

export const name = 'dsh-task-hub'
export const inject = ['connection']

const VERSION = '0.6.1'
const REF_USER = 'TAPD_API_USER'
const REF_TOKEN = 'TAPD_API_TOKEN'
const REF_PASSWORD = 'TAPD_API_PASSWORD'
const REF_ZENTAO_PASSWORD = 'ZENTAO_PASSWORD'
const REF_GITLAB_TOKEN = 'GITLAB_TOKEN'
const NO_STORE = { 'cache-control': 'no-store' }

function ok(value) {
  return Response.json({ ok: true, value }, { headers: NO_STORE })
}

function fail(error) {
  const code = typeof error?.code === 'string' && error.code.includes('/') ? error.code : 'source/internal'
  const status = /\/auth-failed$/.test(code)
    ? 401
    : code.startsWith('dispatch/') ||
        /\/(missing|bad-request|not-found|credential-not-writable|unknown)/.test(code)
      ? 400
      : 500
  const message = error?.message ?? String(error)
  return Response.json({ ok: false, error: { code, message, details: error?.details } }, { status, headers: NO_STORE })
}

function service(ctx, serviceName) {
  try {
    return ctx.get(serviceName) ?? undefined
  } catch {
    return undefined
  }
}

function requireService(ctx, serviceName, label) {
  const found = service(ctx, serviceName)
  if (!found) throw new DispatchError('dispatch/missing-service', `宿主没有提供 ${label ?? serviceName} 服务`)
  return found
}

async function readSecret(ctx, ref) {
  const credentials = service(ctx, 'credentials')
  if (!credentials) return ''
  try {
    const record = await credentials.resolve(ref)
    return record?.value ? String(record.value) : ''
  } catch {
    return ''
  }
}

/**
 * Resolve credentials right before every request; never cache them.
 * TAPD keeps its token/basic fallback, ZenTao uses account+password, GitLab a
 * personal access token.
 */
async function readCredentials(ctx) {
  const settings = await loadSettings()
  const tapd = settings.tapd
  let apiUser = tapd.apiUser
  if (!apiUser) apiUser = await readSecret(ctx, REF_USER)
  let token = await readSecret(ctx, REF_TOKEN)
  if (!token) {
    // v0.1 stored the personal token under the API password ref.
    token = await readSecret(ctx, REF_PASSWORD)
  }
  const apiPassword = await readSecret(ctx, REF_PASSWORD)
  const zentaoAccount = settings.zentao.account
  const zentaoPassword = await readSecret(ctx, REF_ZENTAO_PASSWORD)
  const gitlabToken = await readSecret(ctx, REF_GITLAB_TOKEN)
  const nick = tapd.nick || (apiUser.includes('@') ? apiUser.split('@')[0] : '')
  return {
    settings,
    nick,
    credentials: {
      tapd: { token, apiUser, apiPassword },
      zentao: { account: zentaoAccount, password: zentaoPassword },
      gitlab: { token: gitlabToken },
    },
  }
}

async function credentialStatus(ctx) {
  const credentials = service(ctx, 'credentials')
  const empty = { tapd: { token: false, user: false, password: false }, zentao: { password: false }, gitlab: { token: false } }
  if (!credentials) return empty
  const configured = (ref) => {
    try {
      return Boolean(credentials.describe?.(ref)?.configured)
    } catch {
      return false
    }
  }
  const status = {
    tapd: {
      token: configured(REF_TOKEN) || configured(REF_PASSWORD),
      user: configured(REF_USER),
      password: configured(REF_PASSWORD),
    },
    zentao: { password: configured(REF_ZENTAO_PASSWORD) },
    gitlab: { token: configured(REF_GITLAB_TOKEN) },
  }
  return status
}

function workspaceSummaries(ctx) {
  const registry = service(ctx, 'workspaceRegistry')
  if (!registry) return []
  try {
    return registry.list().map((workspace) => ({
      id: workspace.id,
      title: workspace.title,
      path: workspace.path,
      sessionIds: Array.isArray(workspace.sessionIds) ? workspace.sessionIds : [],
    }))
  } catch {
    return []
  }
}

async function sessionStatuses(ctx) {
  const sessions = service(ctx, 'sessionController')
  if (!sessions?.list) return {}
  try {
    const page = await sessions.list({}, AbortSignal.timeout(10_000))
    const items = Array.isArray(page?.items) ? page.items : []
    // Deleting a session archives it: it leaves every workspace's sessionIds but
    // session.list still reports it. Workspace membership is the durable check,
    // so an archived session counts as missing and 派发 becomes usable again.
    const registered = new Set()
    for (const workspace of service(ctx, 'workspaceRegistry')?.list?.() ?? []) {
      for (const id of workspace.sessionIds ?? []) registered.add(id)
    }
    return Object.fromEntries(
      items
        .filter((item) => registered.size === 0 || registered.has(item.sessionId))
        .map((item) => [item.sessionId, { running: Boolean(item.running), updatedAt: item.updatedAt ?? '' }]),
    )
  } catch {
    return {}
  }
}

async function realPathOr(target) {
  if (!target) return ''
  try {
    return await fs.realpath(target)
  } catch {
    return target
  }
}

/**
 * In-place dispatch switches branches in the user's own checkout, so it must
 * not run while another agent is working in that same directory.
 */
async function assertWorkspaceIdle(ctx, repoPath) {
  const sessions = service(ctx, 'sessionController')
  if (!sessions?.list) return
  let page
  try {
    page = await sessions.list({}, AbortSignal.timeout(10_000))
  } catch {
    return
  }
  const items = Array.isArray(page?.items) ? page.items : []
  const root = await realPathOr(repoPath)
  if (!root) return
  const busy = []
  for (const item of items) {
    if (!item?.running || !item.cwd) continue
    const cwd = await realPathOr(item.cwd)
    if (cwd === root || cwd.startsWith(root + path.sep)) {
      busy.push({ sessionId: item.sessionId, cwd: item.cwd })
    }
  }
  if (busy.length > 0) {
    throw new DispatchError(
      'dispatch/workspace-busy',
      `这个工作区还有 ${busy.length} 个会话正在运行，切换分支会打断它们。请等它结束、改用独立 worktree，或让 Agent 先停手。`,
      { sessions: busy },
    )
  }
}

const inflightDispatches = new Set()

function parseBody(body) {
  return body && typeof body === 'object' ? body : {}
}

function isString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function missingCredentials(provider) {
  if (provider === 'zentao') {
    return new TapdError('zentao/missing-credentials', '尚未配置禅道账号密码。请在设置里填写禅道账号与密码。')
  }
  if (provider === 'gitlab') {
    return new TapdError('gitlab/missing-credentials', '尚未配置 GitLab 访问令牌。请在设置里填写 Token。')
  }
  return new TapdError('tapd/missing-credentials', '尚未配置 TAPD 个人访问令牌')
}

function hasCredentials(provider, credentials) {
  if (provider === 'zentao') return Boolean(credentials.zentao.account && credentials.zentao.password)
  if (provider === 'gitlab') return Boolean(credentials.gitlab.token)
  return Boolean(credentials.tapd.token || (credentials.tapd.apiUser && credentials.tapd.apiPassword))
}

async function collectTasks(ctx) {
  const { settings, credentials } = await readCredentials(ctx)
  const provider = providerOf(settings)
  if (!hasCredentials(provider, credentials)) throw missingCredentials(provider)
  const result = await listTasks({
    provider,
    settings,
    credentials,
    excludeCompleted: settings.excludeCompleted,
  })
  const dispatches = await loadState()
  const running = await sessionStatuses(ctx)
  const stories = result.stories.map((story) => {
    // Old TAPD records were keyed by the bare story id.
    const record = dispatches[story.uid] ?? (provider === 'tapd' ? dispatches[String(story.id)] : undefined)
    const session = record?.sessionId ? running[record.sessionId] : undefined
    return {
      ...story,
      dispatch: record
        ? {
            sessionId: record.sessionId,
            branch: record.branch,
            workspaceId: record.workspaceId,
            baseBranch: record.baseBranch ?? '',
            worktreePath: record.worktreePath ?? '',
            createdAt: record.createdAt ?? '',
            attachments: record.attachments ?? [],
            images: record.images ?? [],
            running: Boolean(session?.running),
            sessionMissing: record.sessionId ? !session : false,
          }
        : null,
    }
  })
  return {
    provider,
    stories,
    total: stories.length,
    rawCount: result.rawCount,
    projects: result.projects,
    projectNames: settings.tapd.projectNames,
    iterations: result.iterations ?? [],
    ownerFilteredEmpty: result.rawCount > 0 && stories.length === 0,
  }
}

async function handleState(ctx) {
  const { settings, nick, credentials } = await readCredentials(ctx)
  return {
    settings,
    provider: providerOf(settings),
    nick: settings.tapd.nick || nick,
    credentials: await credentialStatus(ctx),
    credentialPresence: {
      tapd: {
        token: Boolean(credentials.tapd.token),
        basic: Boolean(credentials.tapd.apiUser && credentials.tapd.apiPassword),
      },
      zentao: { password: Boolean(credentials.zentao.password) },
      gitlab: { token: Boolean(credentials.gitlab.token) },
    },
    workspaces: workspaceSummaries(ctx),
    dataDir: DATA_DIR,
    version: VERSION,
    services: {
      workspaceRegistry: Boolean(service(ctx, 'workspaceRegistry')),
      sessionController: Boolean(service(ctx, 'sessionController')),
      credentials: Boolean(service(ctx, 'credentials')),
    },
  }
}

const SETTINGS_KEYS = ['defaultWorkspacePath', 'baseBranch', 'agentPreset']

async function handleSaveSettings(ctx, body) {
  const patch = {}
  if (PROVIDERS.includes(body.provider)) patch.provider = body.provider
  for (const key of SETTINGS_KEYS) {
    if (body[key] !== undefined) patch[key] = body[key]
  }
  for (const key of ['useWorktree', 'excludeCompleted']) {
    if (typeof body[key] === 'boolean') patch[key] = body[key]
  }
  for (const key of ['tapd', 'zentao', 'gitlab']) {
    if (body[key] && typeof body[key] === 'object' && !Array.isArray(body[key])) {
      patch[key] = body[key]
    }
  }
  if (isString(body.token)) {
    await writeCredential(ctx, REF_TOKEN, body.token, 'TAPD 个人访问令牌')
  }
  if (isString(body.apiPassword)) {
    await writeCredential(ctx, REF_PASSWORD, body.apiPassword, 'TAPD API 密码')
  }
  if (isString(body.zentaoPassword)) {
    await writeCredential(ctx, REF_ZENTAO_PASSWORD, body.zentaoPassword, '禅道密码')
    resetZentaoTokens()
  }
  if (isString(body.gitlabToken)) {
    await writeCredential(ctx, REF_GITLAB_TOKEN, body.gitlabToken, 'GitLab 访问令牌')
  }
  const apiUser = body.apiUser ?? body.tapd?.apiUser
  if (isString(apiUser)) {
    const credentials = service(ctx, 'credentials')
    if (credentials?.set) {
      try {
        await credentials.set(REF_USER, apiUser)
      } catch {
        // The settings file still holds the user name; this is only a mirror.
      }
    }
  }
  await saveSettings(patch)
  return handleState(ctx)
}

async function writeCredential(ctx, ref, value, label) {
  const credentials = requireService(ctx, 'credentials', 'credentials')
  try {
    await credentials.set(ref, value)
  } catch (error) {
    throw new TapdError(
      'tapd/credential-not-writable',
      `无法写入${label}（${error?.message ?? error}），可以改为设置环境变量 ${ref}`,
    )
  }
}

/** Projects the token owner participates in, for the settings picker. */
async function handleProjects(ctx, body) {
  const { settings, nick, credentials } = await readCredentials(ctx)
  // The settings dialog can verify a token before it is written to the store.
  const inlineToken = isString(body.token) ? body.token.trim() : ''
  const requestedNick = isString(body.nick)
    ? body.nick.trim()
    : isString(body.apiUser)
      ? String(body.apiUser).split('@')[0].trim()
      : ''
  const result = await listProjects({
    credentials: inlineToken ? { ...credentials.tapd, token: inlineToken } : credentials.tapd,
    nick: requestedNick || nick,
  })
  const projectNames = { ...settings.tapd.projectNames }
  for (const project of result.projects) projectNames[project.id] = project.name
  return { ...result, projectNames }
}

/** ZenTao products/projects for the settings picker, before saving. */
async function handleZentaoContainers(ctx, body) {
  const { settings, credentials } = await readCredentials(ctx)
  const baseUrl = isString(body.baseUrl) ? body.baseUrl.trim() : settings.zentao.baseUrl
  const account = isString(body.account) ? body.account.trim() : settings.zentao.account
  const password = isString(body.password) ? body.password : credentials.zentao.password
  if (!account || !password) {
    throw new TapdError('zentao/missing-credentials', '请先填写禅道账号与密码')
  }
  return listContainers({ baseUrl, credentials: { account, password } })
}

/**
 * Fetch every asset the dispatched agent should receive. TAPD walks the story's
 * parent/root attachments and pasted screenshots; GitLab downloads uploads
 * referenced from the issue description. ZenTao has no stable v1 attachment
 * endpoint, so its description is the only payload.
 */
async function loadStoryAssets({ provider, settings, credentials, projectId, story }) {
  if (!story) return { files: [], images: [] }
  if (provider === 'gitlab') {
    try {
      return await fetchIssueAssets({
        description: story.description,
        baseUrl: settings.gitlab.baseUrl,
        token: credentials.gitlab.token,
      })
    } catch (error) {
      console.warn(`[dsh-task-hub] GitLab 附件读取失败，继续派发：${error?.message ?? error}`)
      return { files: [], images: [] }
    }
  }
  if (provider !== 'tapd') return { files: [], images: [] }

  const targetProject = projectId || String(story?.projectId ?? '')
  if (!targetProject) return { files: [], images: [] }

  const related = [story]
  for (const id of [story.parentId, story.rootId]) {
    const relatedId = String(id ?? '').trim()
    if (!relatedId || related.some((item) => item.id === relatedId)) continue
    try {
      related.push(await fetchStory({ credentials: credentials.tapd, projectId: targetProject, storyId: relatedId }))
    } catch (error) {
      // A parent that is invisible or temporarily unavailable must not block
      // the child dispatch; its own assets are still delivered.
      console.warn(
        `[dsh-task-hub] 父需求 ${relatedId} 读取失败，继续使用当前需求：${error?.message ?? error}`,
      )
    }
  }

  const attachments = []
  const seenAttachments = new Set()
  for (const relatedStory of related) {
    const rows = await fetchStoryAttachments({
      credentials: credentials.tapd,
      projectId: targetProject,
      storyId: relatedStory.id,
    })
    for (const attachment of rows) {
      if (seenAttachments.has(attachment.id)) continue
      seenAttachments.add(attachment.id)
      attachments.push(attachment)
    }
  }
  const files = []
  for (const attachment of attachments) {
    files.push(await downloadAttachment({ credentials: credentials.tapd, projectId: targetProject, attachment }))
  }
  // Images pasted into the description are not 附件; fetch them through
  // files/get_image so the agent sees the screenshots, not just a name.
  const images = await fetchStoryImages({
    credentials: credentials.tapd,
    projectId: targetProject,
    descriptions: related.map((item) => item.description),
  })
  return { files, images }
}

/**
 * Re-dispatching a story normally returns the existing session. If that
 * session was created before assets were carried, backfill them once instead
 * of leaving it text-only forever (the list offers no second dispatch).
 */
async function backfillDispatchAssets(ctx, record, { provider, settings, credentials, story, key }) {
  const unchanged = { ...record, alreadyDispatched: true }
  const known = (record.attachments?.length ?? 0) + (record.images?.length ?? 0)
  if (known > 0) return unchanged

  const assets = await loadStoryAssets({ provider, settings, credentials, projectId: story.projectId, story })
  if (assets.files.length === 0 && assets.images.length === 0) return unchanged

  const sessions = requireService(ctx, 'sessionController', 'sessionController')
  const uploads = service(ctx, 'fileUploads')
  const delivered = await deliverAssets({
    sessionId: record.sessionId,
    files: assets.files,
    images: assets.images,
    text: '补充这条需求随任务下发的附件与截图（此前派发时未携带），请结合它们继续。',
    services: { sessionController: sessions, fileUploads: uploads },
  })
  const updated = {
    ...record,
    attachments: [...(record.attachments ?? []), ...delivered.attachments],
    images: [...(record.images ?? []), ...delivered.images],
  }
  await putDispatch(key, updated)
  return { ...updated, alreadyDispatched: true, assetsAdded: true }
}

async function handleDispatch(ctx, body) {
  const settings = await loadSettings()
  const { credentials } = await readCredentials(ctx)
  const provider = providerOf(settings)
  const storyId = String(body.storyId ?? body.story?.id ?? '').trim()
  const projectId = String(body.projectId ?? body.story?.projectId ?? '').trim()
  if (!storyId) throw new TapdError('source/bad-request', '缺少需求 ID')
  const branchName = String(body.branchName ?? '').trim()

  const key = uidOf(provider, storyId)
  // Two clicks on 派发 must not create two sessions/branches.
  if (inflightDispatches.has(key)) {
    throw new DispatchError('dispatch/in-progress', '这个需求正在派发，请稍候再试。')
  }
  inflightDispatches.add(key)
  try {
    let story = null
    if (body.story && typeof body.story === 'object') {
      try {
        story = await fetchTask({ provider, settings, credentials, story: body.story })
      } catch (error) {
        // A refresh failure must not block dispatching the list snapshot the
        // user is looking at (except when authentication itself is broken).
        if (String(error?.code ?? '').endsWith('auth-failed')) throw error
        story = body.story
      }
    } else if (provider === 'tapd' && projectId) {
      story = await fetchTask({
        provider,
        settings,
        credentials,
        story: { id: storyId, projectId, source: 'tapd' },
      })
    }
    if (!story) throw new TapdError('source/bad-request', '缺少需求信息')
    story = { ...story, uid: key, source: provider }

    // A dispatch only counts while the session actually exists; a deleted
    // session must fall through to a fresh dispatch instead of showing stale UI.
    const existing = await findDispatch(provider, storyId)
    if (existing?.sessionId) {
      const statuses = await sessionStatuses(ctx)
      if (statuses[existing.sessionId]) {
        return await backfillDispatchAssets(ctx, existing, { provider, settings, credentials, story, key })
      }
    }

    if (!branchName) throw new TapdError('dispatch/missing-branch', '请填写完整的分支名称')

    const registry = requireService(ctx, 'workspaceRegistry', 'workspaceRegistry')
    const sessions = requireService(ctx, 'sessionController', 'sessionController')
    const uploads = service(ctx, 'fileUploads')

    const record = await dispatchStory({
      story,
      settings,
      services: { workspaceRegistry: registry, sessionController: sessions, fileUploads: uploads },
      assertIdle: (target) => assertWorkspaceIdle(ctx, target),
      loadAttachments: () => loadStoryAssets({ provider, settings, credentials, projectId, story }),
      options: {
        branchName,
        workspaceId: isString(body.workspaceId) ? body.workspaceId : undefined,
        workspacePath: isString(body.workspacePath) ? body.workspacePath : undefined,
        useWorktree: typeof body.useWorktree === 'boolean' ? body.useWorktree : undefined,
        baseBranch: isString(body.baseBranch) ? body.baseBranch : undefined,
        prompt: isString(body.prompt) ? body.prompt : undefined,
        smartCheckout: body.smartCheckout !== false,
        backupRoot: path.join(DATA_DIR, 'backups'),
      },
    })
    await putDispatch(key, { ...record, provider, storySource: provider })
    return record
  } finally {
    inflightDispatches.delete(key)
  }
}

export function apply(ctx) {
  ctx.inject(['connection'], (scoped) => {
    const connection = scoped.get('connection')
    if (!connection?.fetch?.register) return

    const route = (path, label, handler) =>
      scoped.effect(
        () =>
          connection.fetch.register({
            path: `/api/task-hub/${path}`,
            methods: ['POST'],
            requestBody: 'buffered',
            fetch: async (request) => {
              try {
                const body = parseBody(await request.json().catch(() => null))
                return ok(await handler(body))
              } catch (error) {
                return fail(error)
              }
            },
          }),
        `dsh-task-hub: ${label}`,
      )

    route('state', 'state', () => handleState(ctx))
    route('settings', 'settings', (body) => handleSaveSettings(ctx, body))
    route('projects', 'projects', (body) => handleProjects(ctx, body))
    route('zentao/containers', 'zentao containers', (body) => handleZentaoContainers(ctx, body))
    route('tasks', 'tasks', () => collectTasks(ctx))
    route('dispatch', 'dispatch', (body) => handleDispatch(ctx, body))
    route('status', 'status', async () => {
      const running = await sessionStatuses(ctx)
      const state = await loadState()
      const entries = Object.entries(state).map(([key, record]) => ({
        uid: key,
        storyId: record?.storyId ?? key,
        ...record,
        running: Boolean(record?.sessionId ? running[record.sessionId]?.running : false),
        sessionMissing: record?.sessionId ? !running[record.sessionId] : false,
      }))
      return { entries, workspaces: workspaceSummaries(ctx) }
    })
  })
}
