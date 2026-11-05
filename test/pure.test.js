import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeSettings } from '../lib/store.js'
import {
  appFieldSpec,
  authHeaders,
  buildQuery,
  customFieldSpecs,
  customFieldValue,
  normalizeProject,
  normalizeStory,
  parseCustomFieldOptions,
  shortStoryId,
  storyFieldsFor,
  storyUrl,
} from '../lib/tapd.js'
import { buildTaskPrompt, htmlToText, refreshTaskPrompt, sessionTitleFor } from '../lib/prompt.js'
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

test('normalizeSettings accepts TAPD and ZenTao only', () => {
  assert.equal(normalizeSettings({ provider: 'tapd' }).provider, 'tapd')
  assert.equal(normalizeSettings({ provider: 'zentao' }).provider, 'zentao')
  assert.equal(normalizeSettings({ provider: 'jira' }).provider, 'tapd')
  const legacy = normalizeSettings({ provider: 'gitlab', gitlab: { baseUrl: 'https://old.example.com' }, tapd: { projects: ['42'] } })
  assert.equal(legacy.provider, 'tapd')
  assert.equal('gitlab' in legacy, false)
  assert.deepEqual(legacy.tapd.projects, ['42'])
})

test('normalizeSettings migrates a saved ZenTao selection and cleans up multiple IDs', () => {
  const legacy = normalizeSettings({ zentao: { scope: 'project', containerId: 3, containerName: '项目 A' } }).zentao
  assert.equal(legacy.scope, 'project')
  assert.deepEqual(legacy.containerIds, ['3'])
  assert.deepEqual(legacy.containerNames, { 3: '项目 A' })
  const multiple = normalizeSettings({
    zentao: { ...legacy, containerIds: ['4', 5, '4', 'invalid'], containerNames: { 3: '项目 A', 5: ' 项目 C ' } },
  }).zentao
  assert.deepEqual(multiple.containerIds, ['4', '5'])
  assert.deepEqual(multiple.containerNames, { 5: '项目 C' })
  assert.deepEqual(normalizeSettings({ zentao: { containerId: 3, containerIds: [] } }).zentao.containerIds, [])
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

test('buildTaskPrompt keeps execution context and omits management fields', () => {
  const prompt = buildTaskPrompt(
    {
      id: '101', name: '导出报表', description: '<b>需要</b> CSV', status: 'planning', owner: '张三', url: 'https://x',
      priorityLabel: 'P3', iterationName: '迭代一', begin: '2026-11-04', due: '2026-11-05', app: '客户端',
    },
    { branch: 'issue_101', baseBranch: 'new_test', worktreePath: '/tmp/wt' },
  )
  assert.match(prompt, /^# TAPD需求 #101：导出报表/)
  assert.match(prompt, /需求地址：https:\/\/x/)
  assert.match(prompt, /关联应用：客户端/)
  assert.match(prompt, /\/tmp\/wt/)
  assert.match(prompt, /issue_101/)
  assert.match(prompt, /new_test/)
  assert.match(prompt, /需要 CSV/)
  assert.match(prompt, /不要执行 push/)
  assert.doesNotMatch(prompt, /<b>/)
  assert.doesNotMatch(prompt, /处理人|状态|优先级|迭代|开始：|截止：|张三|planning|2026-11-04/)
  assert.ok(prompt.indexOf('## 需求内容') < prompt.indexOf('## 工作环境'))
  assert.ok(prompt.indexOf('## 工作环境') < prompt.indexOf('## 执行要求'))
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
  assert.match(prompt, /^# TAPD需求 #1004334：后端-客户端新增批量导出附件功能/)
  assert.match(prompt, /父需求：1004297/)
  assert.match(prompt, /父需求：1004297 客户端新增批量导出附件功能/)
  assert.match(prompt, /issue_1004297/)
})

test('buildTaskPrompt falls back when the description is empty', () => {
  const prompt = buildTaskPrompt({ id: '7', name: '空需求', description: '' }, { branch: 'issue_7' })
  assert.match(prompt, /（TAPD 上没有填写描述/)
  assert.match(prompt, /提出需要澄清的问题/)
})

test('buildTaskPrompt preserves long descriptions and only lists supplied assets', () => {
  const description = '需求原文'.repeat(2000) + '验收条件：完成导出'
  const prompt = buildTaskPrompt(
    { source: 'zentao', requirementType: 'requirement', id: '4', name: '测试用户需求', description },
    { repoRoot: '/work/repo', attachments: [{ name: '入仓单.xlsx' }, null], images: [{ name: '截图.jpg' }] },
  )
  assert.match(prompt, /^# 禅道用户需求 #4：测试用户需求/)
  assert.ok(prompt.includes(description))
  assert.match(prompt, /- 附件：入仓单.xlsx/)
  assert.match(prompt, /- 图片：截图.jpg/)
  assert.match(prompt, /- 仓库：`\/work\/repo`/)
  assert.doesNotMatch(prompt, /已随本条消息发送|工作分支：|对比基线：/)
  assert.doesNotMatch(buildTaskPrompt({ id: '1' }), /## 参考资料|工作分支：|对比基线：/)
})

test('refreshTaskPrompt updates new and legacy drafts repeatedly while preserving surrounding edits', () => {
  const suffix = '\n\n## 补充要求\n\n只修改后端'
  const current = buildTaskPrompt({ id: '1', name: '原始标题', description: '旧正文' }, { branch: 'original' }) + suffix
  const legacy = '自定义开头\n\n## 需求描述\n旧正文\n\n## 附件\n- old.pdf' +
    '\n\n## 工作方式\n1. 先读需求、再看仓库现状（相关模块、已有约定、测试）' + suffix
  for (const draft of [current, legacy]) {
    const refreshed = refreshTaskPrompt(draft, { description: '最新正文' }, { attachments: [{ name: 'new.pdf' }] })
    assert.match(refreshed, /最新正文/)
    assert.match(refreshed, /- 附件：new.pdf/)
    assert.doesNotMatch(refreshed, /旧正文|old.pdf/)
    assert.ok(refreshed.endsWith(suffix))
    assert.equal(refreshTaskPrompt(refreshed, { description: '最新正文' }, { attachments: [{ name: 'new.pdf' }] }), refreshed)
    const boundary = draft.includes('## 工作环境') ? '\n\n## 工作环境' : '\n\n## 工作方式'
    assert.equal(refreshed.slice(refreshed.indexOf(boundary)), draft.slice(draft.indexOf(boundary)))
    assert.equal(refreshed.split('\n\n## 需求内容')[0], draft.split(/\n\n## 需求(?:内容|描述)/)[0])
  }
})

test('refreshTaskPrompt preserves a custom draft when generated boundaries are absent', () => {
  const custom = '用户自行编写的要求\n\n## 补充要求\n仅分析'
  const refreshed = refreshTaskPrompt(custom, { description: '最新正文' })
  assert.ok(refreshed.startsWith(custom + '\n\n'))
  assert.match(refreshed, /最新正文/)
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

test('TAPD custom field settings resolve the 应用 field and its labels', () => {
  const specs = customFieldSpecs({
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
      {
        CustomFieldConfig: {
          custom_field: 'custom_field_101',
          name: '停用的字段',
          type: 'text',
          options: '',
          enabled: '0',
        },
      },
      // Non custom_field_* entries come from other feature areas.
      { CustomFieldConfig: { custom_field: 'iteration_id', name: '迭代', enabled: '1' } },
    ],
  })
  assert.equal(specs.length, 1)
  const app = appFieldSpec(specs)
  assert.equal(app.field, 'custom_field_100')
  assert.deepEqual([...parseCustomFieldOptions('{"1":"德速TMS2.0客户端"}')], [['1', '德速TMS2.0客户端']])
  assert.equal(storyFieldsFor(specs).includes('custom_field_100'), true)

  // A label column wins; a bare option key is translated through the config.
  assert.equal(customFieldValue({ custom_field_100_label: '德速TMS' }, app), '德速TMS')
  assert.equal(customFieldValue({ custom_field_100: '2' }, app), '德速TMS')
  assert.equal(customFieldValue({ custom_field_100: '1,2' }, app), '德速TMS2.0客户端, 德速TMS')
  assert.equal(customFieldValue({}, app), '')
  assert.equal(customFieldValue({ custom_field_100: '9' }, app), '9')
})

test('normalizeStory carries the application into the story snapshot', () => {
  const specs = customFieldSpecs({
    data: [
      {
        CustomFieldConfig: {
          custom_field: 'custom_field_100',
          name: '所属应用',
          type: 'select',
          options: '{"1":"德速TMS2.0客户端"}',
          enabled: '1',
        },
      },
    ],
  })
  const story = normalizeStory(
    { id: '1168200255001004297', name: '导出附件', workspace_id: '68200255', custom_field_100: '1' },
    '68200255',
    specs,
  )
  assert.equal(story.app, '德速TMS2.0客户端')
  // Without specs (endpoint unavailable) the field is simply absent.
  assert.equal(normalizeStory({ id: '1168200255001004297', name: '导出附件' }, '68200255').app, '')
})
