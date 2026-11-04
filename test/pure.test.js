import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeSettings } from '../lib/store.js'
import { authHeaders, buildQuery, normalizeStory, normalizeProject, shortStoryId, storyUrl } from '../lib/tapd.js'
import { buildTaskPrompt, htmlToText, sessionTitleFor } from '../lib/prompt.js'
import { worktreePathFor } from '../lib/dispatch.js'

test('normalizeSettings fills defaults and dedupes projects', () => {
  const settings = normalizeSettings({ tapd: { projects: '100, 200,200,abc' } })
  assert.equal(settings.provider, 'tapd')
  assert.deepEqual(settings.tapd.projects, ['100', '200'])
  assert.equal(settings.useWorktree, true)
  assert.equal(settings.excludeCompleted, true)
  assert.equal(settings.tapd.apiUser, '')
  assert.equal(settings.tapd.authMode, 'token')
  assert.equal(settings.tapd.nick, '')
  assert.deepEqual(settings.tapd.projectNames, {})
  assert.deepEqual(settings.zentao.scope, 'product')
})

test('normalizeSettings keeps auth mode, nick and project names', () => {
  const settings = normalizeSettings({
    tapd: { authMode: 'basic', nick: ' spring.wang ', projectNames: { 68200255: '默认项目', abc: 'x' } },
  })
  assert.equal(settings.tapd.authMode, 'basic')
  assert.equal(settings.tapd.nick, 'spring.wang')
  assert.deepEqual(settings.tapd.projectNames, { 68200255: '默认项目' })
  assert.equal(normalizeSettings({ tapd: { authMode: 'weird' } }).tapd.authMode, 'token')
})

test('normalizeSettings migrates the legacy flat TAPD shape', () => {
  const settings = normalizeSettings({
    apiUser: 'spring.wang@deksu.com',
    owner: '王如涛',
    projects: '68200255',
    branchPrefix: 'issue_',
    authMode: 'basic',
  })
  assert.equal(settings.tapd.apiUser, 'spring.wang@deksu.com')
  assert.equal(settings.tapd.owner, '王如涛')
  assert.deepEqual(settings.tapd.projects, ['68200255'])
  assert.equal(settings.tapd.authMode, 'basic')
})

test('normalizeSettings accepts the three providers only', () => {
  assert.equal(normalizeSettings({ provider: 'gitlab' }).provider, 'gitlab')
  assert.equal(normalizeSettings({ provider: 'zentao' }).provider, 'zentao')
  assert.equal(normalizeSettings({ provider: 'jira' }).provider, 'tapd')
  assert.equal(
    normalizeSettings({ zentao: { scope: 'project', containerId: 3 } }).zentao.containerId,
    '3',
  )
  assert.equal(normalizeSettings({ gitlab: { baseUrl: '  ' } }).gitlab.baseUrl, 'https://gitlab.com')
})

test('authHeaders prefers the personal token over basic credentials', () => {
  assert.deepEqual(authHeaders({ token: ' abc ', apiUser: 'u', apiPassword: 'p' }), {
    authorization: 'Bearer abc',
  })
  assert.match(authHeaders({ apiUser: 'u', apiPassword: 'p' }).authorization, /^Basic /)
  assert.throws(() => authHeaders({}), /尚未配置/)
})

test('normalizeProject maps workspace rows', () => {
  assert.deepEqual(normalizeProject({ id: 68200255, name: '默认项目', category: 'project' }), {
    id: '68200255',
    name: '默认项目',
    category: 'project',
    status: '',
  })
  assert.equal(normalizeProject({ name: 'no id' }), null)
})

test('normalizeSettings keeps explicit booleans and strings', () => {
  const settings = normalizeSettings({
    useWorktree: false,
    excludeCompleted: false,
    tapd: { owner: ' 张三 ', apiUser: ' api ' },
  })
  assert.equal(settings.useWorktree, false)
  assert.equal(settings.excludeCompleted, false)
  assert.equal(settings.tapd.owner, '张三')
  assert.equal(settings.tapd.apiUser, 'api')
})

test('buildQuery skips empties and repeats arrays', () => {
  assert.equal(buildQuery({ a: '', b: 2, c: null }), 'b=2')
  assert.equal(buildQuery({ id: ['1', '2'] }), 'id=1&id=2')
  assert.equal(buildQuery({ owner: '张 三' }), 'owner=%E5%BC%A0+%E4%B8%89')
})

test('normalizeStory maps TAPD rows and builds a web url', () => {
  const story = normalizeStory(
    { id: 42, name: '登录改造', workspace_id: 1001, status: 'planning', priority_label: 'High', description: '<p>hi</p>' },
    1001,
  )
  assert.equal(story.id, '42')
  assert.equal(story.name, '登录改造')
  assert.equal(story.projectId, '1001')
  assert.equal(story.priorityLabel, 'High')
  assert.equal(story.url, 'https://www.tapd.cn/1001/prong/stories/view/42')
  assert.equal(storyUrl('1001', '42'), story.url)
})

test('shortStoryId strips the TAPD workspace prefix', () => {
  assert.equal(shortStoryId('1168200255001004297', '68200255'), '1004297')
  assert.equal(shortStoryId('1168200255001004297', '31003251'), '1168200255001004297')
  assert.equal(shortStoryId('42', '68200255'), '42')
  assert.equal(shortStoryId('', '68200255'), '')
})

test('normalizeStory exposes the short id used by branches', () => {
  const story = normalizeStory({ id: '1168200255001004297', name: '导出', workspace_id: '68200255' }, '68200255')
  assert.equal(story.id, '1168200255001004297')
  assert.equal(story.shortId, '1004297')
})

test('normalizeStory resolves the root requirement for child stories', () => {
  const child = normalizeStory(
    { id: '1168200255001004334', name: '后端-导出', parent_id: '1168200255001004297', ancestor_id: '1168200255001004297', level: '1', workspace_id: '68200255' },
    '68200255',
  )
  assert.equal(child.rootId, '1168200255001004297')
  assert.equal(child.rootShortId, '1004297')
  assert.equal(child.parentId, '1168200255001004297')

  const root = normalizeStory(
    { id: '1168200255001004297', name: '导出', parent_id: '0', ancestor_id: '1168200255001004297', level: '0', workspace_id: '68200255' },
    '68200255',
  )
  assert.equal(root.rootId, '1168200255001004297')
  assert.equal(root.rootShortId, '1004297')
  assert.equal(root.parentId, '')
})

test('normalizeStory rejects rows without an id', () => {
  assert.equal(normalizeStory({ name: 'no id' }, 1), null)
  assert.equal(normalizeStory(null, 1), null)
})

test('htmlToText strips markup, decodes entities and keeps bullets', () => {
  const text = htmlToText('<div><p>第一段&nbsp;内容</p><ul><li>要点一</li><li>要点二</li></ul><br/><p>结束 &#39;ok&#39;</p></div>')
  assert.match(text, /第一段 内容/)
  assert.match(text, /- 要点一/)
  assert.match(text, /结束 'ok'/)
  assert.doesNotMatch(text, /<[a-z]/i)
})

test('buildTaskPrompt carries story fields, branch and guardrails', () => {
  const prompt = buildTaskPrompt(
    { id: '101', name: '导出报表', description: '<b>需要</b> CSV', status: 'planning', owner: '张三', url: 'https://x' },
    { branch: 'issue_101', baseBranch: 'new_test', worktreePath: '/tmp/wt' },
  )
  assert.match(prompt, /需求 101：导出报表/)
  assert.match(prompt, /\/tmp\/wt/)
  assert.match(prompt, /issue_101/)
  assert.match(prompt, /new_test/)
  assert.match(prompt, /需要 CSV/)
  assert.match(prompt, /不要执行 push/)
  assert.doesNotMatch(prompt, /<b>/)
})

test('buildTaskPrompt names both the parent requirement and the child story', () => {
  const prompt = buildTaskPrompt(
    {
      id: '1168200255001004334',
      shortId: '1004334',
      rootShortId: '1004297',
      rootName: '客户端新增批量导出附件功能',
      name: '后端-客户端新增批量导出附件功能',
      description: '',
    },
    { branch: 'issue_1004297' },
  )
  assert.match(prompt, /需求 1004297（客户端新增批量导出附件功能）下的子需求 1004334/)
  assert.match(prompt, /父需求：1004297/)
  assert.match(prompt, /issue_1004297/)
})

test('buildTaskPrompt falls back when the description is empty', () => {
  const prompt = buildTaskPrompt({ id: '7', name: '空需求', description: '' }, { branch: 'issue_7' })
  assert.match(prompt, /（TAPD 上没有填写描述/)
})

test('sessionTitleFor prefixes the branch and caps the length', () => {
  assert.equal(sessionTitleFor({ id: '1', name: '短' }, { branch: 'issue_1' }), 'issue_1 · 短')
  const long = sessionTitleFor({ id: '2', name: 'x'.repeat(200) }, { branch: 'issue_2' })
  assert.equal(long.length, 78)
})

test('worktreePathFor places the checkout beside the repo', () => {
  assert.equal(
    worktreePathFor('/work/TMS2.0', 'issue_100'),
    '/work/.dsh-worktrees/TMS2.0-issue_100',
  )
})
