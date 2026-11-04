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

  // Sources without an 应用 custom field (GitLab / 禅道) drop the whole column.
  const plainRow = StoryRow({ t: (key) => key, story: { id: '9', name: '无应用' }, onDispatch: () => {}, onOpen: () => {} })
  assert.equal(plainRow.props.className, 'tt-srow tt-noapp')
  assert.equal(plainRow.props.children.filter(Boolean).length, 5)
  assert.equal(plainRow.props.children.filter(Boolean)[0].props.className, 'tt-sid')

  const existingRow = render(
    StoryRow({
      t: (key) => key,
      story: {
        id: '1168200255001004331',
        name: '前端-SKU管理新增型号字段',
        dispatch: { sessionId: 'session-old', attachments: [], images: [] },
      },
      onDispatch: () => {},
      onOpen: () => {},
      onBackfill: () => {},
      backfilling: '',
    }),
  )
  assert.match(existingRow, /openShort/)
  assert.match(existingRow, /backfill/)

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
