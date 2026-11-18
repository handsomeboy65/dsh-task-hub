import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test, { after } from 'node:test'

import { gitExec, tempRepo } from './helpers.js'

const dataHome = await mkdtemp(path.join(os.tmpdir(), 'dsh-task-hub-host-test-'))
const home = os.homedir
let host
let store
let drafts
try {
  os.homedir = () => dataHome
  host = await import('../lib/index.js')
  store = await import('../lib/store.js')
  drafts = await import('../lib/drafts.js')
} finally {
  os.homedir = home
}
after(() => rm(dataHome, { recursive: true, force: true }))

const STORY_ID = '101'
const ZENTAO_STORY = { id: 'story-101', remoteId: '101', source: 'zentao', projectId: '7', kind: 'story', name: '禅道任务' }

function trackerFetch(url) {
  const { hostname, pathname, searchParams } = new URL(url)
  const tapd = (data) => Response.json({ status: 1, data })
  if (hostname === 'api.tapd.cn') {
    if (pathname === '/stories') {
      const story = (id, status, vStatus) => ({
        Story: {
          id,
          name: 'TAPD ' + id,
          status,
          v_status: vStatus,
          completed: status === 'closed' ? '2026-11-12' : '',
          developer: 'dev1',
          cc: 'cc1',
          effort: '3',
        },
      })
      return tapd(searchParams.has('id') ? [story(STORY_ID, 'developing', '新建(需求设计中)')] : [
        story(STORY_ID, 'developing', '新建(需求设计中)'),
        story('102', 'closed', '已上线'),
      ])
    }
    if (pathname === '/stories/get_fields_info') return tapd({
      status: { options: { developing: '研发中', testing: '测试中(Testing)', status_18: '待发布(测试通过)' } },
    })
    if (pathname === '/attachments') {
      return tapd([{ Attachment: {
        id: '9', filename: '原型.html', size: '2048', created: '2026-11-17 14:31:05', owner: '叶又财',
      } }])
    }
    if (pathname === '/comments') {
      return tapd([{ Comment: {
        id: '5', description: '配置中：去掉编辑功能', author: '叶又财', created: '2026-11-06 18:10',
      } }])
    }
    if (pathname === '/stories/custom_fields_settings' || pathname === '/iterations') return tapd([])
  } else if (hostname === 'zentao.example.test') {
    if (pathname.endsWith('/tokens')) return Response.json({ token: 'fake-zt-token' })
    if (pathname.endsWith('/user')) return Response.json({ account: 'account' })
    if (pathname.endsWith('/products/7/stories')) {
      return Response.json({
        total: 1,
        stories: [{ id: '101', title: '禅道任务', assignedTo: { account: 'account' }, status: 'active', type: 'story' }],
      })
    }
    if (pathname.endsWith('/stories/101')) {
      return Response.json({
        id: '101',
        title: '禅道任务',
        status: 'active',
        stage: 'testing',
        pri: 2,
        assignedTo: { account: 'account', realname: '负责人' },
        dueDate: '2026-11-20',
        spec: '<p>最新需求正文</p>',
        estimate: '5',
        closedDate: '2026-11-01',
        mailto: 'cc@example.test',
        parent: '100',
        files: [{
          id: '4', title: 'details.txt', extension: 'txt', size: '12', addedBy: 'admin', addedDate: '2026-11-17 12:00:00',
        }],
        actions: [{ id: '7', action: 'commented', actor: 'admin', date: '2026-11-06 18:10', comment: '评论内容' }],
      })
    }
    if (pathname.endsWith('/files/4')) return new Response('new attachment')
  }
  throw new Error('Unexpected tracker request: ' + hostname + pathname)
}

function setupHost({ secrets = {}, items = [], workspace } = {}) {
  const workspaces = new Map(workspace ? [[workspace.id, workspace]] : [])
  const routes = new Map()
  const created = []
  const behavior = { listError: false, attachError: false }
  const services = {
    connection: { fetch: { register(route) { routes.set(route.path, route.fetch) } } },
    workspaceRegistry: {
      list: () => [...workspaces.values()],
      get: (id) => workspaces.get(id),
      resolveByPath: (target) => [...workspaces.values()].find((item) => item.path === target),
      create(target, title) {
        const entry = {
          id: 'workspace-' + (workspaces.size + 1),
          title,
          path: target,
          sessionIds: [],
          async attachSession(id) {
            if (behavior.attachError) throw new Error('test attach failure')
            this.sessionIds.push(id)
          },
        }
        workspaces.set(entry.id, entry)
        return entry
      },
    },
    credentials: {
      resolve: (ref) => secrets[ref] ? { value: secrets[ref] } : undefined,
      set: (ref, value) => { secrets[ref] = value },
    },
    sessionController: {
      async list() {
        if (behavior.listError) throw new Error('temporary listing failure')
        return { items }
      },
      async create({ workspaceId }) {
        const id = 'new-' + (created.length + 1)
        items.push({ sessionId: id, blank: true, cwd: workspaces.get(workspaceId).path })
        created.push(id)
        return { sessionId: id }
      },
      async rename() {},
      async prompt() { assert.fail('a draft should not be sent') },
    },
  }
  host.apply({
    get: (name) => services[name],
    inject(_keys, effect) { effect(this) },
    effect: (effect) => effect(),
  })
  const request = (route, body = {}) => routes.get('/api/task-hub/' + route)(new Request('http://localhost', {
    method: 'POST', body: JSON.stringify(body),
  }))
  const call = async (route, body) => (await request(route, body)).json()
  const value = async (route, body) => {
    const result = await call(route, body)
    assert.equal(result.ok, true, result.error?.message)
    return result.value
  }
  return { behavior, created, request, call, value }
}

test('old flat settings and records are readable, and concurrent state writes preserve them', async () => {
  await mkdir(store.DATA_DIR, { recursive: true })
  await writeFile(store.SETTINGS_FILE, JSON.stringify({ apiUser: 'legacy', projects: '42', baseBranch: 'main' }))
  await store.saveState({ [STORY_ID]: { sessionId: 'old-tapd', draft: { text: 'old draft' } } })
  await Promise.all(Array.from({ length: 12 }, (_, index) => store.putDispatch('tapd:' + index, { sessionId: 'session-' + index })))
  assert.equal(Object.keys(await store.loadState()).length, 13)
  assert.equal((await store.findDispatch('tapd', STORY_ID)).draft.text, 'old draft')
  assert.equal(await store.findDispatch('zentao', STORY_ID), null)
  const settings = await store.loadSettings()
  assert.deepEqual(settings.tapd.projects, ['42'])
  assert.equal(settings.tapd.allowQueryAuth, true)
  assert.equal(store.normalizeSettings(null).tapd.allowQueryAuth, false)
  await Promise.all([store.saveSettings({ tapd: { nick: 'nick' } }), store.saveSettings({ baseBranch: 'develop' })])
  assert.equal((await store.loadSettings()).tapd.nick, 'nick')
  assert.equal((await store.loadSettings()).baseBranch, 'develop')
})

test('stored Markdown drafts are upgraded to the plain-text brief on read', async () => {
  const legacyText = '# 禅道用户需求 ##4：测试用户需求\n\n## 需求内容\n\n测试用户需求' +
    '\n\n## 参考资料\n\n- 附件：入仓单.xlsx' +
    '\n\n## 工作环境\n\n- 仓库：`/tmp/wt`\n\n## 执行要求\n\n1. 先阅读需求'
  await store.saveState({
    'zentao:story-4': {
      sessionId: 'legacy-session',
      draft: { text: legacyText },
      previousSessions: [{ sessionId: 'older-session', draft: { text: legacyText } }],
    },
  })
  const record = await store.findDispatch('zentao', 'story-4')
  assert.match(record.draft.text, /^禅道用户需求 #4：测试用户需求/)
  assert.match(record.draft.text, /【需求内容】/)
  assert.match(record.draft.text, /【参考资料】/)
  assert.doesNotMatch(record.draft.text, /##|工作环境|执行要求/)
  // The composer still holds the old text; naming it lets the Client replace
  // an untouched composer and re-attach the screenshots.
  assert.equal(record.draft.previousText, legacyText)
  // The brief itself is compact: header lines together, no empty line under a
  // section label, no empty lines inside the description.
  assert.equal(
    record.draft.text,
    '禅道用户需求 #4：测试用户需求\n\n【需求内容】\n测试用户需求\n\n【参考资料】\n- 附件：入仓单.xlsx',
  )
  // A composer opened between the heading upgrade and the layout compaction
  // holds the sparse text; it is replaceable too.
  assert.equal(
    record.draft.previousTextUpgraded,
    '禅道用户需求 #4：测试用户需求\n\n【需求内容】\n\n测试用户需求\n\n【参考资料】\n\n- 附件：入仓单.xlsx',
  )
  assert.match(record.previousSessions[0].draft.text, /【需求内容】/)
  assert.equal(record.previousSessions[0].draft.previousText, legacyText)
  assert.doesNotMatch(record.previousSessions[0].draft.text, /##|工作环境/)
  // A draft stored with the plain-text but sparse layout is compacted on read
  // as well, so the operator does not have to wait for a re-dispatch.
  await store.saveState({ 'tapd:9': { sessionId: 'sparse', draft: { text: 'TAPD需求 #9：稀疏\n\n【需求内容】\n\n正文\n\n【参考资料】\n\n- 附件：a.pdf' } } })
  const sparse = (await store.loadState())['tapd:9']
  assert.equal(sparse.draft.text, 'TAPD需求 #9：稀疏\n\n【需求内容】\n正文\n\n【参考资料】\n- 附件：a.pdf')
  assert.equal(sparse.draft.previousText, 'TAPD需求 #9：稀疏\n\n【需求内容】\n\n正文\n\n【参考资料】\n\n- 附件：a.pdf')
  assert.equal(sparse.draft.previousTextUpgraded, undefined)
})

test('session lookup errors stay distinct from archived sessions and blank drafts', async () => {
  await store.saveState({ [STORY_ID]: { sessionId: 'old-tapd', draft: { text: 'old draft' } } })
  const item = { sessionId: 'old-tapd', blank: true }
  const workspace = { id: 'workspace', sessionIds: ['old-tapd'] }
  const host = setupHost({ items: [item], workspace })
  host.behavior.listError = true
  const unavailable = (await host.value('status')).entries[0]
  assert.equal(unavailable.statusUnavailable, true)
  assert.equal(unavailable.sessionMissing, false)
  assert.equal((await host.value('dispatch', { storyId: STORY_ID })).sessionId, 'old-tapd')
  host.behavior.listError = false
  assert.equal((await host.value('status')).entries[0].draftWaiting, true)
  item.blank = false
  assert.equal((await host.value('status')).entries[0].draftWaiting, false)
  workspace.sessionIds.length = 0
  assert.equal((await host.value('status')).entries[0].sessionMissing, true)
})

test('combined view shows both native statuses and completed items while old clients retain their defaults', async (t) => {
  t.mock.method(globalThis, 'fetch', trackerFetch)
  await store.saveState({ [STORY_ID]: { sessionId: 'old-tapd', draft: { text: 'old draft' } } })
  await store.saveSettings({ provider: 'tapd', excludeCompleted: true, zentao: {
    baseUrl: 'https://zentao.example.test', account: 'account', containerIds: ['7'],
  } })
  const host = setupHost({ secrets: { TAPD_API_TOKEN: 'fake-tapd-token', ZENTAO_PASSWORD: 'fake-zt-password' } })
  const legacy = await host.value('tasks')
  assert.deepEqual(legacy.stories.map((story) => story.uid), ['tapd:101'])
  assert.equal(legacy.projects[0].statuses, undefined)
  assert.equal(legacy.statusOptions, undefined)
  const all = await host.value('tasks', { provider: 'all', includeCompleted: true, includeStatusOptions: true })
  assert.deepEqual(all.projects[0].statuses, ['新建(需求设计中)', '测试中(Testing)', '待发布(测试通过)'])
  assert.equal(all.provider, 'all')
  for (const label of ['已计划', '研发中', '测试中', '已发布', '已关闭']) {
    assert.ok(all.statusOptions.zentao.includes(label), label)
  }
  assert.deepEqual(all.stories.map((story) => story.vStatus), ['新建(需求设计中)', '已上线', '进行中'])
  assert.equal(all.stories.find((story) => story.uid === 'tapd:101').dispatch.sessionId, 'old-tapd')
  assert.equal(all.stories.find((story) => story.uid === 'zentao:story-101').dispatch, null)
  const tapdOnly = setupHost({ secrets: { TAPD_API_TOKEN: 'fake-tapd-token' } })
  const partial = await tapdOnly.value('tasks', { provider: 'all' })
  assert.equal(partial.stories.length, 1)
  assert.equal(partial.sourceErrors[0].provider, 'zentao')
  assert.equal((await store.loadSettings()).provider, 'tapd')
})

test('ZenTao keeps its saved credentials for the current address and requires a password for a new address', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', (url) => {
    calls.push(new URL(url).hostname)
    if (String(url).endsWith('/tokens')) return Response.json({ token: 'fake-zt-token' })
    return Response.json({ products: [], projects: [] })
  })
  await store.saveSettings({ zentao: { baseUrl: 'https://zentao.example.test', account: 'account' } })
  const host = setupHost({ secrets: { ZENTAO_PASSWORD: 'fake-zt-password' } })
  await host.value('zentao/containers', { baseUrl: 'https://zentao.example.test/api.php/v1' })
  const change = { baseUrl: 'https://different.example.test', account: 'account' }
  assert.equal((await host.call('zentao/containers', change)).error.code, 'zentao/missing-credentials')
  assert.equal((await host.call('settings', { zentao: change })).error.code, 'zentao/missing-credentials')
  assert.ok(calls.every((address) => address === 'zentao.example.test'))
  assert.equal((await store.loadSettings()).zentao.baseUrl, 'https://zentao.example.test')
})

test('explicit continuation uses the selected session and leaves old attachments, Git, and draft intact', async (t) => {
  t.mock.method(globalThis, 'fetch', trackerFetch)
  const original = { sessionId: 'original', branch: 'feature/original', workspaceId: 'w1', draft: { text: '旧草稿' } }
  await store.saveState({ 'zentao:story-101': original })
  await drafts.saveDraftAssets({ sessionId: original.sessionId, files: [{ name: 'original.txt', data: Buffer.from('old asset') }] })
  const host = setupHost({
    secrets: { ZENTAO_PASSWORD: 'fake-zt-password' },
    items: [{ sessionId: 'original', blank: false }],
    workspace: { id: 'w1', sessionIds: ['original'] },
  })
  const result = await host.value('dispatch', {
    provider: 'zentao', story: ZENTAO_STORY, conversation: 'existing', sessionId: 'original', extraInstructions: '继续测试',
  })
  assert.equal(result.sessionId, 'original')
  assert.equal(result.continuation, true)
  assert.match(result.draft.text, /最新需求正文[\s\S]*继续测试/)
  // The session may still show its unsent old draft; the Client can replace an
  // untouched composer only when it knows that text.
  assert.equal(result.draft.previousText, '旧草稿')
  const bytes = await host.request('asset', { session: 'original', i: 0, draftId: result.draft.draftId })
  assert.equal(await bytes.text(), 'new attachment')
  assert.equal(await (await host.request('asset', { session: 'original', i: 0 })).text(), 'old asset')
  assert.deepEqual(await store.findDispatch('zentao', 'story-101'), original)
  assert.deepEqual(host.created, [])
})

test('new conversation reuses the original worktree, retries its draft, and keeps the original selectable', async (t) => {
  t.mock.method(globalThis, 'fetch', trackerFetch)
  const repo = await tempRepo()
  const folder = await mkdtemp(path.join(os.tmpdir(), 'task-hub-existing-worktree-'))
  t.after(() => Promise.all([repo, folder].map((target) => rm(target, { force: true, recursive: true }))))
  const checkout = path.join(folder, 'checkout')
  await gitExec(repo, ['worktree', 'add', '-b', 'feature/original', checkout, 'main'])
  const original = {
    sessionId: 'original', branch: 'feature/original', workspaceId: 'w1',
    repoPath: repo, worktreePath: checkout, baseBranch: 'main', draft: { text: '旧草稿' },
  }
  await store.saveState({ 'zentao:story-101': original })
  const host = setupHost({
    secrets: { ZENTAO_PASSWORD: 'fake-zt-password' },
    items: [{ sessionId: 'original', blank: false }],
    workspace: {
      id: 'w1',
      path: checkout,
      sessionIds: ['original'],
      async attachSession(id) {
        if (host.behavior.attachError) throw new Error('test attach failure')
        this.sessionIds.push(id)
      },
    },
  })
  const request = {
    provider: 'zentao', story: ZENTAO_STORY, conversation: 'new', requestId: 'one-new-intent',
  }
  const before = await gitExec(repo, ['worktree', 'list', '--porcelain'])

  host.behavior.attachError = true
  assert.equal((await host.call('dispatch', request)).error.code, 'dispatch/draft-incomplete')
  assert.equal((await store.findDispatch('zentao', 'story-101')).draftPending, true)
  host.behavior.attachError = false
  const result = await host.value('dispatch', request)
  assert.equal(result.sessionId, 'new-1')
  assert.equal(result.workspaceId, original.workspaceId)
  assert.equal(result.branch, original.branch)
  assert.equal(result.worktreePath, original.worktreePath)
  assert.doesNotMatch(result.draft.text, /feature\/original/)
  assert.equal(result.draftPending, false)
  assert.equal(result.previousSessions[0].sessionId, 'original')
  assert.equal((await host.value('dispatch', request)).sessionId, result.sessionId)
  assert.deepEqual(host.created, ['new-1'])
  assert.equal(await gitExec(repo, ['branch', '--show-current']), 'main\n')
  assert.equal(await gitExec(repo, ['worktree', 'list', '--porcelain']), before)
  const historical = await host.value('dispatch', { ...request, conversation: 'existing', sessionId: 'original' })
  assert.equal(historical.sessionId, 'original')
  assert.equal((await store.findDispatch('zentao', 'story-101')).sessionId, 'new-1')
})

test('new conversations use the task branch when the original workspace has switched branches', async (t) => {
  t.mock.method(globalThis, 'fetch', trackerFetch)
  for (const alreadyCheckedOut of [true, false]) {
    await t.test(alreadyCheckedOut ? 'reuse another worktree' : 'prepare a worktree on the existing branch', async (child) => {
      const repo = await tempRepo()
      const root = (await gitExec(repo, ['rev-parse', '--show-toplevel'])).trim()
      const branch = 'issue_1004252'
      const checkout = alreadyCheckedOut
        ? path.join(root, '..', path.basename(root) + '-other-worktree')
        : path.join(root, '..', '.dsh-worktrees', path.basename(root) + '-' + branch)
      child.after(() => Promise.all([repo, checkout].map((target) => rm(target, { force: true, recursive: true }))))
      const original = { sessionId: 'original', branch, workspaceId: 'w1', repoPath: root }
      await store.saveState({ 'zentao:story-101': original })
      const host = setupHost({
        secrets: { ZENTAO_PASSWORD: 'fake-zt-password' },
        items: [{ sessionId: 'original', blank: false }],
        workspace: { id: 'w1', path: root, sessionIds: ['original'] },
      })
      const request = { provider: 'zentao', story: ZENTAO_STORY, conversation: 'new', requestId: 'reuse-branch' }
      const missing = await host.call('dispatch', request)
      assert.equal(missing.error.code, 'dispatch/branch-not-found')
      assert.deepEqual(host.created, [])

      await gitExec(repo, ['branch', branch])
      if (alreadyCheckedOut) await gitExec(repo, ['worktree', 'add', checkout, branch])
      const list = await gitExec(repo, ['worktree', 'list', '--porcelain'])
      const refs = await gitExec(repo, ['for-each-ref', '--format=%(refname) %(objectname)', 'refs/heads'])
      await writeFile(path.join(repo, 'a.txt'), 'original worktree edit\n')

      const result = await host.value('dispatch', request)
      assert.equal(result.branch, branch)
      assert.equal(result.worktreePath, checkout)
      assert.notEqual(result.workspaceId, original.workspaceId)
      assert.equal(await gitExec(checkout, ['branch', '--show-current']), branch + '\n')
      assert.equal(await gitExec(repo, ['branch', '--show-current']), 'main\n')
      assert.equal(await readFile(path.join(repo, 'a.txt'), 'utf8'), 'original worktree edit\n')
      assert.equal(await gitExec(repo, ['for-each-ref', '--format=%(refname) %(objectname)', 'refs/heads']), refs)
      if (alreadyCheckedOut) assert.equal(await gitExec(repo, ['worktree', 'list', '--porcelain']), list)
      assert.equal(result.previousSessions[0].sessionId, original.sessionId)
    })
  }
})


test('story route returns a read-only detail record without creating a dispatch', async (t) => {
  t.mock.method(globalThis, 'fetch', trackerFetch)
  await store.saveState({})
  await store.saveSettings({ provider: 'tapd', zentao: {
    baseUrl: 'https://zentao.example.test', account: 'account', containerIds: ['7'],
  } })
  const host = setupHost({ secrets: { TAPD_API_TOKEN: 'fake-tapd-token', ZENTAO_PASSWORD: 'fake-zt-password' } })

  const tapd = await host.value('story', {
    provider: 'tapd',
    storyId: '101',
    projectId: '42',
    story: { id: '101', projectId: '42', source: 'tapd', name: 'TAPD 101' },
  })
  assert.equal(tapd.story.uid, 'tapd:101')
  assert.equal(tapd.story.developer, 'dev1')
  assert.equal(tapd.story.cc, 'cc1')
  assert.equal(tapd.story.effort, '3')
  assert.ok(Array.isArray(tapd.images))
  assert.equal(tapd.attachments.length, 1)
  assert.equal(tapd.attachments[0].name, '原型.html')
  assert.equal(tapd.attachments[0].size, 2048)
  assert.equal(tapd.comments.length, 1)
  assert.equal(tapd.comments[0].text, '配置中：去掉编辑功能')
  assert.equal(await store.findDispatch('tapd', '101'), null)

  const zentao = await host.value('story', {
    provider: 'zentao',
    storyId: 'story-101',
    projectId: '7',
    story: { id: 'story-101', remoteId: '101', source: 'zentao', projectId: '7', kind: 'story', name: '禅道' },
  })
  assert.equal(zentao.story.uid, 'zentao:story-101')
  assert.equal(zentao.story.name, '禅道任务')
  assert.equal(zentao.story.status, 'active')
  assert.equal(zentao.story.stageLabel, '测试中')
  assert.equal(zentao.story.priorityLabel, 'P2')
  assert.equal(zentao.story.owner, '负责人')
  assert.equal(zentao.story.due, '2026-11-20')
  assert.equal(zentao.story.estimate, '5')
  assert.equal(zentao.story.closedDate, '2026-11-01')
  assert.equal(zentao.story.mailto, 'cc@example.test')
  assert.equal(zentao.story.parentId, '100')
  assert.equal(zentao.attachments.length, 1)
  assert.equal(zentao.attachments[0].name, 'details.txt')
  assert.equal(zentao.attachments[0].size, 12)
  assert.equal(zentao.comments.length, 1)
  assert.equal(zentao.comments[0].text, '评论内容')
  assert.equal(await store.findDispatch('zentao', 'story-101'), null)

  const missing = await host.call('story', { provider: 'tapd', story: {} })
  assert.equal(missing.ok, false)
  assert.equal(missing.error.code, 'source/bad-request')
})

test('story route inlines screenshots embedded in the requirement body', async (t) => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const target = String(url)
    if (target.startsWith('https://files.test/')) {
      return new Response(png, { headers: { 'content-type': 'image/png' } })
    }
    if (target.includes('/files/get_image')) {
      return Response.json({ status: 1, data: { Attachment: { download_url: 'https://files.test/shot.png' } } })
    }
    const response = await trackerFetch(target, init)
    if (target.includes('/stories?') && target.includes('id=')) {
      const body = await response.json()
      body.data = body.data.map((row) => ({
        Story: { ...row.Story, description: '<p>见截图</p><img src="https://www.tapd.cn/files/get_image?image_path=shot.png">' },
      }))
      return Response.json(body)
    }
    return response
  })
  await store.saveState({})
  await store.saveSettings({ provider: 'tapd' })
  const host = setupHost({ secrets: { TAPD_API_TOKEN: 'fake-tapd-token' } })
  const detail = await host.value('story', {
    provider: 'tapd',
    storyId: '101',
    projectId: '42',
    story: { id: '101', projectId: '42', source: 'tapd', name: 'TAPD 101' },
  })
  assert.equal(detail.images.length, 1)
  assert.match(detail.images[0].dataUrl, /^data:image\/png;base64,/)
  assert.equal(detail.images[0].name, 'shot.png')
  assert.deepEqual(detail.images[0].sources, ['https://www.tapd.cn/files/get_image?image_path=shot.png'])
})
