/**
 * Minimal ZenTao (禅道) REST v1 client.
 *
 * ZenTao has no "assigned to me" endpoint, so the client signs in once
 * (`POST /tokens`), resolves the current account (`GET /user`) and filters the
 * product stories / execution tasks locally. Products expose requirements,
 * projects expose executions whose tasks are the developer's work items.
 */
import { createHash } from 'node:crypto'

const REQUEST_TIMEOUT_MS = 20_000
const MAX_PAGES = 5
const PAGE_SIZE = 200
const REQUIREMENT_TYPES = ['story', 'requirement', 'epic']
const MAX_IMAGE_BYTES = 6 * 1024 * 1024
const MAX_ASSET_BYTES = 20 * 1024 * 1024
const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }

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

export function basicAuthHeader({ account, password }) {
  const user = String(account ?? '').trim()
  if (!user || !password) {
    throw new ZentaoError('zentao/missing-basic-auth', '已启用禅道 Basic Auth，请填写网关账号和密码')
  }
  if (/[:\x00-\x1f\x7f]/.test(user) || /[\x00-\x1f\x7f]/.test(password)) {
    throw new ZentaoError('zentao/bad-request', 'Basic Auth 账号不能包含冒号，账号和密码不能包含控制字符')
  }
  return `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`
}

function credentialKey({ baseUrl, credentials }) {
  return createHash('sha256').update(JSON.stringify([
    apiRoot(baseUrl),
    String(credentials?.account ?? '').trim(),
    credentials?.password ?? '',
    credentials?.basicAuth ?? null,
  ])).digest('hex')
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

async function request(options) {
  const { baseUrl, credentials, path, method = 'GET', body, token, assetUrl, binary, fetchImpl = globalThis.fetch } = options
  const root = apiRoot(baseUrl)
  if (!root) throw new ZentaoError('zentao/missing-base-url', '尚未填写禅道地址')
  const headers = { accept: binary ? '*/*' : 'application/json' }
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (token) headers.token = token
  if (credentials?.basicAuth) headers.authorization = basicAuthHeader(credentials.basicAuth)
  const target = assetUrl ?? `${root}${path.startsWith('/') ? path : `/${path}`}`
  let response
  try {
    response = await fetchImpl(target, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(binary ? { redirect: 'error' } : {}),
    })
  } catch (error) {
    if (error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new ZentaoError('zentao/timeout', '禅道请求超时')
    }
    throw new ZentaoError('zentao/network', `无法连接禅道：${error?.message ?? error}`)
  }
  if (binary && response.ok) return response
  const payload = await readBody(response)
  if (response.status === 401 && /(?:^|,)\s*Basic(?:\s|$)/i.test(response.headers.get('www-authenticate') ?? '')) {
    throw new ZentaoError(
      'zentao/basic-auth-failed',
      credentials?.basicAuth ? '禅道网关 Basic Auth 验证失败，请检查网关账号和密码' : '禅道网关需要 Basic Auth，请在设置中启用并填写网关账号和密码',
    )
  }
  if (response.status === 401 || response.status === 403) {
    throw new ZentaoError('zentao/auth-failed', '禅道认证失败，请检查账号、密码或 Token')
  }
  if (!response.ok) {
    const detail = errorMessageOf(payload)
    throw new ZentaoError('zentao/http-error', `禅道返回 ${response.status}${detail ? `：${detail}` : ''}`)
  }
  return payload
}

/** Exchange account/password for a session token; cached for a short while. */
export async function ensureToken(options) {
  const { baseUrl, credentials, fetchImpl } = options
  const account = String(credentials?.account ?? '').trim()
  const password = String(credentials?.password ?? '')
  if (!account) throw new ZentaoError('zentao/missing-credentials', '尚未填写禅道账号')
  if (!password) throw new ZentaoError('zentao/missing-credentials', '尚未填写禅道密码')
  const key = credentialKey(options)
  const cached = tokenCache.get(key)
  if (cached && Date.now() - cached.at < TOKEN_TTL_MS) return cached.token
  const body = await request({ baseUrl, path: '/tokens', method: 'POST', body: { account, password }, credentials, fetchImpl })
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
    tokenCache.delete(credentialKey(options))
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
  if (value && typeof value === 'object') return String(value.account ?? '').trim()
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
  const requirementType = REQUIREMENT_TYPES.includes(raw.type) ? raw.type : context.requirementType
  const detailSuffix = requirementType === 'story' ? '' : `-0-0-${requirementType}`
  return {
    source: 'zentao',
    kind: 'story',
    requirementType,
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
    url: `${context.webRoot}/story-view-${encodeURIComponent(remoteId)}${detailSuffix}.html`,
    rootId: '',
    rootShortId: '',
    level: '1',
  }
}

export async function fetchMe(options) {
  const body = await call({ ...options, path: '/user' })
  const user = body?.profile ?? body?.data?.profile ?? body?.user ?? body?.data?.user ?? body ?? {}
  return {
    account: accountOf(user) || String(options.credentials?.account ?? '').trim(),
    name: nameOf(user),
  }
}

/** List responses omit spec/desc and may omit attachment metadata. */
export async function fetchWorkDetails(options) {
  const { story } = options
  const task = story.kind === 'task' || String(story.id).startsWith('task-')
  const id = String(story.remoteId ?? story.id ?? '').replace(/^(?:story|task)-/, '')
  if (!/^\d+$/.test(id)) throw new ZentaoError('zentao/bad-request', '无效的禅道条目 ID')
  const kind = task ? 'task' : 'story'
  const type = story.requirementType
  const query = !task && REQUIREMENT_TYPES.includes(type) && type !== 'story' ? `?type=${type}` : ''
  const body = await call({ ...options, path: `/${task ? 'tasks' : 'stories'}/${id}${query}` })
  const detail = body?.[kind] ?? body?.data?.[kind] ?? body?.data ?? body
  if (String(detail?.id ?? '') !== id) {
    throw new ZentaoError('zentao/detail-failed', `禅道没有返回条目 #${id} 的详情`)
  }
  const description = task ? detail.desc ?? detail.description : detail.spec ?? detail.description
  return {
    ...story,
    description: typeof description === 'string' ? description : story.description,
    sourceFiles: Object.values(detail.files ?? {}),
  }
}

function imageSource(src, root) {
  const placeholder = /^\{(\d+)(?:\.(\w+))?\}$/.exec(src)
  if (placeholder) return { id: placeholder[1], ext: placeholder[2] }
  const url = new URL(src, root)
  if (url.origin !== root.origin || url.username || url.password) {
    throw new ZentaoError('zentao/image-failed', '禅道正文包含站外图片，无法通过禅道读取')
  }
  const filename = url.pathname.split('/').at(-1)
  const fileLink = /^file-(?:read|download|viewdownload)-(\d+)(?:-\d+)?(?:-view)?(?:\.(\w+))?$/i.exec(filename)
  const apiFile = /^\d+$/.test(filename) && url.pathname === `${root.pathname}api.php/v1/files/${filename}`
  if (apiFile) return { id: filename }
  const queryId = url.searchParams.get('fileID')
  if (fileLink) return { id: fileLink[1], ext: fileLink[2] }
  if (url.searchParams.get('m') === 'file' && /^(read|download)$/.test(url.searchParams.get('f') ?? '') && /^\d+$/.test(queryId ?? '')) {
    return { id: queryId, ext: url.searchParams.get('t') }
  }
  if (!url.pathname.startsWith(`${root.pathname}data/upload/`)) {
    throw new ZentaoError('zentao/image-failed', '禅道正文包含无法识别的图片地址')
  }
  return { url: url.href, ext: filename.split('.').at(-1) }
}

async function readAssetBytes(response, limit, name) {
  const reader = response.body?.getReader()
  const chunks = []
  let size = 0
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > limit) {
          await reader.cancel().catch(() => {})
          throw new ZentaoError('zentao/asset-too-large', `禅道附件「${name}」超过草稿大小限制`)
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }
  }
  if (size === 0) throw new ZentaoError('zentao/asset-failed', `禅道附件「${name}」为空`)
  return Buffer.concat(chunks, size)
}

function imageType(data) {
  if (data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return IMAGE_TYPES.png
  if (data.subarray(0, 3).toString('hex') === 'ffd8ff') return IMAGE_TYPES.jpg
  if (/^GIF8[79]a$/.test(data.subarray(0, 6).toString('ascii'))) return IMAGE_TYPES.gif
  if (data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') return IMAGE_TYPES.webp
  return ''
}

/** Resolve rich-text screenshots and file IDs into the shared dispatch payload. */
export async function fetchWorkAssets(options) {
  const { story, baseUrl } = options
  const root = new URL(`${webRoot(baseUrl)}/`)
  const refs = new Map()
  for (const match of String(story.description ?? '').matchAll(/<img\b[^>]*?\ssrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)) {
    const src = (match[1] ?? match[2] ?? match[3]).replace(/&amp;|&#38;|&#x26;/gi, '&').trim()
    const inline = /^data:image\/(png|jpe?g|gif|webp);base64,([a-z0-9+/=\s]+)$/i.exec(src)
    const ref = inline ? { inline: inline[2], ext: inline[1] } : imageSource(src, root)
    refs.set(ref.id ?? src, { ...ref, image: true })
  }
  for (const file of story.sourceFiles ?? []) {
    const id = String(file?.id ?? '')
    if (!/^\d+$/.test(id)) continue
    refs.set(id, { id, ext: file.extension, name: file.title ?? file.name, ...refs.get(id) })
  }
  const files = []
  const images = []
  let total = 0
  for (const ref of refs.values()) {
    const ext = String(ref.ext ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const image = ref.image || Object.hasOwn(IMAGE_TYPES, ext)
    const limit = Math.min(image ? MAX_IMAGE_BYTES : MAX_ASSET_BYTES, MAX_ASSET_BYTES - total)
    let name = String(ref.name ?? '').trim() || `${image ? '禅道图片' : '禅道附件'}-${ref.id ?? images.length + 1}`
    let data
    if (ref.inline) {
      if (Buffer.byteLength(ref.inline, 'base64') > limit + 2) throw new ZentaoError('zentao/asset-too-large', `禅道图片「${name}」超过草稿大小限制`)
      data = Buffer.from(ref.inline, 'base64')
      if (data.byteLength > limit) throw new ZentaoError('zentao/asset-too-large', `禅道图片「${name}」超过草稿大小限制`)
    } else {
      const response = await call({ ...options, path: `/files/${ref.id}`, assetUrl: ref.url, binary: true })
      const type = response.headers.get('content-type') ?? ''
      if (/^(?:text\/html|application\/json)\b/i.test(type) && !/^attachment\b/i.test(response.headers.get('content-disposition') ?? '')) {
        await response.body?.cancel()
        throw new ZentaoError('zentao/asset-failed', `禅道没有返回附件「${name}」的文件内容`)
      }
      data = await readAssetBytes(response, limit, name)
    }
    total += data.byteLength
    const mediaType = imageType(data)
    if (image && !mediaType) throw new ZentaoError('zentao/image-failed', `禅道图片「${name}」格式无效或不受支持`)
    const extension = mediaType === IMAGE_TYPES.jpg ? 'jpg' : mediaType?.split('/')[1] || ext
    const namedExtension = name.toLowerCase().split('.').at(-1)
    if (extension && namedExtension !== extension && IMAGE_TYPES[namedExtension] !== mediaType) name += `.${extension}`
    if (mediaType) images.push({ name, mediaType, data })
    else files.push({ name, data })
  }
  return { files, images }
}

/** Products and projects that can act as the requirement container. */
export async function listContainers(options) {
  await ensureToken(options)
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
  const { baseUrl, containerId, containerName, containerIds, containerNames } = options ?? {}
  const containers = [...new Set((containerIds ?? [containerId]).map((id) => String(id ?? '').trim()).filter(Boolean))]
  if (containers.length === 0) throw new ZentaoError('zentao/missing-container', '尚未选择禅道产品/项目')
  const me = await fetchMe(options)
  const matches = (raw) => {
    const assignee = raw?.assignedTo
    const account = accountOf(assignee)
    if (account && me.account && account.toLowerCase() === me.account.toLowerCase()) return true
    if (account && typeof assignee === 'object') return false
    return Boolean(me.name && nameOf(assignee) === me.name)
  }
  const storiesById = new Map()
  const names = []
  const root = webRoot(baseUrl)
  let rawCount = 0
  for (const id of containers) {
    const name = String(containerNames?.[id] ?? (containerIds == null ? containerName ?? '' : '')).trim() || id
    names.push(name)
    const result = await fetchContainerWork(options, { containerId: id, containerName: name, webRoot: root }, matches)
    rawCount += result.rawCount
    for (const story of result.stories) {
      if (!storiesById.has(story.id)) storiesById.set(story.id, story)
    }
  }
  const stories = [...storiesById.values()]
  return {
    stories,
    rawCount,
    iterations: [...new Set(stories.map((story) => story.iterationName).filter(Boolean))],
    me,
    containerName: names.join(', '),
  }
}

async function fetchContainerWork(options, context, matches) {
  const { scope = 'product', pageSize = PAGE_SIZE } = options
  const container = encodeURIComponent(context.containerId)
  if (scope === 'project') {
    const executions = await paged(
      options,
      (page) => `/projects/${container}/executions?limit=${pageSize}&page=${page}`,
      ['executions'],
    )
    const stories = []
    let rawCount = 0
    for (const execution of executions) {
      const executionId = String(execution?.id ?? '').trim()
      if (!executionId) continue
      const rows = await paged(
        options,
        (page) => `/executions/${encodeURIComponent(executionId)}/tasks?limit=${pageSize}&page=${page}`,
        ['tasks'],
      )
      rawCount += rows.length
      for (const raw of rows) {
        if (!matches(raw)) continue
        const task = normalizeTask(raw, {
          ...context,
          containerName: String(execution?.name ?? '').trim() || context.containerName,
        })
        if (task) stories.push(task)
      }
    }
    return { stories, rawCount }
  }
  const batches = await Promise.all(REQUIREMENT_TYPES.map((type) => paged(
    options,
    (page) => `/products/${container}/stories?limit=${pageSize}&page=${page}&type=${type}`,
    ['stories'],
  )))
  // All types share the same ZenTao story IDs. Some responses also include
  // related requirements from another type, or ignore type on older versions.
  const rows = new Map()
  for (const [index, batch] of batches.entries()) {
    for (const raw of batch) {
      const story = normalizeStory(raw, { ...context, requirementType: REQUIREMENT_TYPES[index] })
      if (story && !rows.has(story.id)) rows.set(story.id, { story, assigned: matches(raw) })
    }
  }
  const stories = [...rows.values()].filter((row) => row.assigned).map((row) => row.story)
  return { stories, rawCount: rows.size }
}

export function resetZentaoTokens() {
  tokenCache.clear()
}
