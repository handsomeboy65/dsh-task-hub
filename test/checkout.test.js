import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { git } from '../lib/dispatch.js'
import { rollbackBranch, switchBranch } from '../lib/checkout.js'
import { commitAll, gitExec, tempRepo } from './helpers.js'

async function exists(file) {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

test('untracked-only worktrees switch branches without committing', async () => {
  const repo = await tempRepo()
  const backupRoot = path.join(repo, '..', `backups-${Date.now()}`)
  await fs.writeFile(path.join(repo, 'notes.txt'), 'local notes\n')

  const snapshot = await switchBranch({
    repoRoot: repo,
    branch: 'issue_1004297',
    create: true,
    startPoint: 'main',
    exec: git,
    backupRoot,
  })

  assert.equal(snapshot.originalBranch, 'main')
  assert.equal(await gitExec(repo, ['branch', '--show-current']), 'issue_1004297\n')
  assert.equal(await fs.readFile(path.join(repo, 'notes.txt'), 'utf8'), 'local notes\n')
  assert.ok(snapshot.backupDir, 'dirty trees are backed up before switching')
  assert.ok(await exists(path.join(snapshot.backupDir, 'files', 'notes.txt')))
})

test('ignored local files stay in place across a switch', async () => {
  const repo = await tempRepo()
  await fs.writeFile(path.join(repo, 'local.conf'), 'secret=true\n')

  await switchBranch({
    repoRoot: repo,
    branch: 'issue_2',
    create: true,
    startPoint: 'main',
    exec: git,
    backupRoot: path.join(repo, '..', `backups-${Date.now()}`),
  })

  assert.equal(await fs.readFile(path.join(repo, 'local.conf'), 'utf8'), 'secret=true\n')
})

test('modified tracked files are carried over when git allows it', async () => {
  const repo = await tempRepo()
  await fs.writeFile(path.join(repo, 'a.txt'), 'one\nlocal edit\n')

  await switchBranch({
    repoRoot: repo,
    branch: 'issue_3',
    create: true,
    startPoint: 'main',
    exec: git,
    backupRoot: path.join(repo, '..', `backups-${Date.now()}`),
  })

  assert.equal(await fs.readFile(path.join(repo, 'a.txt'), 'utf8'), 'one\nlocal edit\n')
})

test('an ignored file that the target branch tracks stops the switch', async () => {
  const repo = await tempRepo()
  await gitExec(repo, ['checkout', '-q', '-b', 'feature'])
  await fs.writeFile(path.join(repo, 'local.conf'), 'tracked on feature\n')
  await gitExec(repo, ['add', '-f', 'local.conf'])
  await commitAll(repo, 'track local.conf')
  await gitExec(repo, ['checkout', '-q', 'main'])
  await fs.writeFile(path.join(repo, 'local.conf'), 'my local value\n')

  await assert.rejects(
    () =>
      switchBranch({
        repoRoot: repo,
        branch: 'feature',
        exec: git,
        backupRoot: path.join(repo, '..', `backups-${Date.now()}`),
      }),
    (error) => error.code === 'dispatch/ignored-conflict' && error.details.files.includes('local.conf'),
  )
  assert.equal(await gitExec(repo, ['branch', '--show-current']), 'main\n')
  assert.equal(await fs.readFile(path.join(repo, 'local.conf'), 'utf8'), 'my local value\n')
})

test('smart checkout stashes blocking edits and reports a restore conflict with a backup', async () => {
  const repo = await tempRepo()
  // feature changes a.txt differently from the local edit.
  await gitExec(repo, ['checkout', '-q', '-b', 'feature'])
  await fs.writeFile(path.join(repo, 'a.txt'), 'feature version\n')
  await commitAll(repo, 'feature edit')
  await gitExec(repo, ['checkout', '-q', 'main'])
  await fs.writeFile(path.join(repo, 'a.txt'), 'local version\n')

  const backupRoot = path.join(repo, '..', `backups-${Date.now()}`)
  await assert.rejects(
    () => switchBranch({ repoRoot: repo, branch: 'feature', exec: git, backupRoot }),
    (error) => {
      assert.equal(error.code, 'dispatch/restore-conflict')
      assert.ok(error.details.backupDir)
      assert.ok(error.details.files.includes('a.txt'))
      return true
    },
  )
  assert.ok(await exists(path.join(repo, 'a.txt')))
})

test('smart checkout can be turned off for a dirty tree', async () => {
  const repo = await tempRepo()
  await fs.writeFile(path.join(repo, 'notes.txt'), 'x\n')
  await assert.rejects(
    () =>
      switchBranch({
        repoRoot: repo,
        branch: 'issue_4',
        create: true,
        startPoint: 'main',
        exec: git,
        smart: false,
      }),
    (error) => error.code === 'dispatch/dirty-worktree',
  )
})

test('rollback returns to the original branch', async () => {
  const repo = await tempRepo()
  const snapshot = await switchBranch({
    repoRoot: repo,
    branch: 'issue_5',
    create: true,
    startPoint: 'main',
    exec: git,
  })
  const result = await rollbackBranch({ repoRoot: repo, snapshot, exec: git })
  assert.equal(result.ok, true)
  assert.equal(await gitExec(repo, ['branch', '--show-current']), 'main\n')
})

test('an invalid base leaves existing user stash and clean worktree untouched', async () => {
  const repo = await tempRepo()
  await fs.writeFile(path.join(repo, 'a.txt'), 'from an earlier task\n')
  await gitExec(repo, ['stash', 'push', '-m', 'existing stash'])
  const stash = await gitExec(repo, ['rev-parse', 'refs/stash'])
  await assert.rejects(
    () => switchBranch({ repoRoot: repo, branch: 'review', create: true, startPoint: 'missing-base', exec: git }),
    (error) => error.code === 'dispatch/bad-base',
  )
  assert.equal(await gitExec(repo, ['rev-parse', 'refs/stash']), stash)
  assert.equal(await gitExec(repo, ['status', '--porcelain']), '')
  assert.equal(await gitExec(repo, ['branch', '--show-current']), 'main\n')
})
