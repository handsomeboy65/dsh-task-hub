import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchMyWork, listContainers, apiRoot as zentaoRoot, resetZentaoTokens } from '../lib/zentao.js'
import { fetchTask, fetchTaskAssets, listTasks, providerOf, uidOf } from '../lib/sources.js'
import { buildTaskPrompt, refreshTaskPrompt } from '../lib/prompt.js'

function json(body, headers = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers })
}

test('uidOf and providerOf keep sources apart', () => {
  assert.equal(uidOf('zentao', 'task-3'), 'zentao:task-3')
  assert.equal(providerOf({ provider: 'zentao' }), 'zentao')
  assert.equal(providerOf({}), 'tapd')
  assert.equal(providerOf({ provider: 'nope' }), 'tapd')
})

test('zentao apiRoot normalises base urls', () => {
  assert.equal(zentaoRoot('https://z.example.com'), 'https://z.example.com/api.php/v1')
  assert.equal(zentaoRoot('https://z.example.com/api.php'), 'https://z.example.com/api.php/v1')
  assert.equal(zentaoRoot('https://z.example.com/api.php/v1/'), 'https://z.example.com/api.php/v1')
})

test('zentao lists product stories assigned to the signed-in user', async () => {
  resetZentaoTokens()
  const seen = []
  const fetchImpl = async (url, init) => {
    seen.push({ url, headers: init.headers, body: init.body })
    if (url.endsWith('/api.php/v1/tokens')) return json({ token: 'tk' })
    if (url.endsWith('/api.php/v1/user')) return json({ profile: { account: 'spring', realname: '测试用户' } })
    if (url.includes('/products/9/stories')) {
      return json({
        total: 2,
        stories: [
          { id: 1, title: '支持导出', assignedTo: { account: 'spring' }, status: 'doing', pri: 2, spec: 'CSV' },
          { id: 2, title: '别人的', assignedTo: { account: 'other', realname: '测试用户' }, status: 'wait', pri: 3 },
        ],
      })
    }
    throw new Error(`unexpected ${url}`)
  }
  const result = await fetchMyWork({
    baseUrl: 'https://z.example.com',
    credentials: { account: 'spring', password: 'pw' },
    scope: 'product',
    containerId: 9,
    containerName: '产品 A',
    fetchImpl,
  })
  assert.equal(seen[0].url, 'https://z.example.com/api.php/v1/tokens')
  assert.deepEqual(JSON.parse(seen[0].body), { account: 'spring', password: 'pw' })
  assert.ok(seen.every(({ headers }) => !headers.authorization))
  assert.equal(seen[1].headers.token, 'tk')
  assert.deepEqual(result.me, { account: 'spring', name: '测试用户' })
  assert.equal(result.rawCount, 2)
  assert.equal(result.stories.length, 1)
  const story = result.stories[0]
  assert.equal(story.id, 'story-1')
  assert.equal(story.shortId, '#1')
  assert.equal(story.vStatus, '进行中')
  assert.equal(story.completed, false)
  assert.equal(story.priorityLabel, 'P2')
  assert.equal(story.iterationName, '产品 A')
  assert.equal(story.url, 'https://z.example.com/story-view-1.html')
})

test('zentao keeps gateway Basic Auth separate from login and API tokens', async () => {
  resetZentaoTokens()
  const baseUrl = 'https://gateway.example.com/zentao'
  const credentials = { account: 'member', password: 'app-password' }
  const basicAuth = { account: 'gateway', password: 'gateway:password ' }
  const authorization = `Basic ${Buffer.from('gateway:gateway:password ').toString('base64')}`
  const paths = []
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname.split('/').at(-1)
    paths.push(path)
    if (init.headers.authorization !== authorization) {
      return new Response('gateway denied', { status: 401, headers: { 'www-authenticate': 'Basic realm="gateway"' } })
    }
    if (path === 'tokens') {
      assert.deepEqual(JSON.parse(init.body), credentials)
      assert.equal(init.headers.token, undefined)
      return json({ token: 'api-token' })
    }
    assert.equal(init.headers.token, 'api-token')
    if (path === 'user') return json({ user: { account: 'member' } })
    return json({ [path]: [] })
  }
  const options = { baseUrl, credentials: { ...credentials, basicAuth }, fetchImpl }
  await listContainers(options)
  await fetchMyWork({ ...options, containerId: '7' })
  assert.deepEqual(paths.sort(), ['products', 'projects', 'stories', 'stories', 'stories', 'tokens', 'user'])

  await assert.rejects(
    () => listContainers({ ...options, credentials }),
    (error) => error.code === 'zentao/basic-auth-failed' && error.message.includes('启用'),
  )
  await assert.rejects(
    () => listContainers({ ...options, credentials: { ...credentials, basicAuth: { ...basicAuth, password: 'wrong' } } }),
    (error) => error.code === 'zentao/basic-auth-failed' && error.message.includes('验证失败'),
  )
  await assert.rejects(
    () => listContainers({ ...options, credentials: { ...credentials, basicAuth: { account: 'gateway' } } }),
    { code: 'zentao/missing-basic-auth' },
  )
})

test('ZenTao combines development, user and business requirements with type-aware detail links', async () => {
  const rows = {
    story: { id: 1, title: '研发需求', type: 'story', assignedTo: 'admin', status: 'active', stage: 'developing' },
    requirement: { id: 4, title: '用户需求', type: 'requirement', assignedTo: 'admin', status: 'active', stage: 'testing' },
    epic: { id: 5, title: '业务需求', type: 'epic', assignedTo: 'admin', status: 'active' },
  }
  const queries = []
  const options = {
    baseUrl: 'https://types.example.com/zentao',
    credentials: { account: 'admin', password: 'pw' },
    containerId: '1',
    fetchImpl: async (url) => {
      const { pathname, searchParams } = new URL(url)
      const type = searchParams.get('type')
      if (pathname.endsWith('/tokens')) return json({ token: 'types-token' })
      if (pathname.endsWith('/user')) return json({ profile: { account: 'admin' } })
      if (pathname.endsWith('/products/1/stories')) {
        queries.push(type)
        return json({ stories: type === 'epic' ? [rows.epic, rows.requirement] : [rows[type]] })
      }
      if (pathname.endsWith('/stories/4') && type === 'requirement') return json({ id: 4, spec: '用户需求正文', stage: 'tested' })
      if (pathname.endsWith('/stories/5') && type === 'epic') return json({ id: 5, spec: '业务需求正文' })
      throw new Error(`unexpected ${url}`)
    },
  }
  const result = await fetchMyWork(options)
  assert.deepEqual(queries.sort(), ['epic', 'requirement', 'story'])
  assert.equal(result.rawCount, 3)
  assert.deepEqual(result.stories.map(({ id, requirementType }) => [id, requirementType]), [
    ['story-1', 'story'], ['story-4', 'requirement'], ['story-5', 'epic'],
  ])
  assert.deepEqual(result.stories.map(({ stage, stageLabel, status, completed }) => [stage, stageLabel, status, completed]), [
    ['developing', '研发中', 'active', false],
    ['testing', '测试中', 'active', false],
    ['', '', 'active', false],
  ])
  for (const story of result.stories.slice(1)) {
    assert.equal(story.url, `https://types.example.com/zentao/story-view-${story.remoteId}-0-0-${story.requirementType}.html`)
    const detailed = await fetchTask({
      provider: 'zentao',
      settings: { zentao: { baseUrl: options.baseUrl } },
      credentials: { zentao: options.credentials },
      fetchImpl: options.fetchImpl,
      story,
    })
    assert.equal(detailed.description, `${story.name}正文`)
    assert.equal(detailed.stageLabel, story.requirementType === 'requirement' ? '测试完毕' : '')
  }
})

test('zentao project scope walks executions and tasks', async () => {
  resetZentaoTokens()
  const fetchImpl = async (url) => {
    if (url.endsWith('/tokens')) return json({ token: 'tk2' })
    if (url.endsWith('/user')) return json({ user: { account: 'spring' } })
    if (url.includes('/projects/7/executions')) {
      return json({ total: 1, executions: [{ id: 5, name: 'Sprint 1' }] })
    }
    if (url.includes('/executions/5/tasks')) {
      return json({
        total: 1,
        tasks: [{ id: 31, name: '写接口', assignedTo: 'spring', status: 'done', pri: 1, deadline: '2026-11-10' }],
      })
    }
    throw new Error(`unexpected ${url}`)
  }
  const result = await fetchMyWork({
    baseUrl: 'https://z.example.com/api.php/v1',
    credentials: { account: 'spring', password: 'pw' },
    scope: 'project',
    includeStatusOptions: true,
    containerId: '7',
    containerName: '项目 X',
    fetchImpl,
  })
  assert.deepEqual(result.statusOptions, ['未开始', '进行中', '已完成', '已关闭', '已取消', '已暂停'])
  assert.equal(result.stories.length, 1)
  assert.equal(result.stories[0].id, 'task-31')
  assert.equal(result.stories[0].iterationName, 'Sprint 1')
  assert.equal(result.stories[0].completed, true)
})

test('listTasks wraps provider errors and filters completed items', async () => {
  resetZentaoTokens()
  const fetchImpl = async (url) => {
    if (url.endsWith('/tokens')) return json({ token: 'tk3' })
    if (url.endsWith('/user')) return json({ user: { account: 'spring' } })
    if (url.includes('/products/3/stories')) {
      return json({
        total: 2,
        stories: [
          { id: 1, title: '进行中', assignedTo: 'spring', status: 'doing' },
          { id: 2, title: '已完成', assignedTo: 'spring', status: 'done' },
        ],
      })
    }
    throw new Error(`unexpected ${url}`)
  }
  const result = await listTasks({
    provider: 'zentao',
    settings: { zentao: { baseUrl: 'https://z.example.com', containerId: 3, containerName: 'P' } },
    credentials: { zentao: { account: 'spring', password: 'pw' } },
    excludeCompleted: true,
    fetchImpl,
  })
  assert.equal(result.stories.length, 1)
  assert.equal(result.stories[0].uid, 'zentao:story-1')
  assert.equal(result.ownerFilteredEmpty, false)
  await assert.rejects(
    () => listTasks({ provider: 'zentao', settings: { zentao: { baseUrl: '' } }, credentials: {}, fetchImpl }),
    (error) => error.code === 'zentao/missing-base-url' || error.code === 'zentao/missing-container',
  )
})

test('ZenTao lists all selected containers and deduplicates items shared across them', async () => {
  for (const scope of ['product', 'project']) {
    resetZentaoTokens()
    let userRequests = 0
    const rows = (id) => [
      { id: 31, assignedTo: 'spring' },
      { id: 31 + Number(id), assignedTo: 'spring' },
      { id: 40, assignedTo: 'someone-else' },
    ]
    const fetchImpl = async (url) => {
      const { pathname } = new URL(url)
      if (pathname.endsWith('/tokens')) return json({ token: 'multi' })
      if (pathname.endsWith('/user')) {
        userRequests += 1
        return json({ user: { account: 'spring' } })
      }
      const id = pathname.split('/').at(-2)
      if (scope === 'product' && pathname.endsWith('/stories')) return json({ stories: rows(id) })
      if (scope === 'project' && pathname.endsWith('/executions')) return json({ executions: [{ id, name: `Sprint ${id}` }] })
      if (scope === 'project' && pathname.endsWith('/tasks')) return json({ tasks: rows(id) })
      throw new Error(`unexpected ${url}`)
    }
    const result = await listTasks({
      provider: 'zentao',
      settings: { zentao: {
        baseUrl: 'https://z.example.com',
        scope,
        containerIds: ['1', '2'],
        containerNames: { 1: '产品 A', 2: '产品 B' },
      } },
      credentials: { zentao: { account: 'spring', password: 'pw' } },
      fetchImpl,
    })
    const kind = scope === 'project' ? 'task' : 'story'
    assert.deepEqual(result.stories.map((story) => story.uid), [31, 32, 33].map((id) => `zentao:${kind}-${id}`))
    assert.deepEqual(result.stories.map((story) => story.projectId), ['1', '1', '2'])
    assert.deepEqual(result.iterations, scope === 'project' ? ['Sprint 1', 'Sprint 2'] : ['产品 A', '产品 B'])
    assert.equal(userRequests, 1)
  }
})

test('ZenTao distinguishes unassigned items from completed items hidden by settings', async () => {
  resetZentaoTokens()
  let assignedTo = 'admin'
  const fetchImpl = async (url) => {
    if (url.endsWith('/tokens')) return json({ token: 'tk4' })
    if (url.endsWith('/user')) return json({ data: { profile: { account: 'admin' } } })
    if (url.includes('/products/1/stories')) return json({ stories: [{ id: 1, assignedTo, status: 'closed' }] })
    throw new Error(`unexpected ${url}`)
  }
  const options = {
    provider: 'zentao',
    settings: { zentao: { baseUrl: 'https://z.example.com', containerId: 1 } },
    credentials: { zentao: { account: 'admin', password: 'pw' } },
    fetchImpl,
  }
  const hidden = await listTasks(options)
  assert.deepEqual(hidden.stories, [])
  assert.equal(hidden.ownerFilteredEmpty, false)
  assignedTo = 'other'
  const unassigned = await listTasks(options)
  assert.deepEqual(unassigned.stories, [])
  assert.equal(unassigned.ownerFilteredEmpty, true)
})

test('ZenTao dispatch loads detail text, embedded screenshots and files through the source adapter', async () => {
  resetZentaoTokens()
  const png = Buffer.from('89504e470d0a1a0a', 'hex')
  const pdf = Buffer.from('%PDF-1.7\n')
  const spec = '<p>需求正文</p><img src="{19.png}"><img src="/zentao/file-read-19.png"><img src="data/upload/second.png">'
  const paths = []
  const options = {
    provider: 'zentao',
    settings: { zentao: { baseUrl: 'https://z.example.com/zentao' } },
    credentials: { zentao: { account: 'admin', password: 'app-pw', basicAuth: { account: 'gateway', password: 'gate-pw' } } },
    story: { id: 'story-1', remoteId: '1', name: '示例', source: 'zentao', description: '' },
    fetchImpl: async (url, init) => {
      const path = new URL(url).pathname
      paths.push(path)
      assert.equal(init.headers.authorization, `Basic ${Buffer.from('gateway:gate-pw').toString('base64')}`)
      if (path.endsWith('/tokens')) return json({ token: 'zt-token' })
      assert.equal(init.headers.token, 'zt-token')
      if (path.endsWith('/stories/1')) return json({ id: 1, spec, files: { 19: { id: 19, title: '截图', extension: 'png' }, 20: { id: 20, title: '原型', extension: 'pdf' } } })
      assert.equal(init.redirect, 'error')
      if (path.endsWith('/files/19') || path.endsWith('/data/upload/second.png')) return new Response(png)
      if (path.endsWith('/files/20')) return new Response(pdf, { headers: { 'content-type': 'application/pdf' } })
      throw new Error(`unexpected ${url}`)
    },
  }
  const story = await fetchTask(options)
  const assets = await fetchTaskAssets({ ...options, story })
  assert.equal(story.description, spec)
  assert.equal(paths.filter((path) => path.endsWith('/files/19')).length, 1)
  assert.deepEqual(assets.images.map(({ name, mediaType }) => [name, mediaType]), [['截图.png', 'image/png'], ['禅道图片-2.png', 'image/png']])
  assert.deepEqual(assets.images[0].data, png)
  assert.deepEqual(assets.files, [{ name: '原型.pdf', data: pdf }])

  const original = buildTaskPrompt(options.story, { branch: 'original' }) + '\n\n## 补充要求\n\n只修改后端'
  const refreshed = refreshTaskPrompt(original, story, { attachments: assets.files, images: assets.images })
  assert.match(refreshed, /需求正文/)
  assert.match(refreshed, /截图\.png/)
  assert.match(refreshed, /原型\.pdf/)
  assert.match(refreshed, /只修改后端$/)
  assert.match(refreshed, /original/)
  assert.doesNotMatch(refreshed, /没有填写描述/)

  const before = paths.length
  await assert.rejects(
    () => fetchTaskAssets({ ...options, story: { ...story, description: '<img src="https://elsewhere.example/file-read-19.png">' } }),
    { code: 'zentao/image-failed' },
  )
  assert.equal(paths.length, before)
})
