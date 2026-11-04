import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchMyIssues, fetchIssueAssets, apiRoot as gitlabRoot } from '../lib/gitlab.js'
import { fetchMyWork, apiRoot as zentaoRoot, resetZentaoTokens } from '../lib/zentao.js'
import { listTasks, providerOf, uidOf } from '../lib/sources.js'

function json(body, headers = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers })
}

test('uidOf and providerOf keep sources apart', () => {
  assert.equal(uidOf('zentao', 'task-3'), 'zentao:task-3')
  assert.equal(providerOf({ provider: 'gitlab' }), 'gitlab')
  assert.equal(providerOf({}), 'tapd')
  assert.equal(providerOf({ provider: 'nope' }), 'tapd')
})

test('gitlab lists project issues assigned to me', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, headers: init.headers })
    if (url.includes('page=1')) {
      return json(
        [
          {
            iid: 12,
            project_id: 77,
            title: '导出订单',
            description: '把订单导出为 CSV',
            state: 'opened',
            labels: ['P1', 'backend'],
            milestone: { id: 3, title: 'v1.2', due_date: '2026-11-20' },
            assignees: [{ name: '王如涛' }],
            author: { name: '李四' },
            web_url: 'https://gitlab.example.com/group/app/-/issues/12',
            updated_at: '2026-11-01T08:00:00Z',
          },
        ],
        { 'x-next-page': '' },
      )
    }
    return json([])
  }
  const result = await fetchMyIssues({
    baseUrl: 'https://gitlab.example.com',
    token: 'secret',
    projectPath: 'group/app',
    fetchImpl,
  })
  assert.equal(
    calls[0].url,
    'https://gitlab.example.com/api/v4/projects/group%2Fapp/issues?scope=assigned_to_me&state=opened&per_page=100&page=1&order_by=updated_at',
  )
  assert.equal(calls[0].headers['private-token'], 'secret')
  assert.equal(result.stories.length, 1)
  const story = result.stories[0]
  assert.equal(story.id, 'issue-77-12')
  assert.equal(story.uid, undefined)
  assert.equal(story.shortId, '#12')
  assert.equal(story.kind, 'issue')
  assert.equal(story.vStatus, '打开')
  assert.equal(story.completed, false)
  assert.equal(story.iterationName, 'v1.2')
  assert.equal(story.due, '2026-11-20')
  assert.equal(story.priorityLabel, 'P1')
  assert.deepEqual(story.labels, ['P1', 'backend'])
})

test('gitlab follows x-next-page', async () => {
  const pages = []
  const fetchImpl = async (url) => {
    pages.push(url)
    const page = Number(new URL(url).searchParams.get('page'))
    if (page === 1) return json([{ iid: 1 }], { 'x-next-page': '2' })
    return json([{ iid: 2 }], { 'x-next-page': '' })
  }
  const result = await fetchMyIssues({ baseUrl: 'https://gitlab.example.com/api/v4', token: 't', fetchImpl })
  assert.equal(pages.length, 2)
  assert.equal(pages[0].includes('/api/v4/issues?'), true)
  assert.equal(result.stories.length, 2)
})

test('gitlab downloads description uploads', async () => {
  const description = [
    '截图：![shot](/uploads/aaa/shot.png)',
    '日志：[app.log](/uploads/bbb/app.log)',
  ].join('\n')
  const fetchImpl = async (url) => {
    if (url.endsWith('.png')) {
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } })
    }
    return new Response(new Uint8Array([4, 5]), { headers: { 'content-type': 'text/plain' } })
  }
  const result = await fetchIssueAssets({
    description,
    baseUrl: 'https://gitlab.example.com',
    token: 't',
    fetchImpl,
  })
  assert.equal(result.images.length, 1)
  assert.equal(result.images[0].name, 'shot.png')
  assert.equal(result.images[0].mediaType, 'image/png')
  assert.equal(result.files.length, 1)
  assert.equal(result.files[0].name, 'app.log')
  assert.equal(result.skipped, 0)
})

test('zentao apiRoot normalises base urls', () => {
  assert.equal(zentaoRoot('https://z.example.com'), 'https://z.example.com/api.php/v1')
  assert.equal(zentaoRoot('https://z.example.com/api.php'), 'https://z.example.com/api.php/v1')
  assert.equal(zentaoRoot('https://z.example.com/api.php/v1/'), 'https://z.example.com/api.php/v1')
  assert.equal(gitlabRoot('https://gitlab.example.com'), 'https://gitlab.example.com/api/v4')
})

test('zentao lists product stories assigned to the signed-in user', async () => {
  resetZentaoTokens()
  const seen = []
  const fetchImpl = async (url, init) => {
    seen.push({ url, headers: init.headers, body: init.body })
    if (url.endsWith('/api.php/v1/tokens')) return json({ token: 'tk' })
    if (url.endsWith('/api.php/v1/user')) return json({ user: { account: 'spring' } })
    if (url.includes('/products/9/stories')) {
      return json({
        total: 2,
        stories: [
          { id: 1, title: '支持导出', assignedTo: { account: 'spring' }, status: 'doing', pri: 2, spec: 'CSV' },
          { id: 2, title: '别人的', assignedTo: { account: 'other' }, status: 'wait', pri: 3 },
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
  assert.equal(seen[1].headers.token, 'tk')
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
    containerId: '7',
    containerName: '项目 X',
    fetchImpl,
  })
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
  await assert.rejects(
    () => listTasks({ provider: 'zentao', settings: { zentao: { baseUrl: '' } }, credentials: {}, fetchImpl }),
    (error) => error.code === 'zentao/missing-base-url' || error.code === 'zentao/missing-container',
  )
})
