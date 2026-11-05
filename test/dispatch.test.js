import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { DispatchError, deliverAssets, dispatchStory, git } from '../lib/dispatch.js'
import { readDraftAsset } from '../lib/drafts.js'
import { commitAll, gitExec, tempRepo } from './helpers.js'

const STORY = {
  id: '1168200255001004297',
  shortId: '1004297',
  rootShortId: '1004297',
  projectId: '68200255',
  name: '客户端新增批量导出附件功能',
  description: '<p>导出附件</p>',
  url: 'https://www.tapd.cn/68200255/prong/stories/view/1168200255001004297',
}

function makeRegistry() {
  const workspaces = new Map()
  return {
    get(id) {
      return workspaces.get(id)
    },
    list() {
      return [...workspaces.values()]
    },
    resolveByPath(target) {
      return [...workspaces.values()].find((workspace) => workspace.path === target)
    },
    create(target, title) {
      const workspace = {
        id: `ws-${workspaces.size + 1}`,
        path: target,
        title,
        sessionIds: [],
        async attachSession(id) {
          this.sessionIds.push(id)
        },
      }
      workspaces.set(workspace.id, workspace)
      return workspace
    },
  }
}

function makeSessions(options = {}) {
  const calls = { create: [], prompt: [], rename: [] }
  return {
    calls,
    async create(request) {
      calls.create.push(request)
      return { sessionId: options.sessionId ?? 'session-1' }
    },
    async prompt(request) {
      calls.prompt.push(request)
      if (options.promptFails) throw new Error('agent busy')
      return { accepted: true }
    },
    async rename(request) {
      calls.rename.push(request)
    },
  }
}

function makeUploads(options = {}) {
  const uploads = []
  return {
    uploads,
    async uploadStream(request) {
      if (options.uploadFails) throw new Error('boom')
      const chunks = []
      for await (const chunk of request.data) chunks.push(chunk)
      const bytes = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
      uploads.push({ name: request.name, bytes, sessionId: request.sessionId })
      return { receiptId: `receipt-${request.name}`, file: { name: request.name, bytes } }
    },
  }
}

test('worktree dispatch creates the checkout, session, and text-only prompt', async () => {
  const repo = await tempRepo()
  const registry = makeRegistry()
  const sessions = makeSessions()
  const uploads = makeUploads()

  const record = await dispatchStory(
    {
      story: STORY,
      settings: { baseBranch: 'main', useWorktree: true },
      services: { workspaceRegistry: registry, sessionController: sessions, fileUploads: uploads },
      options: { branchName: 'issue_1004297', workspacePath: repo, useWorktree: true, baseBranch: 'main' },
    },
    git,
  )

  assert.equal(record.branch, 'issue_1004297')
  assert.equal(record.worktreePath.length > 0, true)
  assert.equal(await fs.readFile(path.join(record.worktreePath, 'a.txt'), 'utf8'), 'one\n')
  assert.equal(sessions.calls.create[0].workspaceId, record.workspaceId)
  assert.equal(sessions.calls.prompt[0].content.length, 1)
  assert.match(sessions.calls.prompt[0].content[0].text, /TAPD需求 #1004297/)
  assert.deepEqual(record.attachments, [])
})

test('the dialog text only appends to the generated brief', async () => {
  const repo = await tempRepo()
  const sessions = makeSessions()

  await dispatchStory(
    {
      story: STORY,
      settings: { baseBranch: 'main', useWorktree: true },
      services: { workspaceRegistry: makeRegistry(), sessionController: sessions, fileUploads: makeUploads() },
      options: {
        branchName: 'issue_1004297',
        workspacePath: repo,
        useWorktree: true,
        baseBranch: 'main',
        extraInstructions: '只改导出接口，不要动前端。',
      },
    },
    git,
  )

  const text = sessions.calls.prompt[0].content[0].text
  assert.match(text, /TAPD需求 #1004297/)
  assert.match(text, /## 补充要求/)
  assert.match(text, /只改导出接口，不要动前端。/)
  assert.equal(text.trimEnd().endsWith('只改导出接口，不要动前端。'), true)
})

test('an explicit prompt still replaces the generated brief', async () => {
  const repo = await tempRepo()
  const sessions = makeSessions()

  await dispatchStory(
    {
      story: STORY,
      settings: { baseBranch: 'main', useWorktree: true },
      services: { workspaceRegistry: makeRegistry(), sessionController: sessions, fileUploads: makeUploads() },
      options: { branchName: 'issue_1004297', workspacePath: repo, useWorktree: true, baseBranch: 'main', prompt: '自定义说明', extraInstructions: '忽略' },
    },
    git,
  )

  assert.equal(sessions.calls.prompt[0].content[0].text, '自定义说明')
})

test('in-place dispatch keeps untracked files and attaches real bytes', async () => {
  const repo = await tempRepo()
  await fs.writeFile(path.join(repo, 'notes.txt'), 'local notes\n')
  const registry = makeRegistry()
  const sessions = makeSessions()
  const uploads = makeUploads()
  const idle = []
  const bytes = new Uint8Array([1, 2, 3, 4])

  const record = await dispatchStory(
    {
      story: STORY,
      settings: { baseBranch: 'main' },
      services: { workspaceRegistry: registry, sessionController: sessions, fileUploads: uploads },
      assertIdle: async (target) => idle.push(target),
      loadAttachments: async () => ({
        files: [{ name: '原型.html', data: bytes }],
        images: [{ name: 'shot.png', mediaType: 'image/png', data: new Uint8Array([137, 80, 78, 71]) }],
      }),
      options: {
        branchName: 'issue_1004297', workspacePath: repo,
        useWorktree: false,
        baseBranch: 'main',
        backupRoot: path.join(path.dirname(repo), `backups-${Date.now()}`),
      },
    },
    git,
  )

  assert.equal(await gitExec(repo, ['branch', '--show-current']), 'issue_1004297\n')
  assert.equal(await fs.readFile(path.join(repo, 'notes.txt'), 'utf8'), 'local notes\n')
  assert.equal(idle.length, 1)
  assert.equal(uploads.uploads[0].name, '原型.html')
  assert.equal(uploads.uploads[0].bytes, 4)
  assert.equal(record.attachments[0].name, '原型.html')
  assert.equal(record.originalBranch, 'main')
  assert.ok(record.backupDir)
  const prompt = sessions.calls.prompt[0]
  assert.equal(prompt.content[0].type, 'text')
  assert.match(prompt.content[0].text, /- 附件：原型.html/)
  assert.deepEqual(prompt.content[1], { type: 'file', receiptId: 'receipt-原型.html' })
  assert.match(prompt.content[0].text, /- 图片：shot.png/)
  assert.deepEqual(prompt.content[2], {
    type: 'image',
    mediaType: 'image/png',
    name: 'shot.png',
    data: Buffer.from([137, 80, 78, 71]).toString('base64'),
  })
  assert.equal(record.images[0].name, 'shot.png')
  assert.equal(record.images[0].bytes, 4)
})

test('a draft dispatch fills the composer instead of sending', async () => {
  const repo = await tempRepo()
  const registry = makeRegistry()
  const sessions = makeSessions()
  const uploads = makeUploads()
  const draftRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'task-hub-draft-'))

  const record = await dispatchStory(
    {
      story: STORY,
      settings: { baseBranch: 'main', useWorktree: true },
      services: { workspaceRegistry: registry, sessionController: sessions, fileUploads: uploads },
      loadAttachments: async () => ({
        files: [{ name: '原型.html', data: new Uint8Array([1, 2, 3, 4]) }],
        images: [{ name: 'shot.png', mediaType: 'image/png', data: new Uint8Array([137, 80, 78, 71]) }],
      }),
      options: {
        branchName: 'issue_1004297',
        workspacePath: repo,
        useWorktree: true,
        baseBranch: 'main',
        deliver: 'draft',
        draftRoot,
      },
    },
    git,
  )

  // Nothing was sent and nothing was uploaded into the session.
  assert.equal(sessions.calls.prompt.length, 0)
  assert.equal(uploads.uploads.length, 0)
  assert.equal(record.status, 'draft')
  assert.match(record.draft.text, /TAPD需求 #1004297/)
  assert.deepEqual(record.draft.files, ['原型.html'])
  assert.deepEqual(record.draft.images, ['shot.png'])
  const image = record.draft.assets.find((asset) => asset.kind === 'image')
  const file = record.draft.assets.find((asset) => asset.kind === 'file')
  assert.equal(image.mediaType, 'image/png')
  assert.equal(image.name, 'shot.png')
  assert.equal(file.name, '原型.html')

  const stored = await readDraftAsset({ sessionId: record.sessionId, index: image.index, root: draftRoot })
  assert.equal(stored.mediaType, 'image/png')
  assert.equal(stored.bytes, 4)
  assert.deepEqual([...stored.data], [137, 80, 78, 71])
})

test('a busy workspace stops the dispatch before any branch change', async () => {
  const repo = await tempRepo()
  const registry = makeRegistry()
  const sessions = makeSessions()

  await assert.rejects(
    () =>
      dispatchStory(
        {
          story: STORY,
          settings: { baseBranch: 'main' },
          services: { workspaceRegistry: registry, sessionController: sessions, fileUploads: makeUploads() },
          assertIdle: async () => {
            throw new DispatchError('dispatch/workspace-busy', 'busy')
          },
          options: { branchName: 'issue_1004297', workspacePath: repo, useWorktree: false, baseBranch: 'main' },
        },
        git,
      ),
    (error) => error.code === 'dispatch/workspace-busy',
  )
  assert.equal(await gitExec(repo, ['branch', '--show-current']), 'main\n')
  assert.equal(sessions.calls.create.length, 0)
})

test('a missing branch name is rejected before touching git', async () => {
  const repo = await tempRepo()
  await assert.rejects(
    () =>
      dispatchStory(
        {
          story: STORY,
          settings: { baseBranch: 'main' },
          services: { workspaceRegistry: makeRegistry(), sessionController: makeSessions() },
          options: { workspacePath: repo, useWorktree: false },
        },
        git,
      ),
    (error) => error.code === 'dispatch/missing-branch',
  )
  assert.equal(await gitExec(repo, ['branch', '--show-current']), 'main\n')
})

test('an attachment upload failure is loud and carries the session id', async () => {
  const repo = await tempRepo()
  const registry = makeRegistry()
  const sessions = makeSessions()
  const uploads = makeUploads({ uploadFails: true })

  await assert.rejects(
    () =>
      dispatchStory(
        {
          story: STORY,
          settings: { baseBranch: 'main', useWorktree: true },
          services: { workspaceRegistry: registry, sessionController: sessions, fileUploads: uploads },
          loadAttachments: async () => [{ name: '原型.html', data: new Uint8Array([1]) }],
          options: { branchName: 'issue_1004297', workspacePath: repo, useWorktree: true, baseBranch: 'main' },
        },
        git,
      ),
    (error) => error.code === 'dispatch/attachment-failed' && error.details.sessionId === 'session-1',
  )
  assert.equal(sessions.calls.prompt.length, 0)
})

test('deliverAssets backfills files and screenshots into an existing session', async () => {
  const sessions = makeSessions()
  const uploads = makeUploads()
  const delivered = await deliverAssets({
    sessionId: 'session-old',
    files: [{ name: '原型.html', data: new Uint8Array([1, 2]) }],
    images: [{ name: 'shot.png', mediaType: 'image/png', data: new Uint8Array([3, 4]) }],
    text: '补充需求附件与截图',
    services: { sessionController: sessions, fileUploads: uploads },
  })

  assert.equal(sessions.calls.prompt.length, 1)
  const [prompt] = sessions.calls.prompt
  assert.equal(prompt.sessionId, 'session-old')
  assert.equal(prompt.mode, 'queue')
  assert.equal(prompt.content[0].type, 'text')
  assert.match(prompt.content[0].text, /补充需求附件与截图/)
  assert.equal(prompt.content[1].type, 'file')
  assert.equal(prompt.content[1].receiptId, 'receipt-原型.html')
  assert.equal(prompt.content[2].type, 'image')
  assert.equal(prompt.content[2].mediaType, 'image/png')
  assert.equal(Buffer.from(prompt.content[2].data, 'base64').toString('hex'), '0304')
  assert.deepEqual(delivered.attachments, [{ name: '原型.html', bytes: 2 }])
  assert.deepEqual(delivered.images, [{ name: 'shot.png', bytes: 2 }])
  assert.deepEqual(uploads.uploads, [{ name: '原型.html', bytes: 2, sessionId: 'session-old' }])
})

test('a prompt failure keeps the dispatcher informed', async () => {
  const repo = await tempRepo()
  const registry = makeRegistry()
  const sessions = makeSessions({ sessionId: 'session-9', promptFails: true })

  await assert.rejects(
    () =>
      dispatchStory(
        {
          story: STORY,
          settings: { baseBranch: 'main', useWorktree: true },
          services: { workspaceRegistry: registry, sessionController: sessions, fileUploads: makeUploads() },
          options: { branchName: 'issue_1004297', workspacePath: repo, useWorktree: true, baseBranch: 'main' },
        },
        git,
      ),
    (error) => error.code === 'dispatch/prompt-failed' && error.details.sessionId === 'session-9',
  )
})

test('a session creation failure rolls the branch back', async () => {
  const repo = await tempRepo()
  const registry = makeRegistry()
  const sessions = {
    async create() {
      throw new Error('host refused')
    },
    async prompt() {},
    async rename() {},
  }

  await assert.rejects(
    () =>
      dispatchStory(
        {
          story: STORY,
          settings: { baseBranch: 'main' },
          services: { workspaceRegistry: registry, sessionController: sessions, fileUploads: makeUploads() },
          options: { branchName: 'issue_1004297', workspacePath: repo, useWorktree: false, baseBranch: 'main' },
        },
        git,
      ),
    (error) => {
      assert.equal(error.code, 'dispatch/no-session')
      assert.equal(error.details.rollback.ok, true)
      return true
    },
  )
  assert.equal(await gitExec(repo, ['branch', '--show-current']), 'main\n')
})

test('a branch already checked out in a worktree is reported, not re-checked out', async () => {
  const repo = await tempRepo()
  const worktree = path.join(path.dirname(repo), `wt-${Date.now()}`)
  await gitExec(repo, ['worktree', 'add', '-b', 'issue_1004297', worktree])

  await assert.rejects(
    () =>
      dispatchStory(
        {
          story: STORY,
          settings: { baseBranch: 'main' },
          services: { workspaceRegistry: makeRegistry(), sessionController: makeSessions(), fileUploads: makeUploads() },
          options: { branchName: 'issue_1004297', workspacePath: repo, useWorktree: false, baseBranch: 'main' },
        },
        git,
      ),
    (error) => error.code === 'dispatch/branch-in-use' && path.basename(error.details.path) === path.basename(worktree),
  )
  assert.equal(await gitExec(repo, ['branch', '--show-current']), 'main\n')
})

test('commitAll helper keeps the repo clean for follow-up work', async () => {
  const repo = await tempRepo()
  await fs.writeFile(path.join(repo, 'b.txt'), 'b\n')
  await commitAll(repo, 'add b')
  assert.equal((await gitExec(repo, ['status', '--porcelain'])).trim(), '')
})
