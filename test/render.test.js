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
  assert.ok(captured, 'client bundle was not registered')
  assert.equal(captured.id, 'dsh-tapd-tasks')

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
  assert.equal(main.spec.key, 'tapd-tasks')
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

  const rowMarkup = render(
    StoryRow({
      t: (key) => key,
      story: { id: '1168200255001004351', name: '后端-卡航合单', vStatus: '新建(需求设计中)', owner: '王如涛;', url: 'https://x' },
      onDispatch: () => {},
      onOpen: () => {},
    }),
  )
  assert.match(rowMarkup, /1168200255001004351/)
  assert.match(rowMarkup, /新建\(需求设计中\)/)

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
