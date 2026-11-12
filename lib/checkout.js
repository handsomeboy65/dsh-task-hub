/**
 * In-place branch switching that keeps local work.
 *
 * Plain `git checkout` already refuses to clobber tracked changes or untracked
 * files, but it silently overwrites *ignored* files, and the old dispatch path
 * refused to run whenever `git status` was non-empty. This module adds the
 * IDEA-style "Smart Checkout" behaviour:
 *
 * - untracked-only worktrees are allowed (no commit/add required);
 * - ignored files stay where they are unless the target branch tracks the same
 *   path, in which case the operation stops before touching anything;
 * - tracked/untracked changes are backed up, then carried over by git or moved
 *   with `git stash -u` when they would block the checkout;
 * - nothing is ever deleted with `clean`, `reset --hard` or forced checkout;
 * - a failed restore reports the conflicting paths plus the backup directory
 *   instead of pretending the workspace is usable.
 */
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { DATA_DIR } from './store.js'

export const DEFAULT_BACKUP_ROOT = path.join(DATA_DIR, 'backups')
const MAX_BACKUP_FILES = 2000

export class CheckoutError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'CheckoutError'
    this.code = code
    this.details = details
  }
}

async function findStash(repoRoot, message, exec) {
  const list = await exec(['stash', 'list', '--format=%gd%x00%H%x00%gs'], repoRoot)
  if (!list.ok) return null
  for (const entry of list.stdout.split('\n')) {
    const [ref, commit, subject] = entry.split('\0')
    if (subject?.endsWith(`: ${message}`)) return { ref, commit }
  }
  return null
}

async function restoreStash(repoRoot, stash, message, exec) {
  const applied = await exec(['stash', 'apply', stash.commit], repoRoot)
  if (applied.ok) {
    const current = await findStash(repoRoot, message, exec)
    if (current?.commit === stash.commit) await exec(['stash', 'drop', current.ref], repoRoot)
  }
  return applied
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/**
 * Parse `git status --porcelain=v1 -z` into the three groups the smart flow
 * needs. Ignored entries come from `--ignored=matching`; they are exactly the
 * files git would overwrite without warning.
 */
export async function readWorktreeState(repoRoot, exec) {
  const result = await exec(
    ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored=matching'],
    repoRoot,
  )
  if (!result.ok) {
    throw new CheckoutError('dispatch/git-failed', `无法检查仓库状态：${result.stderr || 'git status 失败'}`)
  }
  const tracked = []
  const untracked = []
  const ignored = []
  const records = String(result.stdout ?? '').split('\0')
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (!record || record.length < 3) continue
    const code = record.slice(0, 2)
    const file = record.slice(3)
    if (!file) continue
    if (code === '??') {
      untracked.push(file)
      continue
    }
    if (code === '!!') {
      ignored.push(file)
      continue
    }
    tracked.push(file)
    // In -z mode a rename/copy record is followed by the original path.
    if (code.startsWith('R') || code.startsWith('C') || code[1] === 'R' || code[1] === 'C') index += 1
  }
  return { tracked, untracked, ignored }
}

/** Files tracked by `ref`; null when the ref does not exist (new branch). */
export async function treeFiles(repoRoot, ref, exec) {
  const result = await exec(['ls-tree', '-r', '--name-only', '-z', ref], repoRoot)
  if (!result.ok) return null
  const files = new Set()
  for (const entry of String(result.stdout ?? '').split('\0')) {
    if (entry) files.add(entry)
  }
  return files
}

/** Copy the affected files into a durable backup directory with a manifest. */
export async function backupFiles(repoRoot, files, options = {}) {
  const root = options.backupRoot || DEFAULT_BACKUP_ROOT
  const label = String(options.label || 'checkout').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60)
  const dir = path.join(root, `${stamp()}-${label}`)
  await fs.mkdir(path.join(dir, 'files'), { recursive: true })
  const saved = []
  for (const relative of [...new Set(files)].slice(0, MAX_BACKUP_FILES)) {
    const source = path.join(repoRoot, relative)
    let stat = null
    try {
      stat = await fs.lstat(source)
    } catch {
      continue
    }
    if (!stat.isFile()) continue
    const target = path.join(dir, 'files', relative)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.copyFile(source, target)
    saved.push(relative)
  }
  const manifest = { repoRoot, files: saved, createdAt: new Date().toISOString(), label }
  await fs.writeFile(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
  return { dir, files: saved }
}

async function unmergedFiles(repoRoot, exec) {
  const result = await exec(['diff', '--name-only', '--diff-filter=U', '-z'], repoRoot)
  if (!result.ok) return []
  return String(result.stdout ?? '').split('\0').filter(Boolean)
}

async function conflictFiles(repoRoot, exec) {
  const result = await exec(['diff', '--name-only', '--diff-filter=U', '-z'], repoRoot)
  if (!result.ok) return []
  const files = String(result.stdout ?? '').split('\0').filter(Boolean)
  const untracked = await exec(['ls-files', '--others', '--exclude-standard', '-z'], repoRoot)
  if (untracked.ok) {
    for (const file of String(untracked.stdout ?? '').split('\0')) {
      if (file) files.push(file)
    }
  }
  return [...new Set(files)]
}

/**
 * Switch `repoRoot` to `branch` (creating it at `startPoint` when `create`).
 * Returns a snapshot used for rollback and for the dispatch record.
 */
export async function switchBranch(options) {
  const {
    repoRoot,
    branch,
    create = false,
    startPoint = '',
    exec,
    backupRoot,
    smart = true,
  } = options ?? {}
  if (!repoRoot) throw new CheckoutError('dispatch/missing-repo', '没有可用的工作区目录')
  if (!branch) throw new CheckoutError('dispatch/bad-branch', '缺少分支名')

  const head = await exec(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot)
  if (!head.ok) {
    throw new CheckoutError('dispatch/git-failed', `无法读取当前分支：${head.stderr || 'git rev-parse 失败'}`)
  }
  const originalBranch = head.stdout || 'HEAD'

  const target = create ? startPoint || 'HEAD' : branch
  const revision = await exec(['rev-parse', '--verify', '--end-of-options', `${target}^{commit}`], repoRoot)
  if (!revision.ok) {
    throw new CheckoutError('dispatch/bad-base', `找不到基础分支或提交：${target}`)
  }

  const state = await readWorktreeState(repoRoot, exec)
  const changed = [...new Set([...state.tracked, ...state.untracked])]

  const targetTree = await treeFiles(repoRoot, revision.stdout, exec)
  const ignoredConflicts = targetTree
    ? state.ignored.filter((file) => targetTree.has(file))
    : []
  if (ignoredConflicts.length > 0) {
    throw new CheckoutError(
      'dispatch/ignored-conflict',
      `以下被忽略的本地文件会与分支 ${branch} 中已跟踪的文件冲突，已停止切换：${ignoredConflicts.join('、')}。` +
        '请先移动或删除它们，或改用独立 worktree。',
      { files: ignoredConflicts, branch, originalBranch },
    )
  }

  if (!smart && changed.length > 0) {
    throw new CheckoutError(
      'dispatch/dirty-worktree',
      `仓库有未提交的改动（${changed.length} 个文件）；请先处理，或勾选「智能保留本地改动」，或改用独立 worktree。`,
      { files: changed.slice(0, 50), branch },
    )
  }

  let backup = null
  if (changed.length > 0) {
    backup = await backupFiles(repoRoot, changed, {
      backupRoot,
      label: `${branch}-from-${originalBranch}`,
    })
  }

  const checkoutArgs = create
    ? ['checkout', '-b', branch, ...(startPoint ? [startPoint] : [])]
    : ['checkout', branch]

  let checkout = await exec(checkoutArgs, repoRoot)
  if (!checkout.ok && (!smart || changed.length === 0)) {
    throw new CheckoutError('dispatch/checkout-failed', `切换分支失败：${checkout.stderr || 'git checkout 失败'}`)
  }
  let stashed = false
  let stashRef = ''
  if (!checkout.ok) {
    // Untracked/tracked changes that git refuses to carry: move them aside with
    // stash -u (ignored files are deliberately not stashed; they stay put).
    const message = `dsh-task-hub ${randomUUID()} ${branch}`
    const pushed = await exec(['stash', 'push', '-u', '-m', message], repoRoot)
    if (!pushed.ok) {
      throw new CheckoutError(
        'dispatch/stash-failed',
        `无法暂存本地改动，已停止派发：${pushed.stderr || 'git stash 失败'}`,
        { files: changed.slice(0, 50), backupDir: backup?.dir ?? '' },
      )
    }
    const stash = await findStash(repoRoot, message, exec)
    if (!stash) {
      throw new CheckoutError('dispatch/stash-failed', '无法确认本次操作创建的 stash，已停止派发。', {
        backupDir: backup?.dir ?? '',
      })
    }
    stashed = true
    stashRef = stash.ref
    checkout = await exec(checkoutArgs, repoRoot)
    if (!checkout.ok) {
      const restored = await restoreStash(repoRoot, stash, message, exec)
      const recovery = restored.ok ? '本地改动已恢复。' : '恢复本地改动失败，请检查 stash 和备份。'
      throw new CheckoutError(
        'dispatch/checkout-failed',
        `切换分支失败：${checkout.stderr || 'git checkout 失败'}；${recovery}`,
        { files: changed.slice(0, 50), backupDir: backup?.dir ?? '', stash: restored.ok ? '' : stashRef },
      )
    }
    const popped = await restoreStash(repoRoot, stash, message, exec)
    if (!popped.ok) {
      const files = await conflictFiles(repoRoot, exec)
      throw new CheckoutError(
        'dispatch/restore-conflict',
        `已切到分支 ${branch}，但恢复本地改动时发生冲突：${files.slice(0, 20).join('、') || '见 git status'}。` +
          `本地改动仍保存在 ${backup?.dir ?? 'stash'}，请处理冲突后再试；本次没有启动 Agent。`,
        {
          files,
          backupDir: backup?.dir ?? '',
          branch,
          originalBranch,
          stash: stashRef,
        },
      )
    }
  }

  return {
    switched: true,
    originalBranch,
    branch,
    backupDir: backup?.dir ?? '',
    preserved: changed,
    stashed,
    stashRef,
  }
}

/**
 * Best-effort rollback when checkout succeeded but the session could not be
 * created. Returns `{ok, error}`; never throws.
 */
export async function rollbackBranch(options) {
  const { repoRoot, snapshot, exec } = options ?? {}
  if (!snapshot?.switched) return { ok: true, error: '' }
  const back = await exec(['checkout', snapshot.originalBranch], repoRoot)
  if (back.ok) return { ok: true, error: '' }
  return { ok: false, error: back.stderr || 'git checkout 失败' }
}

/** Conflicting paths without the untracked list, for restore reports. */
export async function pendingConflicts(repoRoot, exec) {
  return unmergedFiles(repoRoot, exec)
}
