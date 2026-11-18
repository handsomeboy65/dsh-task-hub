/**
 * Dispatch pipeline: prepare a git branch (optionally in its own worktree),
 * create a DSH session bound to that checkout, then send the task prompt.
 *
 * `git` and the host services are injected so the pipeline is unit-testable
 * without a real repository or harness runtime.
 */
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

import { buildTaskPrompt, refreshTaskPrompt, sessionTitleFor } from './prompt.js'
import { rollbackBranch, switchBranch } from './checkout.js'
import { saveDraftAssets } from './drafts.js'

const execFileAsync = promisify(execFile)
const GIT_TIMEOUT_MS = 120_000
const MAX_BUFFER = 4 * 1024 * 1024

const MAX_ATTACHMENT_COUNT = 20
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
const MAX_ATTACHMENT_TOTAL = 60 * 1024 * 1024

export class DispatchError extends Error {
  constructor(code, message, details) {
    super(message)
    this.name = 'DispatchError'
    this.code = code
    this.details = details
  }
}

/** Run git; never throws for a non-zero exit, returns `{ok, stdout, stderr, code}`. */
export async function git(args, cwd) {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
    })
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim(), code: 0 }
  } catch (error) {
    const stderr = String(error?.stderr ?? error?.message ?? '').trim()
    const code = typeof error?.code === 'number' ? error.code : null
    if (error?.killed || error?.signal) {
      return { ok: false, stdout: String(error?.stdout ?? '').trim(), stderr: stderr || 'git 命令超时', code: 124 }
    }
    return { ok: false, stdout: String(error?.stdout ?? '').trim(), stderr: stderr || 'git 命令失败', code }
  }
}

export function worktreePathFor(repoRoot, branch) {
  const base = path.basename(repoRoot).replace(/[^A-Za-z0-9._-]/g, '-')
  const folder = `${base}-${branch}`.replace(/[\\/:*?"<>|\s]+/g, '-')
  return path.join(path.dirname(repoRoot), '.dsh-worktrees', folder)
}

async function branchExists(repoRoot, branch, exec) {
  const result = await exec(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], repoRoot)
  return result.ok
}

/** The worktree path currently holding `branch`, or '' when none does. */
async function worktreeUsingBranch(repoRoot, branch, exec) {
  const listed = await exec(['worktree', 'list', '--porcelain'], repoRoot)
  if (!listed.ok) return ''
  let current = ''
  for (const line of listed.stdout.split('\n')) {
    if (line.startsWith('worktree ')) current = line.slice('worktree '.length).trim()
    else if (line.trim() === `branch refs/heads/${branch}`) return current
  }
  return ''
}

/** Pick a base branch: origin/HEAD, then the current branch, then common names. */
export async function detectBaseBranch(repoRoot, exec = git) {
  const symbolic = await exec(['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], repoRoot)
  if (symbolic.ok && symbolic.stdout) {
    const name = symbolic.stdout.replace(/^origin\//, '')
    return { startPoint: symbolic.stdout, label: name }
  }
  const current = await exec(['branch', '--show-current'], repoRoot)
  if (current.ok && current.stdout) {
    return { startPoint: current.stdout, label: current.stdout }
  }
  for (const candidate of ['origin/main', 'origin/master', 'main', 'master']) {
    const remote = candidate.startsWith('origin/')
    const ref = remote ? `refs/remotes/${candidate}` : `refs/heads/${candidate}`
    const result = await exec(['show-ref', '--verify', '--quiet', ref], repoRoot)
    if (result.ok) return { startPoint: candidate, label: candidate.replace(/^origin\//, '') }
  }
  return null
}


/**
 * Resolve `{cwd, worktreePath, branch, baseBranch}` for the dispatch.
 * `resolvedBase.startPoint` is what git checks out from.
 */
export async function prepareCheckout(options, exec = git) {
  const repoPath = String(options.repoPath ?? '').trim()
  if (!repoPath) throw new DispatchError('dispatch/missing-repo', '没有可用的工作区目录')
  const branch = String(options.branchName ?? '').trim()
  if (!branch) {
    throw new DispatchError('dispatch/missing-branch', '请填写完整的分支名称')
  }
  if (!/^[A-Za-z0-9._\/-]+$/.test(branch) || branch.includes('..') || branch.includes('@{') || branch.includes('//') || branch.startsWith('/') || branch.endsWith('/') || branch.endsWith('.') || branch.endsWith('.lock')) {
    throw new DispatchError('dispatch/bad-branch', `分支名不合法：${branch}`)
  }

  const top = await exec(['rev-parse', '--show-toplevel'], repoPath)
  if (!top.ok || !top.stdout) {
    throw new DispatchError('dispatch/not-a-repo', `${repoPath} 不是 git 仓库`)
  }
  const repoRoot = top.stdout
  const refCheck = await exec(['check-ref-format', '--branch', branch], repoRoot)
  if (!refCheck.ok) {
    throw new DispatchError('dispatch/bad-branch', `git 不接受这个分支名：${branch}`)
  }

  const resolvedBase = options.baseBranch
    ? { startPoint: options.baseBranch, label: options.baseBranch }
    : await detectBaseBranch(repoRoot, exec)

  const exists = await branchExists(repoRoot, branch, exec)
  if (!exists && resolvedBase?.startPoint) {
    const base = await exec(['rev-parse', '--verify', '--end-of-options', `${resolvedBase.startPoint}^{commit}`], repoRoot)
    if (!base.ok) throw new DispatchError('dispatch/bad-base', `找不到基础分支或提交：${resolvedBase.label}`)
  }

  if (options.useWorktree) {
    const worktreePath = worktreePathFor(repoRoot, branch)
    const probe = await exec(['rev-parse', '--abbrev-ref', 'HEAD'], worktreePath)
    if (probe.ok) {
      if (probe.stdout !== branch) {
        throw new DispatchError(
          'dispatch/worktree-conflict',
          `目录 ${worktreePath} 已存在且停在分支 ${probe.stdout}，请先清理或换一个分支名。`,
        )
      }
      return {
        cwd: worktreePath,
        worktreePath,
        repoRoot,
        branch,
        baseBranch: resolvedBase?.label ?? '',
        snapshot: { switched: false, originalBranch: '', backupDir: '' },
      }
    }

    const args = ['worktree', 'add']
    if (!exists) args.push('-b', branch)
    args.push(worktreePath)
    args.push(exists ? branch : resolvedBase?.startPoint ?? 'HEAD')
    const added = await exec(args, repoRoot)
    if (!added.ok) {
      const detail = added.stderr.split('\n').find((line) => line.trim()) ?? added.stderr
      throw new DispatchError('dispatch/worktree-failed', `创建 worktree 失败：${detail}`)
    }
    return {
      cwd: worktreePath,
      worktreePath,
      repoRoot,
      branch,
      baseBranch: resolvedBase?.label ?? '',
      snapshot: { switched: false, originalBranch: '', backupDir: '' },
    }
  }

  // In-place dispatch: Smart Checkout keeps the user's local (including
  // untracked and ignored) files across the branch switch. The workspace never
  // changes directories here, which is what the worktree checkbox opts out of.
  // A branch can only be checked out once: report the other worktree instead of
  // failing halfway through the restore flow.
  if (exists) {
    const inUse = await worktreeUsingBranch(repoRoot, branch, exec)
    if (inUse && path.resolve(inUse) !== path.resolve(repoRoot)) {
      throw new DispatchError(
        'dispatch/branch-in-use',
        `分支 ${branch} 已在另一个 worktree 中检出：${inUse}。请勾选「使用独立 worktree」继续，或先删除那个 worktree。`,
        { branch, path: inUse },
      )
    }
  }
  const snapshot = await switchBranch({
    repoRoot,
    branch,
    create: !exists,
    startPoint: resolvedBase?.startPoint ?? '',
    exec,
    backupRoot: options.backupRoot,
    smart: options.smartCheckout !== false,
  })
  return {
    cwd: repoRoot,
    worktreePath: '',
    repoRoot,
    branch,
    baseBranch: resolvedBase?.label ?? '',
    snapshot,
  }
}

function repoPathFor(registry, options, settings) {
  if (options.workspacePath) return String(options.workspacePath)
  if (options.workspaceId) {
    const workspace = registry.get(options.workspaceId)
    if (!workspace) throw new DispatchError('dispatch/workspace-not-found', '目标工作区不存在')
    return workspace.path
  }
  if (settings?.defaultWorkspacePath) return String(settings.defaultWorkspacePath)
  throw new DispatchError('dispatch/missing-repo', '还没有选择目标工作区')
}

/**
 * A Session is always bound to the checkout it will work in: the worktree
 * workspace when one was created, otherwise the repository's own workspace.
 */
async function resolveWorkspace(registry, checkout) {
  const existing = await registry.resolveByPath(checkout.cwd)
  if (existing) return existing
  const title = checkout.worktreePath
    ? `${path.basename(checkout.repoRoot)} · ${checkout.branch}`
    : path.basename(checkout.cwd)
  return registry.create(checkout.cwd, title)
}

/** Find the existing branch without switching a user's current checkout. */
async function existingCheckout(registry, record, exec) {
  const { branch } = record
  const recordedPath = record.worktreePath || record.repoPath
  const registered = record.workspaceId ? registry.get(record.workspaceId) : null
  const workspace = registered ??
    (recordedPath ? await registry.resolveByPath(recordedPath) : null)
  const originalPath = workspace?.path || recordedPath
  if (!originalPath) {
    throw new DispatchError('dispatch/workspace-not-found', '找不到需求的原工作区。请恢复工作区后重试。')
  }
  const baseBranch = record.baseBranch ?? ''
  const head = await exec(['branch', '--show-current'], originalPath)
  if (head.ok && head.stdout === branch) {
    return {
      workspace,
      cwd: originalPath,
      repoRoot: record.worktreePath ? record.repoPath || originalPath : originalPath,
      worktreePath: record.worktreePath ? originalPath : '',
      branch,
      baseBranch,
    }
  }

  const repo = record.repoPath || originalPath
  const top = await exec(['rev-parse', '--show-toplevel'], repo)
  if (!top.ok || !top.stdout) {
    throw new DispatchError('dispatch/checkout-unavailable', '原 Git 仓库不可用。请恢复仓库后重试。')
  }
  const repoRoot = top.stdout
  if (!await branchExists(repoRoot, branch, exec)) {
    throw new DispatchError('dispatch/branch-not-found', `找不到本地需求分支「${branch}」。请恢复该分支后重试。`)
  }
  let cwd = await worktreeUsingBranch(repoRoot, branch, exec)
  if (!cwd) {
    const target = worktreePathFor(repoRoot, branch)
    const added = await exec(['worktree', 'add', '--no-guess-remote', '--', target, branch], repoRoot)
    // Another request may have checked out this branch in the meantime.
    cwd = added.ok ? target : await worktreeUsingBranch(repoRoot, branch, exec)
    if (!cwd) {
      throw new DispatchError('dispatch/worktree-failed', `无法为「${branch}」准备独立工作区。`, {
        gitError: added.stderr,
      })
    }
  }
  const selected = await exec(['branch', '--show-current'], cwd)
  if (!selected.ok || selected.stdout !== branch) {
    throw new DispatchError('dispatch/checkout-unavailable', `需求分支「${branch}」的工作区不可用。请检查对应的 worktree。`)
  }
  return { cwd, repoRoot, worktreePath: cwd === repoRoot ? '' : cwd, branch, baseBranch }
}

async function attachSession(workspace, sessionId) {
  if (Array.isArray(workspace.sessionIds) && workspace.sessionIds.includes(sessionId)) return
  try {
    await workspace.attachSession(sessionId)
  } catch (error) {
    if (error?.code !== 'session/already-exists') throw error
  }
}

/**
 * Full dispatch. `services` is `{workspaceRegistry, sessionController}`; they
 * are read from the plugin context by the caller.
 */
function sanitizeAttachmentName(name) {
  const raw = String(name ?? '').trim() || 'attachment'
  return raw.replace(/[\\/]/g, '_').slice(0, 180)
}

function assertAttachmentBudget(files) {
  if (files.length > MAX_ATTACHMENT_COUNT) {
    throw new DispatchError(
      'dispatch/attachment-too-many',
      `需求有 ${files.length} 个附件，超过单次派发上限 ${MAX_ATTACHMENT_COUNT} 个；请先精简附件。`,
      { files: files.map((file) => file.name) },
    )
  }
  let total = 0
  for (const file of files) {
    const bytes = file?.data?.byteLength ?? 0
    if (bytes > MAX_ATTACHMENT_BYTES) {
      throw new DispatchError(
        'dispatch/attachment-too-large',
        `附件「${file.name}」超过 ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB，无法随首条消息发送。`,
        { attachment: file.name, bytes },
      )
    }
    total += bytes
  }
  if (total > MAX_ATTACHMENT_TOTAL) {
    throw new DispatchError(
      'dispatch/attachment-too-large',
      `附件合计 ${Math.round(total / 1024 / 1024)}MB，超过单次派发上限 ${Math.round(MAX_ATTACHMENT_TOTAL / 1024 / 1024)}MB。`,
      { total },
    )
  }
}

/**
 * Send requirement files/images into a session that already exists. This is
 * the backfill path: a task dispatched before the host carried assets would
 * otherwise stay text-only forever because re-dispatching returns the old
 * session. Returns the stored record fragments.
 */
export async function deliverAssets(input) {
  const { sessionId, files = [], images = [], text = '', services } = input ?? {}
  const sessions = services?.sessionController
  const uploads = services?.fileUploads
  if (!sessionId) throw new DispatchError('dispatch/missing-session', '缺少会话 ID')
  if (!sessions) throw new DispatchError('dispatch/missing-service', '宿主缺少 sessionController 服务')

  const pendingFiles = []
  for (const file of files) {
    if (!file?.data?.byteLength) continue
    pendingFiles.push({ name: sanitizeAttachmentName(file.name), data: file.data })
  }
  const pendingImages = []
  for (const image of images) {
    if (!image?.data?.byteLength || !image?.mediaType) continue
    pendingImages.push({
      name: sanitizeAttachmentName(image.name),
      mediaType: image.mediaType,
      data: image.data,
      bytes: image.data.byteLength,
    })
  }
  assertAttachmentBudget(pendingFiles)
  if (pendingFiles.length > 0 && !uploads?.uploadStream) {
    throw new DispatchError('dispatch/missing-service', '宿主缺少 fileUploads 服务，无法传递需求附件')
  }

  const receipts = []
  for (const file of pendingFiles) {
    try {
      const value = await uploads.uploadStream({
        sessionId,
        name: file.name,
        data: (async function* stream() {
          yield file.data
        })(),
      })
      if (!value?.receiptId) throw new Error('没有返回 receiptId')
      receipts.push({
        name: file.name,
        receiptId: value.receiptId,
        bytes: value.file?.bytes ?? file.data.byteLength,
      })
    } catch (error) {
      throw new DispatchError(
        'dispatch/attachment-failed',
        `附件「${file.name}」补充失败：${error?.message ?? error}`,
        { sessionId, attachment: file.name },
      )
    }
  }

  const content = [{ type: 'text', text: String(text ?? '').trim() || '补充需求附件，请结合它们继续。' }]
  for (const receipt of receipts) content.push({ type: 'file', receiptId: receipt.receiptId })
  for (const image of pendingImages) {
    content.push({
      type: 'image',
      mediaType: image.mediaType,
      name: image.name,
      data: Buffer.from(image.data).toString('base64'),
    })
  }
  try {
    await sessions.prompt(
      { requestId: randomUUID(), sessionId, mode: 'queue', content },
      AbortSignal.timeout(120_000),
    )
  } catch (error) {
    throw new DispatchError(
      'dispatch/prompt-failed',
      `附件已上传，但发送到会话失败：${error?.message ?? error}`,
      { sessionId },
    )
  }
  return {
    attachments: receipts.map((receipt) => ({ name: receipt.name, bytes: receipt.bytes })),
    images: pendingImages.map((image) => ({ name: image.name, bytes: image.bytes })),
  }
}

async function finishDraft(record, workspace, files, images, root) {
  try {
    await attachSession(workspace, record.sessionId)
    const assets = await saveDraftAssets({ sessionId: record.sessionId, files, images, root })
    return {
      ...record,
      draftPending: false,
      images: images.map((image) => ({ name: image.name, bytes: image.data.byteLength })),
      draft: {
        ...record.draft,
        assets,
        files: files.map((file) => file.name),
        images: images.map((image) => image.name),
      },
    }
  } catch (error) {
    throw new DispatchError(
      'dispatch/draft-incomplete',
      `会话已创建，但草稿未准备好：${error?.message ?? error}。请在任务中心重试草稿。`,
      { sessionId: record.sessionId },
    )
  }
}

/**
 * Full dispatch. `services` is `{workspaceRegistry, sessionController, fileUploads}`
 * and `input.loadAttachments` returns `[{name, data: Uint8Array}]` fetched from
 * TAPD, so no attachment is named-but-missing.
 */
export async function dispatchStory(input, exec = git) {
  const { story, settings, services, resumeDraft, reuseCheckout, saveDraftCheckpoint, options = {} } = input ?? {}
  if (!story?.id) throw new DispatchError('dispatch/missing-story', '缺少需求信息')
  const registry = services?.workspaceRegistry
  const sessions = services?.sessionController
  const uploads = services?.fileUploads
  if (!registry) throw new DispatchError('dispatch/missing-service', '宿主缺少 workspaceRegistry 服务')
  if (!sessions) throw new DispatchError('dispatch/missing-service', '宿主缺少 sessionController 服务')

  const branchName = String(options.branchName ?? '').trim()
  if (!branchName && !resumeDraft && !reuseCheckout) throw new DispatchError('dispatch/missing-branch', '请填写完整的分支名称')
  const useWorktree = options.useWorktree ?? settings?.useWorktree ?? true
  const repoPath = resumeDraft || reuseCheckout ? '' : repoPathFor(registry, options, settings)
  const deliver = options.deliver === 'draft' || resumeDraft ? 'draft' : 'send'

  // Download the story's attachments before touching git or creating a
  // session: a broken attachment must fail loudly, not after a half dispatch.
  const pendingFiles = []
  const pendingImages = []
  if (typeof input.loadAttachments === 'function') {
    const loaded = await input.loadAttachments()
    const files = Array.isArray(loaded) ? loaded : loaded?.files ?? []
    const images = Array.isArray(loaded) ? [] : loaded?.images ?? []
    for (const file of files) {
      if (!file?.data?.byteLength) continue
      pendingFiles.push({ name: sanitizeAttachmentName(file.name), data: file.data })
    }
    for (const image of images) {
      if (!image?.data?.byteLength || !image?.mediaType) continue
      pendingImages.push({
        name: sanitizeAttachmentName(image.name),
        mediaType: image.mediaType,
        data: image.data,
        bytes: image.data.byteLength,
      })
    }
    assertAttachmentBudget(pendingFiles)
    if (deliver === 'send' && pendingFiles.length > 0 && !uploads?.uploadStream) {
      throw new DispatchError('dispatch/missing-service', '宿主缺少 fileUploads 服务，无法传递需求附件')
    }
  }

  if (resumeDraft) {
    const workspace = registry.get(resumeDraft.workspaceId)
    if (!workspace) throw new DispatchError('dispatch/workspace-not-found', '原会话的工作区不存在')
    const text = refreshTaskPrompt(resumeDraft.draft.text, story, { attachments: pendingFiles, images: pendingImages })
    return finishDraft({ ...resumeDraft, draft: { ...resumeDraft.draft, text } }, workspace, pendingFiles, pendingImages, options.draftRoot)
  }

  // Never switch a branch out from under an agent that is still running in
  // this workspace; the worktree path is isolated and skips this guard.
  if (!reuseCheckout && !useWorktree && typeof input.assertIdle === 'function') {
    await input.assertIdle(repoPath)
  }

  // The full branch name is typed by the user; nothing is derived from the
  // requirement number. A child story can still share its parent's branch
  // because the name is explicit.
  const displayId = String(story.shortId || story.id)
  const checkout = reuseCheckout
    ? await existingCheckout(registry, reuseCheckout, exec)
    : await prepareCheckout(
        {
          repoPath,
          branchName,
          baseBranch: options.baseBranch ?? settings?.baseBranch ?? '',
          useWorktree,
          backupRoot: options.backupRoot,
          smartCheckout: options.smartCheckout,
        },
        exec,
      )

  const workspace = checkout.workspace ?? await resolveWorkspace(registry, checkout)
  let created
  try {
    created = await sessions.create({
      workspaceId: workspace.id,
      agentPreset: settings?.agentPreset || undefined,
    })
  } catch (error) {
    const rollback = checkout.snapshot?.switched
      ? await rollbackBranch({ repoRoot: checkout.repoRoot, snapshot: checkout.snapshot, exec })
      : { ok: true, error: '' }
    throw new DispatchError('dispatch/no-session', `会话创建失败：${error?.message ?? error}`, {
      rollback,
      backupDir: checkout.snapshot?.backupDir ?? '',
    })
  }
  const sessionId = created?.sessionId
  if (!sessionId) {
    const rollback = checkout.snapshot?.switched
      ? await rollbackBranch({ repoRoot: checkout.repoRoot, snapshot: checkout.snapshot, exec })
      : { ok: true, error: '' }
    throw new DispatchError('dispatch/no-session', '会话创建失败', { rollback })
  }
  const record = {
    storyId: String(story.id),
    shortId: displayId,
    projectId: String(story.projectId ?? ''),
    sessionId,
    workspaceId: workspace.id,
    branch: checkout.branch,
    baseBranch: checkout.baseBranch,
    worktreePath: checkout.worktreePath,
    repoPath: checkout.repoRoot,
    originalBranch: checkout.snapshot?.originalBranch ?? '',
    backupDir: checkout.snapshot?.backupDir ?? '',
    attachments: [],
    images: [],
    createdAt: new Date().toISOString(),
    status: deliver === 'draft' ? 'draft' : 'dispatching',
  }
  const promptText = (attachments) => {
    const brief = buildTaskPrompt(story, { ...checkout, attachments, images: pendingImages })
    const extra = String(options.extraInstructions ?? '').trim()
    return String(options.prompt ?? '').trim() || (extra ? `${brief}\n\n## 补充要求\n\n${extra}` : brief)
  }
  const renameSession = async () => {
    try {
      await sessions.rename({ sessionId, title: sessionTitleFor(story, { branch: checkout.branch }) })
    } catch {
      // A title is cosmetic.
    }
  }

  if (deliver === 'draft') {
    const pending = { ...record, draftPending: true, draft: { text: promptText(pendingFiles) } }
    if (saveDraftCheckpoint) await saveDraftCheckpoint(pending)
    const finished = await finishDraft(pending, workspace, pendingFiles, pendingImages, options.draftRoot)
    await renameSession()
    return finished
  }

  await attachSession(workspace, sessionId)
  const receipts = []
  for (const file of pendingFiles) {
    try {
      const value = await uploads.uploadStream({
        sessionId,
        name: file.name,
        data: (async function* stream() {
          yield file.data
        })(),
      })
      if (!value?.receiptId) throw new Error('没有返回 receiptId')
      receipts.push({ name: file.name, receiptId: value.receiptId, bytes: value.file?.bytes ?? file.data.byteLength })
    } catch (error) {
      throw new DispatchError(
        'dispatch/attachment-failed',
        `会话已创建，但附件「${file.name}」传递失败：${error?.message ?? error}。` +
          '可以打开该会话手动补发附件，或稍后重试派发。',
        { sessionId, attachment: file.name },
      )
    }
  }
  const content = [{ type: 'text', text: promptText(receipts) }]
  for (const receipt of receipts) content.push({ type: 'file', receiptId: receipt.receiptId })
  // Inline screenshots from the description are sent as real image parts, the
  // same shape the composer uploads, so the agent can see them.
  for (const image of pendingImages) {
    content.push({
      type: 'image',
      mediaType: image.mediaType,
      name: image.name,
      data: Buffer.from(image.data).toString('base64'),
    })
  }
  const prompt = {
    requestId: randomUUID(),
    sessionId,
    mode: 'queue',
    content,
  }
  try {
    await sessions.prompt(prompt, AbortSignal.timeout(120_000))
  } catch (error) {
    throw new DispatchError(
      'dispatch/prompt-failed',
      `会话已创建，但发送任务描述失败：${error?.message ?? error}`,
      {
        sessionId,
        attachments: receipts.map((receipt) => receipt.name),
        images: pendingImages.map((image) => image.name),
      },
    )
  }

  await renameSession()
  return {
    ...record,
    attachments: receipts.map((receipt) => ({ name: receipt.name, bytes: receipt.bytes })),
    images: pendingImages.map((image) => ({ name: image.name, bytes: image.bytes })),
  }
}
