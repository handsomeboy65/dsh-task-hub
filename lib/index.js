/**
 * Host half of the requirement/task view.
 *
 * Registers a handful of POST routes on the client connection
 * (`/api/task-hub/*`) and keeps API credentials in the host credentials
 * service. The active source (TAPD / ZenTao) is part of the settings,
 * so the panel stays self-contained and can switch between trackers.
 */
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import { DispatchError, deliverAssets, dispatchStory } from './dispatch.js'
import { readDraftAsset, saveDraftAssets } from './drafts.js'
import { buildTaskPrompt, refreshTaskPrompt } from './prompt.js'
import { TapdError, listProjects } from './tapd.js'
import { apiRoot as zentaoApiRoot, basicAuthHeader, listContainers, resetZentaoTokens } from './zentao.js'
import { listTasks, fetchTask, fetchTaskAssets, providerOf, PROVIDERS, uidOf } from './sources.js'
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

const pkg = createRequire(import.meta.url)('../package.json')
const REF_USER = 'TAPD_API_USER'
const REF_TOKEN = 'TAPD_API_TOKEN'
const REF_PASSWORD = 'TAPD_API_PASSWORD'
const REF_ZENTAO_PASSWORD = 'ZENTAO_PASSWORD'
const REF_ZENTAO_BASIC_PASSWORD = 'ZENTAO_BASIC_PASSWORD'
const NO_STORE = { 'cache-control': 'no-store' }

function ok(value) {
  return Response.json({ ok: true, value }, { headers: NO_STORE })
}

function fail(error) {
  const code = typeof error?.code === 'string' && error.code.includes('/') ? error.code : 'source/internal'
  const status = /\/(?:basic-)?auth-failed$/.test(code)
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

function zentaoLoginChanged(saved, next) {
  return zentaoApiRoot(saved.baseUrl) !== zentaoApiRoot(next.baseUrl) ||
    saved.account !== String(next.account ?? '').trim()
}

function zentaoPasswordRequired() {
  return new TapdError('zentao/missing-credentials', '禅道地址或账号已变更，请重新填写禅道登录密码。')
}

function sameZentaoGateway(saved, next) {
  return saved.basicAccount === next.basicAccount && zentaoApiRoot(saved.baseUrl) === zentaoApiRoot(next.baseUrl)
}

async function zentaoBasicCredentials(ctx, saved, next, password) {
  return {
    account: next.basicAccount,
    password: password || (sameZentaoGateway(saved, next) ? await readSecret(ctx, REF_ZENTAO_BASIC_PASSWORD) : ''),
  }
}

/**
 * Resolve credentials right before every request; never cache them.
 * TAPD keeps its token/basic fallback, ZenTao uses account+password.
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
  const basicAuth = settings.zentao.basicAuth
    ? { account: settings.zentao.basicAccount, password: await readSecret(ctx, REF_ZENTAO_BASIC_PASSWORD) }
    : undefined
  const nick = tapd.nick || (apiUser.includes('@') ? apiUser.split('@')[0] : '')
  return {
    settings,
    nick,
    credentials: {
      tapd: { token, apiUser, apiPassword, allowQueryAuth: tapd.allowQueryAuth },
      zentao: { account: zentaoAccount, password: zentaoPassword, basicAuth },
    },
  }
}

async function credentialStatus(ctx) {
  const credentials = service(ctx, 'credentials')
  const empty = { tapd: { token: false, user: false, password: false }, zentao: { password: false } }
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
  const registry = service(ctx, 'workspaceRegistry')
  let registered = null
  try {
    const workspaces = registry?.list?.()
    if (Array.isArray(workspaces) && workspaces.every((workspace) => Array.isArray(workspace.sessionIds))) {
      registered = new Set(workspaces.flatMap((workspace) => workspace.sessionIds))
    }
  } catch {
    // A registry failure leaves the session listing as the fallback.
  }
  let items = null
  try {
    const page = await sessions?.list?.({}, AbortSignal.timeout(10_000))
    if (Array.isArray(page?.items)) items = new Map(page.items.map((item) => [item.sessionId, item]))
  } catch {
    // A failed lookup is different from an empty successful listing.
  }
  return { items, registered }
}

function dispatchStatus(record, statuses) {
  const id = record?.sessionId
  if (!id) return { running: false, sessionMissing: false }
  const { items, registered } = statuses
  const item = items?.get(id)
  const isRegistered = registered?.has(id)
  const sessionMissing = Boolean(items && (isRegistered === false ? !(record.draftPending && item) : !item && !isRegistered))
  return {
    running: Boolean(item?.running),
    sessionMissing,
    statusUnavailable: !sessionMissing && !item,
    draftWaiting: Boolean(record.draft && !record.draftPending && item?.blank === true && !item.running && !sessionMissing),
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
  return new TapdError('tapd/missing-credentials', '尚未配置 TAPD 个人访问令牌')
}

function hasCredentials(provider, credentials) {
  if (provider === 'zentao') return Boolean(credentials.zentao.account && credentials.zentao.password)
  return Boolean(credentials.tapd.token || (credentials.tapd.apiUser && credentials.tapd.apiPassword))
}

function summarizeDispatch(record, statuses) {
  const { sessionId, branch, workspaceId, baseBranch, worktreePath, repoPath, createdAt, draft, attachments, images } = record
  return {
    sessionId,
    branch,
    workspaceId,
    baseBranch,
    worktreePath,
    repoPath,
    createdAt,
    draft: draft ?? null,
    attachments: attachments ?? [],
    images: images ?? [],
    draftPending: Boolean(record.draftPending),
    ...dispatchStatus(record, statuses),
  }
}

async function collectTasks(ctx, body) {
  const { settings, credentials } = await readCredentials(ctx)
  const provider = body.provider === 'all' || PROVIDERS.includes(body.provider) ? body.provider : providerOf(settings)
  const sources = provider === 'all' ? PROVIDERS : [provider]
  const excludeCompleted = body.includeCompleted === true ? false : settings.excludeCompleted
  const results = await Promise.allSettled(sources.map(async (source) => {
    if (!hasCredentials(source, credentials)) throw missingCredentials(source)
    return listTasks({
      provider: source,
      settings,
      credentials,
      excludeCompleted,
      includeStatusOptions: body.includeStatusOptions === true,
    })
  }))
  if (provider !== 'all' && results[0].status === 'rejected') throw results[0].reason

  const [dispatches, statuses] = await Promise.all([loadState(), sessionStatuses(ctx)])
  const stories = []
  const iterations = []
  const projects = []
  const sourceErrors = []
  const statusOptions = {}
  let rawCount = 0
  let ownerFilteredEmpty = false
  for (const [index, outcome] of results.entries()) {
    const source = sources[index]
    if (outcome.status === 'rejected') {
      sourceErrors.push({ provider: source, message: outcome.reason?.message ?? String(outcome.reason) })
      continue
    }
    const result = outcome.value
    rawCount += result.rawCount
    ownerFilteredEmpty ||= Boolean(result.ownerFilteredEmpty)
    iterations.push(...(result.iterations ?? []))
    projects.push(...(result.projects ?? []))
    if (result.statusOptions) statusOptions[source] = result.statusOptions
    for (const story of result.stories) {
      const legacy = source === 'tapd' ? dispatches[String(story.id)] : undefined
      const record = dispatches[story.uid] ?? legacy
      stories.push({
        ...story,
        dispatch: record ? {
          ...summarizeDispatch(record, statuses),
          previousSessions: (record.previousSessions ?? []).map((previous) => summarizeDispatch(previous, statuses)),
        } : null,
      })
    }
  }
  stories.sort((left, right) => String(right.modified).localeCompare(String(left.modified)))
  return {
    provider, stories, total: stories.length, rawCount, projects, projectNames: settings.tapd.projectNames,
    iterations, ownerFilteredEmpty, sourceErrors, syncedAt: new Date().toISOString(),
    ...(body.includeStatusOptions === true && { statusOptions }),
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
      zentao: {
        password: Boolean(credentials.zentao.password),
        basicPassword: Boolean(settings.zentao.basicAccount &&
          (credentials.zentao.basicAuth?.password ?? await readSecret(ctx, REF_ZENTAO_BASIC_PASSWORD))),
      },
    },
    workspaces: workspaceSummaries(ctx),
    dataDir: DATA_DIR,
    version: pkg.version,
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
  for (const key of ['tapd', 'zentao']) {
    if (body[key] && typeof body[key] === 'object' && !Array.isArray(body[key])) {
      patch[key] = body[key]
    }
  }
  const basicPassword = typeof body.zentaoBasicPassword === 'string' ? body.zentaoBasicPassword : ''
  if (patch.zentao) {
    const saved = (await loadSettings()).zentao
    const next = { ...saved, ...patch.zentao }
    if (zentaoLoginChanged(saved, next) && !isString(body.zentaoPassword) && await readSecret(ctx, REF_ZENTAO_PASSWORD)) {
      throw zentaoPasswordRequired()
    }
    next.basicAccount = typeof next.basicAccount === 'string' ? next.basicAccount.trim() : ''
    if (next.basicAuth === true) {
      basicAuthHeader(await zentaoBasicCredentials(ctx, saved, next, basicPassword))
      if (basicPassword) await writeCredential(ctx, REF_ZENTAO_BASIC_PASSWORD, basicPassword, '禅道网关密码')
    } else if (!sameZentaoGateway(saved, next)) {
      patch.zentao.basicAccount = ''
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
  if (zentaoLoginChanged(settings.zentao, { baseUrl, account }) && !isString(body.password)) {
    throw zentaoPasswordRequired()
  }
  const password = isString(body.password) ? body.password : credentials.zentao.password
  if (!account || !password) {
    throw new TapdError('zentao/missing-credentials', '请先填写禅道账号与密码')
  }
  const basicEnabled = typeof body.basicAuth === 'boolean' ? body.basicAuth : settings.zentao.basicAuth
  let basicAuth
  if (basicEnabled) {
    const basicAccount = typeof body.basicAccount === 'string' ? body.basicAccount.trim() : settings.zentao.basicAccount
    const basicPassword = typeof body.basicPassword === 'string' ? body.basicPassword : ''
    basicAuth = await zentaoBasicCredentials(ctx, settings.zentao, { baseUrl, basicAccount }, basicPassword)
  }
  return listContainers({ baseUrl, credentials: { account, password, basicAuth } })
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

  const assets = await fetchTaskAssets({ provider, settings, credentials, projectId: story.projectId, story })
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

async function refreshZentaoDraft(record, options) {
  if (!record.draft) throw new DispatchError('dispatch/missing-draft', '这条派发记录没有草稿')
  if (record.draft.detailsLoaded) return record
  const { files, images } = await fetchTaskAssets(options)
  const assets = await saveDraftAssets({ sessionId: record.sessionId, files, images })
  const previousText = String(record.draft.text ?? '')
  const updated = {
    ...record,
    draft: {
      text: refreshTaskPrompt(previousText, options.story, {
        attachments: assets.filter((asset) => asset.kind === 'file'),
        images: assets.filter((asset) => asset.kind === 'image'),
      }),
      previousText,
      detailsLoaded: true,
      assets,
      files: assets.filter((asset) => asset.kind === 'file').map((asset) => asset.name),
      images: assets.filter((asset) => asset.kind === 'image').map((asset) => asset.name),
    },
  }
  await putDispatch(options.key, updated)
  return updated
}

async function prepareContinuation(record, options, extraInstructions) {
  const { files, images } = await fetchTaskAssets(options)
  const draftId = randomUUID()
  const assets = files.length || images.length
    ? await saveDraftAssets({ sessionId: record.sessionId, files, images, draftId })
    : []
  const text = buildTaskPrompt(options.story, { ...record, repoRoot: record.repoPath, attachments: files, images })
  const extra = typeof extraInstructions === 'string' ? extraInstructions.trim() : ''
  return {
    sessionId: record.sessionId,
    continuation: true,
    draft: { draftId, text: extra ? `${text}\n\n## 补充要求\n\n${extra}` : text, assets },
  }
}

async function handleDispatch(ctx, body) {
  const { settings, credentials } = await readCredentials(ctx)
  const provider = PROVIDERS.includes(body.provider) ? body.provider : providerOf(settings)
  const storyId = String(body.storyId ?? body.story?.id ?? '').trim()
  const projectId = String(body.projectId ?? body.story?.projectId ?? '').trim()
  if (!storyId) throw new TapdError('source/bad-request', '缺少需求 ID')
  if (body.story?.id != null && String(body.story.id).trim() !== storyId) {
    throw new TapdError('source/bad-request', '任务详情与任务 ID 不匹配，请刷新后重试。')
  }
  const branchName = String(body.branchName ?? '').trim()
  if (PROVIDERS.includes(body.story?.source) && body.story.source !== provider) {
    throw new DispatchError('dispatch/source-changed', '当前任务来源已切换，请刷新后重新选择任务。')
  }

  const key = uidOf(provider, storyId)
  // Two clicks on 派发 must not create two sessions/branches.
  if (inflightDispatches.has(key)) {
    throw new DispatchError('dispatch/in-progress', '这个需求正在派发，请稍候再试。')
  }
  inflightDispatches.add(key)
  try {
    const current = await findDispatch(provider, storyId)
    const previousSessions = current?.previousSessions ?? []
    const continuing = body.conversation === 'existing'
    const requestedId = isString(body.requestId) ? body.requestId : undefined
    const candidates = [current, ...previousSessions]
    const priorRequest = body.conversation === 'new' && requestedId
      ? candidates.find((record) => record?.requestId === requestedId)
      : null
    const forceNew = body.conversation === 'new' && !priorRequest
    const reuseCheckout = forceNew && isString(current?.branch) ? current : null
    const existing = continuing && isString(body.sessionId)
      ? candidates.find((record) => record?.sessionId === body.sessionId)
      : priorRequest ?? current
    const existingStatus = existing?.sessionId ? dispatchStatus(existing, await sessionStatuses(ctx)) : null
    const reusable = !forceNew && existingStatus && !existingStatus.sessionMissing
    const resumeDraft = reusable && existing.draftPending ? existing : null

    // A temporary lookup error must not cause an implicit second dispatch.
    if (reusable && !resumeDraft && !continuing && !body.refreshDraft && (provider === 'tapd' || body.deliver !== 'send')) {
      return { ...existing, ...existingStatus, alreadyDispatched: true }
    }
    if ((continuing || priorRequest || body.refreshDraft === true || body.conversation === 'retry') && !reusable) {
      throw new DispatchError('dispatch/missing-draft', '原会话已不存在，请新开对话。')
    }
    if (!reusable && !reuseCheckout && !branchName) throw new TapdError('dispatch/missing-branch', '请填写完整的分支名称')

    let story = null
    if (body.story && typeof body.story === 'object') {
      try {
        story = await fetchTask({ provider, settings, credentials, story: body.story })
      } catch (error) {
        // A refresh failure must not block dispatching the list snapshot the
        // user is looking at (except when authentication itself is broken).
        if (provider === 'zentao' || String(error?.code ?? '').endsWith('auth-failed')) throw error
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

    if (continuing && !resumeDraft) {
      if (existingStatus.statusUnavailable) throw new DispatchError('dispatch/status-unavailable', '暂时无法确认原会话状态，请稍后重试。')
      return prepareContinuation(existing, { provider, settings, credentials, story, projectId }, body.extraInstructions)
    }

    if (reusable && !resumeDraft) {
      if (provider === 'zentao' && body.refreshDraft === true) {
        return refreshZentaoDraft(existing, { provider, settings, credentials, story, key })
      }
      if (existingStatus.statusUnavailable) {
        throw new DispatchError('dispatch/status-unavailable', '暂时无法确认原会话状态，请稍后重试。')
      }
      return backfillDispatchAssets(ctx, existing, { provider, settings, credentials, story, key })
    }

    const registry = requireService(ctx, 'workspaceRegistry', 'workspaceRegistry')
    const sessions = requireService(ctx, 'sessionController', 'sessionController')
    const uploads = service(ctx, 'fileUploads')

    const history = current && (!reusable || forceNew)
      ? [{ ...current, previousSessions: undefined }, ...previousSessions]
      : previousSessions
    const saveRecord = (record) => putDispatch(key, {
      ...record,
      provider,
      storySource: provider,
      requestId: record.requestId ?? requestedId,
      ...(history.length ? { previousSessions: history } : {}),
    })
    const record = await dispatchStory({
      story,
      settings,
      services: { workspaceRegistry: registry, sessionController: sessions, fileUploads: uploads },
      assertIdle: (target) => assertWorkspaceIdle(ctx, target),
      resumeDraft,
      reuseCheckout,
      saveDraftCheckpoint: saveRecord,
      loadAttachments: () => fetchTaskAssets({ provider, settings, credentials, projectId, story }),
      options: {
        branchName,
        workspaceId: isString(body.workspaceId) ? body.workspaceId : undefined,
        workspacePath: isString(body.workspacePath) ? body.workspacePath : undefined,
        useWorktree: typeof body.useWorktree === 'boolean' ? body.useWorktree : undefined,
        baseBranch: isString(body.baseBranch) ? body.baseBranch : undefined,
        prompt: isString(body.prompt) ? body.prompt : undefined,
        extraInstructions: isString(body.extraInstructions) ? body.extraInstructions : undefined,
        // The panel never sends on the operator's behalf: the requirement text
        // and its files are placed in the composer for review.
        deliver: body.deliver === 'send' && !body.conversation ? 'send' : 'draft',
        smartCheckout: body.smartCheckout !== false,
        backupRoot: path.join(DATA_DIR, 'backups'),
      },
    })
    if (provider === 'zentao' && record.draft) record.draft.detailsLoaded = true
    if (resumeDraft && existing !== current) {
      await putDispatch(key, {
        ...current,
        previousSessions: previousSessions.map((previous) => previous.sessionId === record.sessionId ? record : previous),
      })
      return { ...record, continuation: true }
    }
    await saveRecord(record)
    return { ...record, previousSessions: history, draftWaiting: Boolean(record.draft) }
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
    route('tasks', 'tasks', (body) => collectTasks(ctx, body))
    route('dispatch', 'dispatch', (body) => handleDispatch(ctx, body))
    // Draft attachments: the composer only accepts real browser Files, so the
    // Client streams these bytes back over the same connection. The body is
    // binary, which the JSON envelope of `route` cannot carry.
    scoped.effect(
      () =>
        connection.fetch.register({
          path: '/api/task-hub/asset',
          methods: ['POST'],
          requestBody: 'buffered',
          fetch: async (request) => {
            try {
              const body = parseBody(await request.json().catch(() => null))
              const asset = await readDraftAsset({ sessionId: body.session, index: body.i, draftId: body.draftId })
              return new Response(asset.data, {
                status: 200,
                headers: {
                  'content-type': asset.mediaType || 'application/octet-stream',
                  'content-length': String(asset.data.byteLength),
                  'cache-control': 'no-store',
                },
              })
            } catch (error) {
              return fail(error)
            }
          },
        }),
      'dsh-task-hub: asset',
    )
    route('status', 'status', async () => {
      const statuses = await sessionStatuses(ctx)
      const state = await loadState()
      const entries = Object.entries(state).map(([key, record]) => ({
        uid: key,
        storyId: record?.storyId ?? key,
        ...record,
        ...dispatchStatus(record, statuses),
        previousSessions: (record?.previousSessions ?? []).map((previous) => summarizeDispatch(previous, statuses)),
      }))
      return { entries, workspaces: workspaceSummaries(ctx) }
    })
  })
}
