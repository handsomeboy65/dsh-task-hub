import assert from 'node:assert/strict'
import test from 'node:test'

function fakeReact() {
  const createElement = (type, props, ...children) => ({
    type,
    props: { ...(props ?? {}), ...(children.length ? { children: children.length === 1 ? children[0] : children } : {}) },
  })
  return {
    createElement,
    Fragment: 'fragment',
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
  }
}

function render(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(render).join('')
  if (typeof node.type === 'function') return render(node.type({ ...node.props, children: node.props.children }))
  const children = node.props?.children
  return `<${node.type}>${Array.isArray(children) ? children.map(render).join('') : render(children)}</${node.type}>`
}

test('client registers a main panel and a sidebar icon that both render', async () => {
  let captured
  globalThis.window = { __ModuleLoader__: { load: (bundle) => { captured = bundle } } }

  const React = fakeReact()
  await import('../lib/client.js')
  globalThis.__taskHubBundle = captured
  assert.ok(captured, 'client bundle was not registered')
  assert.equal(captured.id, 'dsh-task-hub')

  const client = captured.factory((name) => {
    if (name === 'react') return React
    throw new Error(`unexpected module: ${name}`)
  })

  const registered = []
  const ctx = {
    effect: (fn) => {
      fn()
    },
    on: () => {},
    get: () => undefined,
    locale: {
      register: () => {},
      bind: () => (key) => key,
    },
    slots: {
      inject: (_slot, register) => register(),
      register: (spec, component) => {
        registered.push({ spec, component })
        return () => {}
      },
    },
  }
  client.apply(ctx)

  const main = registered.find((entry) => entry.spec.name === 'main')
  const icon = registered.find((entry) => entry.spec.name === 'sidebar.panellist')
  assert.ok(main, 'main panel not registered')
  assert.equal(main.spec.key, 'task-hub')
  assert.ok(icon, 'sidebar icon not registered')
  assert.equal(icon.spec.order, 25)

  const markup = render(main.component({ t: (key) => key, openSession: () => {} }))
  assert.match(markup, /title/)
  assert.match(markup, /subtitle/)
  assert.match(markup, /settings/)
  const sources = expand(main.component({ t: (key) => key, openSession: () => {} }))
    .find((node) => node.props?.className === 'tt-tabs tt-sources')
  assert.deepEqual(sources.props.children.map((node) => node.props.children), ['providerTapd', 'providerZentao'])

  const iconMarkup = render(icon.component({ size: 20, active: false }))
  assert.match(iconMarkup, /svg/)

  const { buildGroups, StoryRow } = client.__test
  const groups = buildGroups(
    [
      { id: '1', name: 'old', iterationName: '迭代A' },
      { id: '2', name: 'none', iterationName: '' },
      { id: '3', name: 'new', iterationName: '迭代B' },
    ],
    [
      { name: '迭代B', startdate: '2026-11-12', enddate: '2026-11-18' },
      { name: '迭代A', startdate: '2026-01-01', enddate: '2026-01-07' },
    ],
  )
  assert.deepEqual(groups.map((group) => group.name), ['迭代B', '迭代A', ''])
  assert.deepEqual(groups[0].range, ['2026-11-12', '2026-11-18'])

  const rowNode = StoryRow({
    t: (key) => key,
    story: {
      id: '1168200255001004351',
      name: '后端-卡航合单',
      vStatus: '新建(需求设计中)',
      owner: '王如涛;',
      url: 'https://x',
      app: '德速TMS2.0操作端, 德速TMS',
    },
    showApp: true,
    onDispatch: () => {},
    onOpen: () => {},
  })
  const rowMarkup = render(rowNode)
  assert.match(rowMarkup, /1168200255001004351/)
  assert.match(rowMarkup, /新建\(需求设计中\)/)
  // 应用 is its own first column, split into one chip per app, before the ID cell.
  assert.equal(rowNode.props.children[0].props.className, 'tt-sapp')
  assert.equal(rowNode.props.children[0].props.children.length, 2)
  assert.ok(
    rowMarkup.indexOf('德速TMS2.0操作端') < rowMarkup.indexOf('1168200255001004351'),
    'app column must precede the id column',
  )

  // Sources without an 应用 custom field (禅道) drop the whole column.
  const plainRow = StoryRow({ t: (key) => key, story: { id: '9', name: '无应用' }, onDispatch: () => {}, onOpen: () => {} })
  assert.equal(plainRow.props.className, 'tt-srow tt-noapp')
  assert.equal(plainRow.props.children.filter(Boolean).length, 5)
  assert.equal(plainRow.props.children.filter(Boolean)[0].props.className, 'tt-sid')

  const existingTapdRow = render(
    StoryRow({
      t: (key) => key,
      story: {
        id: '1168200255001004331',
        source: 'tapd',
        name: '前端-SKU管理新增型号字段',
        dispatch: { sessionId: 'session-old', attachments: [], images: [] },
      },
      onDispatch: () => {},
      onOpen: () => {},
      onBackfill: () => {},
      backfilling: '',
    }),
  )
  assert.match(existingTapdRow, /openShort/)
  assert.doesNotMatch(existingTapdRow, /backfill/)

  const carriedRow = render(
    StoryRow({
      t: (key) => key,
      story: {
        id: '1168200255001004331',
        name: '前端-SKU管理新增型号字段',
        dispatch: { sessionId: 'session-old', attachments: [{ name: '原型.html' }], images: [] },
      },
      onDispatch: () => {},
      onOpen: () => {},
      onBackfill: () => {},
      backfilling: '',
    }),
  )
  assert.doesNotMatch(carriedRow, /backfill/)
  const oldZentaoRow = render(StoryRow({
    t: (key) => key,
    story: {
      id: 'story-1',
      source: 'zentao',
      name: '旧草稿',
      dispatch: { sessionId: 'session-old', draft: { text: '需求正文' } },
    },
    onOpen: () => {},
    onBackfill: () => {},
  }))
  assert.match(oldZentaoRow, /refreshDraft/)
})

test('opening a session resolves the service per click and explains failures', async () => {
  let captured
  globalThis.window = { __ModuleLoader__: { load: (bundle) => { captured = bundle } } }
  const React = fakeReact()
  await import('../lib/client.js')
  const client = (captured ?? globalThis.__taskHubBundle).factory((name) => {
    if (name === 'react') return React
    throw new Error(`unexpected module: ${name}`)
  })

  const registered = []
  // Mirrors the dynamic Client ctx facade: reading an undeclared service
  // property throws (the real guard also reports a failure), so a lookup that
  // starts with `ctx.uiWorkspace` never reaches `ctx.get()`.
  const makeCtx = (services) => {
    const target = {
      effect: (fn) => {
        fn()
      },
      on: () => {},
      get: (name) => services[name],
      locale: { register: () => {}, bind: () => (key) => key },
      slots: {
        inject: (_slot, register) => register(),
        register: (spec, component) => {
          registered.push({ spec, component })
          return () => {}
        },
      },
    }
    return new Proxy(target, {
      get(object, prop) {
        if (typeof prop === 'string' && !(prop in object)) {
          throw new Error(`service "${prop}" is not declared by your plugin`)
        }
        return Reflect.get(object, prop)
      },
    })
  }

  // No ui-workspace at apply time: the click must report the missing service.
  registered.length = 0
  client.apply(makeCtx({}))
  const missing = registered.find((entry) => entry.spec.name === 'main').spec.inject()
  assert.deepEqual(await missing.openSession('session-1'), { ok: false, reason: 'service' })

  // A service that registers after apply() must still be picked up per click.
  const opened = []
  const archived = []
  const late = {}
  registered.length = 0
  client.apply(makeCtx(late))
  const lazy = registered.find((entry) => entry.spec.name === 'main').spec.inject()
  late.workspaces = { list: { getSnapshot: () => ({ archivedSessionIds: ['session-old'] }) } }
  late.uiWorkspace = {
    openSession: (id) => opened.push(id),
    unarchiveSession: async (id) => archived.push(id),
  }
  assert.deepEqual(await lazy.openSession('session-new'), { ok: true })
  assert.deepEqual(await lazy.openSession('session-old'), { ok: true })
  assert.deepEqual(opened, ['session-new', 'session-old'])
  assert.deepEqual(archived, ['session-old'])
  assert.deepEqual(await lazy.openSession(''), { ok: false, reason: 'missing' })

  let blank = true
  const initialized = []
  late.sessions = { binding: () => ({ session: { getSnapshot: () => ({ blank }) } }) }
  late.conversation = {
    input: {
      requestDraftInitialization: (_, options) => {
        initialized.push(options)
        return 'applied'
      },
    },
  }
  const record = { sessionId: 'session-new', draft: { text: '需求正文', assets: [] } }
  assert.equal((await lazy.prepareDraft(record)).applied, 'applied')
  blank = false
  assert.equal((await lazy.prepareDraft(record)).alreadyStarted, true)
  assert.deepEqual(initialized, [{ prompt: '需求正文', whenDraftExists: 'keep' }])
  assert.deepEqual(opened.slice(-2), ['session-new', 'session-new'])
})

function expand(node, out = []) {
  if (node === null || node === undefined || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const child of node) expand(child, out)
    return out
  }
  out.push(node)
  if (typeof node.type === 'function') expand(node.type({ ...node.props }), out)
  else expand(node.props?.children, out)
  return out
}

test('dispatching a ZenTao business requirement preserves its type in the API request', async (testContext) => {
  let captured
  globalThis.window = { __ModuleLoader__: { load: (bundle) => { captured = bundle } } }
  await import('../lib/client.js')
  const story = { source: 'zentao', kind: 'story', requirementType: 'epic', id: 'story-3', shortId: '#3', name: '测试业务需求' }
  const values = [null, { provider: 'zentao', stories: [story] }, false]
  let cursor = 0
  const React = fakeReact()
  React.useState = (initial) => {
    const index = cursor++
    if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial
    return [values[index], (next) => { values[index] = typeof next === 'function' ? next(values[index]) : next }]
  }
  let Panel
  const bundle = captured ?? globalThis.__taskHubBundle
  bundle.factory(() => React).apply({
    effect: (fn) => fn(),
    locale: { register: () => {}, bind: () => (key) => key },
    slots: { inject: (_, fn) => fn(), register: (spec, component) => { if (spec.name === 'main') Panel = component } },
  })
  const nodes = () => {
    cursor = 0
    return expand(Panel({ t: (key) => key }))
  }
  const button = (label) => nodes().find((node) => node.type === 'button' && node.props.children === label)
  button('dispatch').props.onClick()
  const dialog = nodes()
  assert.equal(dialog.find((node) => node.props?.className === 'tt-chip tt-chip-id').props.children, '#3')
  dialog.find((node) => node.props?.className === 'tt-input tt-input-key').props.onChange({ target: { value: 'issue_3' } })
  let request
  testContext.mock.method(globalThis, 'fetch', async (url, init) => {
    request = { url, body: JSON.parse(init.body) }
    return Response.json({ ok: true, value: {} })
  })
  button('dispatchConfirm').props.onClick()
  assert.equal(request.url, '/api/task-hub/dispatch')
  assert.deepEqual(request.body.story, story)
})

test('the ZenTao picker supports multiple checkboxes and keeps scope IDs separate', async () => {
  let captured
  globalThis.window = { __ModuleLoader__: { load: (bundle) => { captured = bundle } } }
  await import('../lib/client.js')
  const { SettingsModal } = (captured ?? globalThis.__taskHubBundle).factory(() => fakeReact()).__test
  let draft = {
    provider: 'zentao',
    zentao: { scope: 'product', containerIdsText: '1', containerNames: { 1: 'TMS1.0' } },
  }
  const settings = () => expand(SettingsModal({
    t: (key) => key,
    draft,
    setDraft: (next) => { draft = next },
    projectCatalog: [],
    zentaoCatalog: [
      { kind: 'product', id: '1', name: 'TMS1.0' },
      { kind: 'project', id: '1', name: 'TMS1.0' },
      { kind: 'project', id: '2', name: 'TMS2.0' },
    ],
  }))
  const rows = () => settings().filter((node) => node.props?.className === 'tt-proj-row')
  const providers = settings().find((node) => node.props?.label === 'provider').props.children
  assert.deepEqual(providers.props.children.map((node) => node.props.children), ['providerTapd', 'providerZentao'])
  assert.deepEqual(rows().map((row) => row.props.key), ['product:1'])
  assert.equal(rows()[0].props.children[0].props.checked, true)

  const scope = settings().find((node) => node.props?.label === 'zentaoScope')
  scope.props.children.props.onChange({ target: { value: 'project' } })
  assert.equal(draft.zentao.containerIdsText, '')
  assert.deepEqual(draft.zentao.containerNames, {})
  assert.deepEqual(rows().map((row) => row.props.key), ['project:1', 'project:2'])
  assert.equal(rows()[0].props.children[0].props.checked, false)
  const checkbox = (index) => rows()[index].props.children[0].props
  assert.equal(checkbox(0).type, 'checkbox')
  checkbox(0).onChange()
  checkbox(1).onChange()
  assert.equal(draft.zentao.containerIdsText, '1, 2')
  assert.deepEqual([checkbox(0).checked, checkbox(1).checked], [true, true])
  checkbox(0).onChange()
  assert.equal(draft.zentao.containerIdsText, '2')
  const manual = settings().find((node) => node.props?.label === 'zentaoProjectId')
  manual.props.children.props.onChange({ target: { value: '1，3, 3' } })
  assert.deepEqual([checkbox(0).checked, checkbox(1).checked, checkbox(2).checked], [true, false, true])
})

test('the dispatch dialog treats the branch name as the one field to fill', async () => {
  let captured
  globalThis.window = { __ModuleLoader__: { load: (bundle) => { captured = bundle } } }
  await import('../lib/client.js')
  const client = (captured ?? globalThis.__taskHubBundle).factory((name) => {
    if (name === 'react') return fakeReact()
    throw new Error(`unexpected module: ${name}`)
  })
  const { DispatchModal } = client.__test

  const form = {
    mode: 'workspace',
    workspaceId: 'w1',
    workspacePath: '/tmp/repo',
    baseBranch: 'master',
    useWorktree: false,
    smartCheckout: true,
    prompt: '',
    branchName: '',
  }
  const modal = DispatchModal({
    t: (key) => key,
    story: { id: '1004328', name: '后端-客户端上传文件类型为“报关资料”' },
    boot: { workspaces: [{ id: 'w1', title: 'TMS2.0', path: '/Users/spring/TMS2.0' }] },
    form,
    setForm: () => {},
    onSubmit: () => {},
    onClose: () => {},
    busy: false,
    error: null,
  })
  const nodes = expand(modal)

  const keyField = nodes.find((node) => node.props?.className === 'tt-field tt-field-key')
  assert.ok(keyField, 'branch field must use the accented block')

  const label = keyField.props.children[0]
  assert.equal(label.props.className, 'tt-label tt-label-key')
  assert.equal(label.props.children[0], 'dispatchBranch')
  assert.equal(label.props.children[1].props.className, 'tt-label-badge')
  assert.equal(label.props.children[1].props.children, 'dispatchBranchRequiredTag')

  const input = keyField.props.children[1]
  assert.equal(input.props.className, 'tt-input tt-input-key')
  assert.equal(input.props.autoFocus, true)
  assert.equal(input.props.value, '')

  // Only the branch field is accented; the target/base/prompt fields stay plain.
  assert.equal(nodes.filter((node) => node.props?.className === 'tt-field tt-field-key').length, 1)
  assert.ok(
    nodes.indexOf(keyField) < nodes.findIndex((node) => node.props?.className === 'tt-select'),
    'branch name must come before the workspace picker',
  )

  // Submitting with an empty branch paints the input itself, not just the footer error.
  const invalid = DispatchModal({
    t: (key) => key,
    story: { id: '1004328', name: 'x' },
    boot: { workspaces: [] },
    form,
    setForm: () => {},
    onSubmit: () => {},
    onClose: () => {},
    busy: false,
    error: { message: 'dispatchBranchRequired', code: 'dispatch/missing-branch' },
  })
  const invalidInput = expand(invalid).find((node) => node.type === 'input')
  assert.equal(invalidInput.props.className, 'tt-input tt-input-key tt-input-invalid')

  const plainField = client.__test.Field({ label: 'plain', children: null })
  assert.equal(plainField.props.className, 'tt-field')
  assert.equal(plainField.props.children[0].props.className, 'tt-label')
  // An ordinary field has no accent dot and no badge.
  assert.equal(plainField.props.children[0].props.children[0], 'plain')
  assert.equal(plainField.props.children[0].props.children[1], null)
})
