/**
 * Minimal ZenTao (禅道) REST v1 client.
 *
 * ZenTao has no "assigned to me" endpoint, so the client signs in once
 * (`POST /tokens`), resolves the current account (`GET /user`) and filters the
 * product stories / execution tasks locally. Products expose requirements,
 * projects expose executions whose tasks are the developer's work items.
 */
const REQUEST_TIMEOUT_MS = 20_000
const MAX_PAGES = 5
const PAGE_SIZE = 200

const tokenCache = new Map()
const TOKEN_TTL_MS = 20 * 60 * 1000

export class ZentaoError extends Error {
  constructor(code, message, details) {
    super(message)
    this.name = 'ZentaoError'
    this.code = code
    this.details = details
  }
}

export function apiRoot(baseUrl) {
  const base = String(baseUrl ?? '').trim().replace(/\/+$/, '')
  if (!base) return ''
  if (/\/api\.php\/v1$/i.test(base)) return base
  if (/\/api\.php$/i.test(base)) return `${base}/v1`
  return `${base}/api.php/v1`
}

export function webRoot(baseUrl) {
  return String(baseUrl ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\.php(\/v1)?$/i, '')
}

function credentialKey(baseUrl, account) {
  return `${baseUrl}|${account}`
}

async function readBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text.slice(0, 500) }
  }
}

function errorMessageOf(body) {
  if (!body || typeof body !== 'object') return ''
  if (typeof body.error === 'string') return body.error
  if (typeof body.message === 'string') return body.message
  if (body.error && typeof body.error === 'object' && typeof body.error.message === 'string') return body.error.message
  if (typeof body.raw === 'string') return body.raw
  return ''
}

function tokenOf(body) {
  if (!body || typeof body !== 'object') return ''
  if (typeof body.token === 'string') return body.token
  if (body.data && typeof body.data.token === 'string') return body.data.token
  return ''
}

async function request(options, mode) {
  const { baseUrl, credentials, path, method = 'GET', body, token, fetchImpl = globalThis.fetch } = options
  const root = apiRoot(baseUrl)
  if (!root) throw new ZentaoError('zentao/missing-base-url', '尚未填写禅道地址')
  const headers = { accept: 'application/json' }
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (token) headers.token = token
  const target = `${root}${path.startsWith('/') ? path : `/${path}`}`
  let response
  try {
    response = await fetchImpl(target, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new ZentaoError('zentao/timeout', '禅道请求超时')
    }
    throw new ZentaoError('zentao/network', `无法连接禅道：${error?.message ?? error}`)
  }
  const payload = await readBody(response)
  if (response.status === 401 || response.status === 403) {
    throw new ZentaoError('zentao/auth-failed', '禅道认证失败，请检查账号、密码或 Token')
  }
  if (!response.ok) {
    const detail = errorMessageOf(payload)
    throw new ZentaoError('zentao/http-error', `禅道返回 ${response.status}${detail ? `：${detail}` : ''}`)
  }
  if (mode === 'login') return payload
  return payload
}

/** Exchange account/password for a session token; cached for a short while. */
export async function ensureToken(options) {
  const { baseUrl, credentials, fetchImpl } = options
  const account = String(credentials?.account ?? '').trim()
  const password = String(credentials?.password ?? '')
  if (!account) throw new ZentaoError('zentao/missing-credentials', '尚未填写禅道账号')
  if (!password) throw new ZentaoError('zentao/missing-credentials', '尚未填写禅道密码')
  const key = credentialKey(apiRoot(baseUrl), account)
  const cached = tokenCache.get(key)
  if (cached && Date.now() - cached.at < TOKEN_TTL_MS) return cached.token
  const body = await request(
    { baseUrl, path: '/tokens', method: 'POST', body: { account, password }, credentials, fetchImpl },
    'login',
  )
  const token = tokenOf(body)
  if (!token) throw new ZentaoError('zentao/auth-failed', '禅道没有返回登录 Token，请确认账号密码')
  tokenCache.set(key, { token, at: Date.now() })
  return token
}

async function call(options) {
  const token = await ensureToken(options)
  try {
    return await request({ ...options, token })
  } catch (error) {
    if (error?.code !== 'zentao/auth-failed') throw error
    tokenCache.delete(credentialKey(apiRoot(options.baseUrl), String(options.credentials?.account ?? '').trim()))
    const retried = await ensureToken(options)
    return request({ ...options, token: retried })
  }
}

function rowsOf(body, ...keys) {
  if (Array.isArray(body)) return body
  if (!body || typeof body !== 'object') return []
  for (const key of keys) {
    if (Array.isArray(body[key])) return body[key]
  }
  if (Array.isArray(body.data)) return body.data
  for (const key of keys) {
    if (body.data && Array.isArray(body.data[key])) return body.data[key]
  }
  return []
}

function totalOf(body, fallback) {
  const total = Number(body?.total ?? body?.data?.total ?? fallback)
  return Number.isFinite(total) ? total : fallback
}

async function paged(options, pathForPage, keys) {
  const rows = []
  let total = Infinity
  for (let page = 1; page <= MAX_PAGES && rows.length < total; page += 1) {
    const body = await call({ ...options, path: pathForPage(page) })
    const batch = rowsOf(body, ...keys)
    rows.push(...batch)
    total = totalOf(body, rows.length)
    if (batch.length === 0) break
  }
  return rows
}

function accountOf(value) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object') return String(value.account ?? value.realname ?? '').trim()
  return ''
}

function nameOf(value) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object') return String(value.realname ?? value.name ?? value.account ?? '').trim()
  return ''
}

function normalizeStatus(raw) {
  const status = String(raw?.status ?? '').trim().toLowerCase()
  const map = {
    wait: '未开始',
    doing: '进行中',
    done: '已完成',
    closed: '已关闭',
    cancel: '已取消',
    pause: '已暂停',
    active: '进行中',
  }
  return {
    status,
    vStatus: map[status] ?? status,
    completed: status === 'done' || status === 'closed',
  }
}

function normalizePriority(raw) {
  const pri = String(raw?.pri ?? raw?.priority ?? '').trim()
  if (!pri) return { priority: '', priorityLabel: '' }
  return { priority: pri, priorityLabel: /^\d+$/.test(pri) ? `P${pri}` : pri }
}

function taskGroup(raw, fallback) {
  const execution = raw?.execution
  return (
    String(raw?.executionName ?? '').trim() ||
    nameOf(execution) ||
    String(raw?.execution_title ?? '').trim() ||
    fallback
  )
}

function normalizeTask(raw, context) {
  if (!raw || typeof raw !== 'object') return null
  const remoteId = String(raw.id ?? '').trim()
  if (!remoteId) return null
  const status = normalizeStatus(raw)
  const priority = normalizePriority(raw)
  const execution = raw.execution
  const executionName = taskGroup(raw, context.containerName)
  return {
    source: 'zentao',
    kind: 'task',
    id: `task-${remoteId}`,
    remoteId,
    shortId: `#${remoteId}`,
    name: String(raw.name ?? '').trim() || `任务 ${remoteId}`,
    description: typeof raw.desc === 'string' ? raw.desc : typeof raw.description === 'string' ? raw.description : '',
    ...status,
    owner: nameOf(raw.assignedTo) || nameOf(raw.finishedBy),
    creator: nameOf(raw.openedBy),
    ...priority,
    due: String(raw.deadline ?? raw.dueDate ?? '').trim(),
    begin: String(raw.startDate ?? raw.openedDate ?? '').trim(),
    created: String(raw.openedDate ?? '').trim(),
    modified: String(raw.lastEditedDate ?? '').trim(),
    iterationId: String(execution && typeof execution === 'object' ? execution.id ?? '' : execution ?? '').trim(),
    iterationName: executionName,
    categoryId: '',
    projectId: String(context.containerId ?? '').trim(),
    url: `${context.webRoot}/task-view-${encodeURIComponent(remoteId)}.html`,
    rootId: '',
    rootShortId: '',
    level: '1',
  }
}

function normalizeStory(raw, context) {
  if (!raw || typeof raw !== 'object') return null
  const remoteId = String(raw.id ?? '').trim()
  if (!remoteId) return null
  const status = normalizeStatus(raw)
  const priority = normalizePriority(raw)
  return {
    source: 'zentao',
    kind: 'story',
    id: `story-${remoteId}`,
    remoteId,
    shortId: `#${remoteId}`,
    name: String(raw.title ?? raw.name ?? '').trim() || `需求 ${remoteId}`,
    description: typeof raw.spec === 'string' ? raw.spec : typeof raw.description === 'string' ? raw.description : '',
    ...status,
    owner: nameOf(raw.assignedTo),
    creator: nameOf(raw.openedBy),
    ...priority,
    due: String(raw.dueDate ?? '').trim(),
    begin: String(raw.openedDate ?? '').trim(),
    created: String(raw.openedDate ?? '').trim(),
    modified: String(raw.lastEditedDate ?? '').trim(),
    iterationId: '',
    iterationName: context.containerName,
    categoryId: String(raw.category ?? '').trim(),
    projectId: String(context.containerId ?? '').trim(),
    url: `${context.webRoot}/story-view-${encodeURIComponent(remoteId)}.html`,
    rootId: '',
    rootShortId: '',
    level: '1',
  }
}

export async function fetchMe(options) {
  const body = await call({ ...options, path: '/user' })
  const user = body?.user ?? body?.data?.user ?? body ?? {}
  return {
    account: String(user.account ?? '').trim(),
    name: nameOf(user),
  }
}

/** Products and projects that can act as the requirement container. */
export async function listContainers(options) {
  const [products, projects] = await Promise.all([
    paged(options, (page) => `/products?limit=${PAGE_SIZE}&page=${page}`, ['products']),
    paged(options, (page) => `/projects?limit=${PAGE_SIZE}&page=${page}`, ['projects']),
  ])
  const map = (wanted) => (raw) => {
    const id = String(raw?.id ?? '').trim()
    if (!id) return null
    return { id, name: String(raw?.name ?? '').trim() || id, kind: wanted }
  }
  return {
    products: products.map(map('product')).filter(Boolean),
    projects: projects.map(map('project')).filter(Boolean),
  }
}

/**
 * Requirements (product scope) or tasks (project scope) assigned to the current
 * ZenTao user.
 */
export async function fetchMyWork(options) {
  const { baseUrl, credentials, scope = 'product', containerId, containerName, pageSize = PAGE_SIZE } = options ?? {}
  const container = String(containerId ?? '').trim()
  if (!container) throw new ZentaoError('zentao/missing-container', '尚未选择禅道产品/项目')
  const me = await fetchMe(options)
  const context = {
    containerId: container,
    containerName: String(containerName ?? '').trim() || container,
    webRoot: webRoot(baseUrl),
  }
  const matches = (raw) => {
    const assignee = accountOf(raw?.assignedTo)
    if (!assignee) return false
    return (
      (me.account && assignee.toLowerCase() === me.account.toLowerCase()) ||
      (me.name && nameOf(raw?.assignedTo) === me.name)
    )
  }
  if (scope === 'project') {
    const executions = await paged(
      options,
      (page) => `/projects/${encodeURIComponent(container)}/executions?limit=${pageSize}&page=${page}`,
      ['executions'],
    )
    const stories = []
    for (const execution of executions) {
      const executionId = String(execution?.id ?? '').trim()
      if (!executionId) continue
      const rows = await paged(
        options,
        (page) => `/executions/${encodeURIComponent(executionId)}/tasks?limit=${pageSize}&page=${page}`,
        ['tasks'],
      )
      for (const raw of rows) {
        if (!matches(raw)) continue
        const task = normalizeTask(raw, {
          ...context,
          containerName: String(execution?.name ?? '').trim() || context.containerName,
        })
        if (task) stories.push(task)
      }
    }
    return {
      stories,
      rawCount: stories.length,
      iterations: [...new Set(stories.map((story) => story.iterationName).filter(Boolean))],
      me,
      containerName: context.containerName,
    }
  }
  const rows = await paged(
    options,
    (page) => `/products/${encodeURIComponent(container)}/stories?limit=${pageSize}&page=${page}`,
    ['stories'],
  )
  const stories = []
  for (const raw of rows) {
    if (!matches(raw)) continue
    const story = normalizeStory(raw, context)
    if (story) stories.push(story)
  }
  return {
    stories,
    rawCount: rows.length,
    iterations: [...new Set(stories.map((story) => story.iterationName).filter(Boolean))],
    me,
    containerName: context.containerName,
  }
}

export function resetZentaoTokens() {
  tokenCache.clear()
}
