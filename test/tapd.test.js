/**
 * Network-facing TAPD client tests: the personal token path, project listing
 * and iteration enrichment, all against a scripted fetch.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractImagePaths,
  fetchMyStories,
  fetchStoriesByIds,
  fetchStoryImages,
  listProjects,
  requestJson,
} from '../lib/tapd.js'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** A fetch that answers from a path -> body map and records every request. */
function scriptedFetch(routes) {
  const calls = []
  const fetchImpl = async (url, init = {}) => {
    const parsed = new URL(String(url))
    const path = parsed.pathname.replace(/^\/+/, '')
    calls.push({ path, query: Object.fromEntries(parsed.searchParams), headers: init.headers ?? {} })
    const route = routes[path]
    if (typeof route === 'function') return route(parsed, init)
    if (!route) return jsonResponse({ status: 404, info: 'not found' }, 404)
    return jsonResponse(route)
  }
  return { fetchImpl, calls }
}

test('requestJson authenticates with a bearer token', async () => {
  const { fetchImpl, calls } = scriptedFetch({ stories: { status: 1, data: [] } })
  const body = await requestJson('stories', { workspace_id: '1' }, { token: 'tok-123' }, { fetchImpl })
  assert.equal(body.status, 1)
  assert.equal(calls[0].headers.authorization, 'Bearer tok-123')
  assert.equal(calls[0].path, 'stories')
})

test('requestJson falls back to basic auth when the token is rejected', async () => {
  const calls = []
  const fetchImpl = async (url, init = {}) => {
    calls.push(init.headers?.authorization ?? '')
    if (calls.length === 1) return jsonResponse({ status: 401 }, 401)
    return jsonResponse({ status: 1, data: [] })
  }
  await requestJson('stories', {}, { token: 'bad', apiUser: 'u', apiPassword: 'p' }, { fetchImpl })
  assert.match(calls[1], /^Basic /)
})

test('requestJson reports a friendly auth error when every mode fails', async () => {
  const fetchImpl = async () => jsonResponse({ status: 401, info: '401 Unauthorized' }, 401)
  await assert.rejects(
    () => requestJson('stories', {}, { token: 'bad' }, { fetchImpl }),
    (error) => error.code === 'tapd/auth-failed',
  )
})

test('listProjects excludes TAPD organizations and keeps project collaboration entries', async () => {
  const { fetchImpl, calls } = scriptedFetch({
    'workspaces/user_participant_projects': {
      status: 1,
      data: [
        { Workspace: { id: '31003251', name: '德速', category: 'organization' } },
        { Workspace: { id: '68200255', name: '默认项目', category: 'project' } },
        { Workspace: { id: '755', name: '协作项目', category: 'product' } },
      ],
    },
  })
  const result = await listProjects({ credentials: { token: 't' }, nick: 'spring.wang', fetchImpl })
  assert.equal(calls[0].query.nick, 'spring.wang')
  assert.deepEqual(result.projects.map((project) => project.id), ['68200255', '755'])
})

test('listProjects needs a nick', async () => {
  await assert.rejects(
    () => listProjects({ credentials: { token: 't' } }),
    (error) => error.code === 'tapd/missing-nick',
  )
})

test('fetchMyStories adds Chinese status and iteration names', async () => {
  const { fetchImpl, calls } = scriptedFetch({
    'stories/custom_fields_settings': {
      status: 1,
      data: [
        {
          CustomFieldConfig: {
            custom_field: 'custom_field_100',
            name: '应用',
            type: 'select',
            options: '{"1":"德速TMS2.0客户端","2":"德速TMS"}',
            enabled: '1',
          },
        },
      ],
    },
    stories: {
      status: 1,
      data: [
        {
          Story: {
            id: '1168200255001004351',
            name: '后端-卡航合单',
            status: 'planning',
            v_status: '新建(需求设计中)',
            custom_field_100: '1',
            owner: '王如涛;',
            iteration_id: '1168200255001000146',
            priority_label: '紧急',
          },
        },
      ],
    },
    iterations: {
      status: 1,
      data: [
        {
          Iteration: {
            id: '1168200255001000146',
            name: '整柜MVP 3',
            status: 'open',
            startdate: '2026-08-26',
            enddate: '2026-09-23',
          },
        },
      ],
    },
  })
  const result = await fetchMyStories({
    credentials: { token: 't' },
    projects: ['68200255'],
    owner: '王如涛',
    excludeCompleted: false,
    fetchImpl,
  })
  assert.equal(result.stories.length, 1)
  assert.equal(result.stories[0].vStatus, '新建(需求设计中)')
  assert.equal(result.stories[0].iterationName, '整柜MVP 3')
  assert.equal(result.stories[0].app, '德速TMS2.0客户端')
  assert.ok(calls.some((call) => call.path === 'stories/custom_fields_settings'))
  assert.ok(calls.find((call) => call.path === 'stories').query.fields.includes('custom_field_100'))
  assert.equal(result.iterations[0].name, '整柜MVP 3')
  assert.ok(calls.some((call) => call.path === 'iterations'))
  assert.equal(calls.find((call) => call.path === 'stories').query.with_v_status, '1')
})

test('fetchStoriesByIds sends one comma separated id list', async () => {
  const { fetchImpl, calls } = scriptedFetch({
    stories: {
      status: 1,
      data: [
        { Story: { id: '1168200255001004297', name: '父需求', workspace_id: '68200255', parent_id: '0' } },
        { Story: { id: '1168200255001004342', name: '卡航合单', workspace_id: '68200255', parent_id: '0' } },
      ],
    },
  })
  const roots = await fetchStoriesByIds({
    credentials: { token: 't' },
    projectId: '68200255',
    ids: ['1168200255001004297', '1168200255001004342'],
    fetchImpl,
  })
  assert.equal(calls[0].query.id, '1168200255001004297,1168200255001004342')
  assert.equal(roots.get('1168200255001004297').shortId, '1004297')
})

test('extractImagePaths keeps TAPD captures from a description', () => {
  const html = [
    '<p>背景</p>',
    '<p><img src="/tfl/captures/2026-10/a.png" width="80%" /></p>',
    "<p><img alt='x' src='https://www.tapd.cn/tfl/captures/2026-10/b.jpg'></p>",
    '<img src="data:image/png;base64,AAAA">',
    '<img src="/static/logo.svg">',
  ].join('')
  assert.deepEqual(extractImagePaths(html), [
    '/tfl/captures/2026-10/a.png',
    'https://www.tapd.cn/tfl/captures/2026-10/b.jpg',
  ])
})

test('fetchStoryImages resolves image links and returns bytes plus media type', async () => {
  const { fetchImpl, calls } = scriptedFetch({
    'files/get_image': {
      status: 1,
      data: {
        Attachment: {
          download_url: 'https://file.tapd.cn/attachments/tmp_download/x?salt=1&time=2',
        },
      },
    },
    'attachments/tmp_download/x': (parsed) =>
      new Response(Buffer.from('PNGDATA'), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
  })
  const images = await fetchStoryImages({
    credentials: { token: 't' },
    projectId: '68200255',
    description: '<p><img src="/tfl/captures/2026-10/a.png"/></p>',
    fetchImpl,
  })
  assert.equal(images.length, 1)
  assert.equal(images[0].name, 'a.png')
  assert.equal(images[0].mediaType, 'image/png')
  assert.equal(Buffer.from(images[0].data).toString(), 'PNGDATA')
  const call = calls.find((entry) => entry.path === 'files/get_image')
  assert.equal(call.query.workspace_id, '68200255')
  assert.equal(call.query.image_path, '/tfl/captures/2026-10/a.png')
})

test('fetchStoryImages merges descriptions without duplicating a screenshot', async () => {
  const asked = []
  const fetchImpl = async (url) => {
    const parsed = new URL(String(url))
    if (parsed.pathname.endsWith('/files/get_image')) {
      asked.push(parsed.searchParams.get('image_path'))
      return jsonResponse({
        status: 1,
        data: {
          Attachment: {
            download_url: `https://file.tapd.cn/dl/${encodeURIComponent(parsed.searchParams.get('image_path'))}`,
          },
        },
      })
    }
    return new Response(Buffer.from('PNGDATA'), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    })
  }
  const images = await fetchStoryImages({
    credentials: { token: 't' },
    projectId: '68200255',
    descriptions: [
      '<p><img src="/tfl/captures/child-a.png"/><img src="/tfl/captures/shared.png"/></p>',
      '<p><img src="/tfl/captures/shared.png"/><img src="/tfl/captures/parent-b.png"/></p>',
    ],
    limit: 2,
    fetchImpl,
  })
  assert.deepEqual(asked, ['/tfl/captures/child-a.png', '/tfl/captures/shared.png'])
  assert.deepEqual(
    images.map((image) => image.name),
    ['child-a.png', 'shared.png'],
  )
})

test('fetchStoryImages fails loudly when no download link comes back', async () => {
  const fetchImpl = async () => jsonResponse({ status: 1, data: { Attachment: {} } })
  await assert.rejects(
    () =>
      fetchStoryImages({
        credentials: { token: 't' },
        projectId: '1',
        description: '<img src="/tfl/captures/a.png">',
        fetchImpl,
      }),
    (error) => error.code === 'tapd/image-failed',
  )
})
