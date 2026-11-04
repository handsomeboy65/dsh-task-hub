/**
 * Minimal TAPD Open API client for the task view.
 *
 * Auth follows the TAPD personal access token: the token is sent as
 * `Authorization: Bearer <token>`, which is what api.tapd.cn accepts today.
 * An API account (Basic auth) is still supported for older deployments, and a
 * 401/403 is retried once with query credentials for those installs.
 */
import { Buffer } from 'node:buffer'

export const TAPD_BASE = 'https://api.tapd.cn'
export const MAX_LIMIT = 200
const REQUEST_TIMEOUT_MS = 20_000

/** Fields asked from TAPD; keeps the payload small and the panel predictable. */
export const STORY_FIELDS = [
  'id',
  'name',
  'description',
  'workspace_id',
  'status',
  'v_status',
  'owner',
  'creator',
  'priority',
  'priority_label',
  'iteration_id',
  'parent_id',
  'ancestor_id',
  'level',
  'category_id',
  'begin',
  'due',
  'created',
  'modified',
  'completed',
].join(',')

/**
 * TAPD exposes workspace-specific fields as `custom_field_*`; their names and
 * legal values only exist in the field settings endpoint. The panel surfaces
 * one of them ("应用"), so the settings are read once per project and cached.
 */
const CUSTOM_FIELD_TTL_MS = 10 * 60_000
const CUSTOM_FIELD_RETRY_MS = 60_000
const customFieldCache = new Map()

export class TapdError extends Error {
  constructor(code, message, details) {
    super(message)
    this.name = 'TapdError'
    this.code = code
    this.details = details
  }
}

export function buildQuery(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === '') continue
        search.append(key, String(item))
      }
    } else {
      search.append(key, String(value))
    }
  }
  return search.toString()
}

export function storyUrl(projectId, storyId) {
  if (!projectId || !storyId) return ''
  return `https://www.tapd.cn/${encodeURIComponent(projectId)}/prong/stories/view/${encodeURIComponent(storyId)}`
}

/**
 * TAPD renders a requirement as its short number (e.g. 1004297) while the API
 * returns `<2-digit env><workspace_id>00<short number>`. Strip that prefix so
 * the view matches the short number people see in TAPD.
 */
export function shortStoryId(id, workspaceId) {
  const raw = String(id ?? '').trim()
  const workspace = String(workspaceId ?? '').trim()
  const prefix = workspace ? `11${workspace}00` : ''
  if (prefix && raw.startsWith(prefix) && raw.length > prefix.length) return raw.slice(prefix.length)
  return raw
}

/** TAPD serialises a select field's choices as a JSON object of id → label. */
export function parseCustomFieldOptions(value) {
  if (typeof value !== 'string' || !value.trim()) return new Map()
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map()
    const options = new Map()
    for (const [key, label] of Object.entries(parsed)) {
      if (typeof label === 'string' && label.trim()) options.set(String(key), label.trim())
    }
    return options
  } catch {
    return new Map()
  }
}

/** Normalise the `stories/custom_fields_settings` payload into plain specs. */
export function customFieldSpecs(body) {
  const rows = Array.isArray(body?.data) ? body.data : []
  const specs = []
  for (const row of rows) {
    const config = row?.CustomFieldConfig ?? row
    if (!config || typeof config !== 'object') continue
    const field = String(config.custom_field ?? '').trim()
    if (!field.startsWith('custom_field_')) continue
    if (String(config.enabled ?? '1') === '0') continue
    specs.push({
      field,
      name: String(config.name ?? '').trim(),
      type: String(config.type ?? '').trim(),
      options: parseCustomFieldOptions(config.options),
    })
  }
  return specs
}

/** The "应用" field, when this workspace defines one; undefined otherwise. */
export function appFieldSpec(specs) {
  const list = Array.isArray(specs) ? specs : []
  return (
    list.find((spec) => spec.name === '应用') ??
    list.find((spec) => spec.name.endsWith('应用')) ??
    list.find((spec) => spec.name.includes('应用'))
  )
}

/** Reveal a story's value for one custom field, translated to its label. */
export function customFieldValue(raw, spec) {
  if (!raw || typeof raw !== 'object' || !spec) return ''
  const labeled = raw[`${spec.field}_label`]
  if (typeof labeled === 'string' && labeled.trim()) return labeled.trim()
  const value = raw[spec.field]
  if (value === undefined || value === null || typeof value === 'object') return ''
  const text = String(value).trim()
  if (!text) return ''
  const options = spec.options instanceof Map ? spec.options : new Map()
  if (options.has(text)) return options.get(text)
  if (/[,|]/.test(text)) {
    const labels = text
      .split(/[,|]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => options.get(part) ?? part)
    return labels.join(', ')
  }
  return text
}

/** Request `fields` list including every configured custom field. */
export function storyFieldsFor(specs) {
  const extra = (Array.isArray(specs) ? specs : []).map((spec) => spec?.field).filter(Boolean)
  if (extra.length === 0) return STORY_FIELDS
  return `${STORY_FIELDS},${[...new Set(extra)].join(',')}`
}

/**
 * Custom field settings for one project. A gateway that hides the endpoint (or
 * a transient failure) must not break the story list, so failures degrade to an
 * empty spec list and are retried sooner than a successful read.
 */
export async function fetchCustomFieldSpecs(options) {
  const { credentials, projectId } = options ?? {}
  if (!projectId) return []
  const key = String(projectId)
  const cached = customFieldCache.get(key)
  if (cached && Date.now() - cached.at < cached.ttl) return cached.specs
  try {
    const body = await requestJson(
      'stories/custom_fields_settings',
      { workspace_id: projectId },
      credentials,
      options,
    )
    const specs = customFieldSpecs(body)
    customFieldCache.set(key, { at: Date.now(), ttl: CUSTOM_FIELD_TTL_MS, specs })
    return specs
  } catch (error) {
    console.warn(
      `[dsh-task-hub] TAPD 自定义字段读取失败（${key}）：${error?.message ?? error}`,
    )
    customFieldCache.set(key, { at: Date.now(), ttl: CUSTOM_FIELD_RETRY_MS, specs: [] })
    return []
  }
}

export function normalizeStory(raw, projectId, specs) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '').trim()
  if (!id) return null
  const project = String(raw.workspace_id ?? projectId ?? '').trim()
  const parentId = String(raw.parent_id ?? '').trim()
  const ancestorId = String(raw.ancestor_id ?? '').trim()
  const rootId = ancestorId && ancestorId !== '0' ? ancestorId : parentId && parentId !== '0' ? parentId : id
  return {
    id,
    shortId: shortStoryId(id, project),
    parentId: parentId === '0' ? '' : parentId,
    rootId,
    rootShortId: shortStoryId(rootId, project),
    level: String(raw.level ?? '').trim(),
    name: String(raw.name ?? '').trim() || `需求 ${id}`,
    description: typeof raw.description === 'string' ? raw.description : '',
    status: String(raw.status ?? '').trim(),
    vStatus: String(raw.v_status ?? '').trim(),
    owner: String(raw.owner ?? '').trim(),
    creator: String(raw.creator ?? '').trim(),
    priority: String(raw.priority ?? '').trim(),
    priorityLabel: String(raw.priority_label ?? raw.priority ?? '').trim(),
    due: String(raw.due ?? '').trim(),
    begin: String(raw.begin ?? '').trim(),
    created: String(raw.created ?? '').trim(),
    modified: String(raw.modified ?? '').trim(),
    completed: String(raw.completed ?? '').trim(),
    iterationId: String(raw.iteration_id ?? '').trim(),
    iterationName: '',
    categoryId: String(raw.category_id ?? '').trim(),
    app: customFieldValue(raw, appFieldSpec(specs)),
    projectId: project,
    url: storyUrl(project, id),
  }
}

export function normalizeProject(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '').trim()
  if (!id) return null
  return {
    id,
    name: String(raw.name ?? '').trim() || id,
    category: String(raw.category ?? '').trim(),
    status: String(raw.status ?? '').trim(),
  }
}

function basicAuth(user, password) {
  return `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`
}

function errorMessageOf(body) {
  if (!body || typeof body !== 'object') return ''
  const info = body.info
  if (typeof info === 'string' && info) return info
  if (info && typeof info === 'object') {
    const message = info.message ?? info.msg ?? info.error_message
    if (typeof message === 'string' && message) return message
  }
  return typeof body.message === 'string' ? body.message : ''
}

async function readBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { __raw: text.slice(0, 500) }
  }
}

/**
 * Headers for the configured credential. `credentials` is
 * `{ token, apiUser, apiPassword }`; the token wins because it is the only
 * mode that works on a fresh TAPD account without enabling the API password.
 */
export function authHeaders(credentials) {
  const { token, apiUser, apiPassword } = credentials ?? {}
  if (typeof token === 'string' && token.trim()) {
    return { authorization: `Bearer ${token.trim()}` }
  }
  if (apiUser && apiPassword) return { authorization: basicAuth(apiUser, apiPassword) }
  throw new TapdError('tapd/missing-credentials', '尚未配置 TAPD 个人访问令牌')
}

function hasBasic(credentials) {
  return Boolean(credentials?.apiUser && credentials?.apiPassword)
}

/**
 * GET a TAPD path as JSON. `params` are query values; `credentials` is
 * `{ token, apiUser, apiPassword }` resolved right before the request.
 */
export async function requestJson(path, params, credentials, options = {}) {
  const base = String(options.baseUrl || TAPD_BASE).replace(/\/+$/, '')
  const query = buildQuery(params)
  const url = `${base}/${String(path).replace(/^\/+/, '')}${query ? `?${query}` : ''}`
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const timeout = AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS)

  const send = async (mode) => {
    const headers = { accept: 'application/json' }
    if (mode === 'bearer') headers.authorization = `Bearer ${String(credentials.token).trim()}`
    if (mode === 'basic') headers.authorization = basicAuth(credentials.apiUser, credentials.apiPassword)
    let target = url
    if (mode === 'query') {
      target = `${url}${url.includes('?') ? '&' : '?'}${buildQuery({
        api_user: credentials.apiUser,
        api_password: credentials.apiPassword,
      })}`
    }
    return fetchImpl(target, { method: 'GET', headers, signal: timeout })
  }

  const primary = typeof credentials?.token === 'string' && credentials.token.trim() ? 'bearer' : 'basic'
  if (primary === 'basic' && !hasBasic(credentials)) {
    throw new TapdError('tapd/missing-credentials', '尚未配置 TAPD 个人访问令牌')
  }

  let response
  try {
    response = await send(primary)
    if (response.status === 401 || response.status === 403) {
      // A token can be valid for the REST API but rejected by a gateway that
      // still expects Basic; and Basic installs sometimes only accept query
      // credentials. Try the remaining modes once each.
      const fallbacks = primary === 'bearer' && hasBasic(credentials) ? ['basic', 'query'] : ['query']
      for (const mode of fallbacks) {
        if (response.status !== 401 && response.status !== 403) break
        response = await send(mode)
      }
    }
  } catch (error) {
    if (error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new TapdError('tapd/timeout', 'TAPD 请求超时')
    }
    throw new TapdError('tapd/network', `无法连接 TAPD：${error?.message ?? error}`)
  }

  const body = await readBody(response)
  if (response.status === 401 || response.status === 403) {
    throw new TapdError('tapd/auth-failed', 'TAPD 认证失败，请检查个人访问令牌')
  }
  if (response.status === 429) {
    throw new TapdError('tapd/rate-limited', 'TAPD 请求频率超限，请稍后重试')
  }
  if (!response.ok) {
    const detail = errorMessageOf(body)
    throw new TapdError('tapd/http-error', `TAPD 返回 ${response.status}${detail ? `：${detail}` : ''}`)
  }
  if (!body || typeof body !== 'object' || !('status' in body)) {
    throw new TapdError('tapd/bad-response', 'TAPD 返回内容无法解析')
  }
  if (Number(body.status) !== 1) {
    const detail = errorMessageOf(body)
    throw new TapdError('tapd/api-error', detail || 'TAPD 接口返回失败', body.info)
  }
  return body
}

/**
 * Projects the token owner participates in. TAPD resolves them from the user
 * nick (the part before `@` in the email address TAPD knows); there is no
 * "current user" endpoint on the personal-token API.
 */
export async function listProjects(options) {
  const { credentials, nick } = options ?? {}
  const user = String(nick ?? '').trim()
  if (!user) {
    throw new TapdError('tapd/missing-nick', '需要填写 TAPD 昵称（通常是邮箱 @ 前面的部分）才能列出你参与的项目')
  }
  const body = await requestJson('workspaces/user_participant_projects', { nick: user }, credentials, options)
  const rows = Array.isArray(body.data) ? body.data : []
  const projects = []
  for (const row of rows) {
    const project = normalizeProject(row?.Workspace ?? row)
    if (project && project.category !== 'organization') projects.push(project)
  }
  // Prefer standard projects when choosing a default workspace.
  projects.sort((left, right) => {
    const rank = (entry) => (entry.category === 'project' ? 0 : 1)
    return rank(left) - rank(right) || left.name.localeCompare(right.name, 'zh-Hans-CN')
  })
  return { projects, nick: user }
}

/** Iterations of one project, newest first, keyed by id. */
export async function fetchIterations(options) {
  const { credentials, projectId, limit = 100, maxPages = 3 } = options ?? {}
  if (!projectId) throw new TapdError('tapd/missing-projects', '缺少 TAPD 项目 ID')
  const map = new Map()
  for (let page = 1; page <= maxPages; page += 1) {
    const body = await requestJson(
      'iterations',
      { workspace_id: projectId, limit, page, order: 'startdate desc' },
      credentials,
      options,
    )
    const rows = Array.isArray(body.data) ? body.data : []
    for (const row of rows) {
      const iteration = row?.Iteration ?? row
      const id = String(iteration?.id ?? '').trim()
      if (!id) continue
      map.set(id, {
        id,
        name: String(iteration.name ?? '').trim() || id,
        status: String(iteration.status ?? '').trim(),
        startdate: String(iteration.startdate ?? '').trim(),
        enddate: String(iteration.enddate ?? '').trim(),
      })
    }
    if (rows.length < limit) break
  }
  return map
}

/**
 * Stories assigned to `owner` across the configured projects.
 * Returns `{ stories, rawCount, projects, iterations }`; per-project failures
 * are reported instead of aborting when at least one project succeeded.
 */
/**
 * Look up a handful of stories by id, used to resolve parent requirements that
 * do not belong to the current owner but name the branch we work on.
 */
export async function fetchStoriesByIds(options) {
  const { credentials, projectId, ids = [] } = options ?? {}
  const wanted = (Array.isArray(ids) ? ids : []).map(String).map((id) => id.trim()).filter(Boolean)
  const out = new Map()
  for (let index = 0; index < wanted.length; index += 50) {
    const chunk = wanted.slice(index, index + 50)
    const body = await requestJson(
      'stories',
      {
        workspace_id: projectId,
        // TAPD keeps only the last repeated `id` parameter; a comma list works.
        id: chunk.join(','),
        limit: Math.min(MAX_LIMIT, Math.max(chunk.length, 1)),
        fields: STORY_FIELDS,
        with_v_status: 1,
      },
      credentials,
      options,
    )
    const rows = Array.isArray(body.data) ? body.data : []
    for (const row of rows) {
      const story = normalizeStory(row?.Story ?? row, projectId)
      if (story) out.set(story.id, story)
    }
  }
  return out
}

export async function fetchMyStories(options) {
  const {
    credentials,
    projects,
    owner = '',
    limit = MAX_LIMIT,
    maxPages = 5,
    excludeCompleted = true,
  } = options ?? {}
  const ids = Array.isArray(projects) ? projects.map(String).filter(Boolean) : []
  if (ids.length === 0) {
    throw new TapdError('tapd/missing-projects', '尚未配置 TAPD 项目')
  }

  const stories = new Map()
  const projectResults = []
  const iterations = []
  let rawCount = 0
  let firstError = null

  for (const projectId of ids) {
    let count = 0
    let specs = []
    try {
      specs = await fetchCustomFieldSpecs({ credentials, projectId, ...options })
      const fields = storyFieldsFor(specs)
      for (let page = 1; page <= maxPages; page += 1) {
        const body = await requestJson(
          'stories',
          {
            workspace_id: projectId,
            owner,
            limit,
            page,
            fields,
            with_v_status: 1,
          },
          credentials,
          options,
        )
        const rows = Array.isArray(body.data) ? body.data : []
        rawCount += rows.length
        for (const row of rows) {
          const story = normalizeStory(row?.Story ?? row, projectId, specs)
          if (!story) continue
          stories.set(story.id, story)
          count += 1
        }
        if (rows.length < limit) break
      }
      projectResults.push({ id: projectId, count, ok: true })
    } catch (error) {
      projectResults.push({ id: projectId, count: 0, ok: false, error: error?.message ?? String(error), code: error?.code })
      if (!firstError) firstError = error
    }
  }

  if (projectResults.every((entry) => !entry.ok)) {
    throw firstError ?? new TapdError('tapd/api-error', 'TAPD 接口返回失败')
  }

  // Iteration names are needed for the TAPD-style grouping; a failure here
  // must not hide the stories that did load.
  for (const entry of projectResults) {
    if (!entry.ok) continue
    try {
      const map = await fetchIterations({ credentials, projectId: entry.id, ...options })
      for (const iteration of map.values()) iterations.push({ ...iteration, projectId: entry.id })
      for (const story of stories.values()) {
        if (story.projectId !== entry.id) continue
        const iteration = map.get(story.iterationId)
        if (iteration) story.iterationName = iteration.name
      }
    } catch {
      // Keep stories without iteration labels.
    }
  }

  // Child stories inherit the parent requirement: its number names the branch
  // and its title is what people call the task in TAPD.
  const roots = new Map()
  const pending = new Map()
  for (const story of stories.values()) {
    if (!story.rootId || story.rootId === story.id) continue
    if (stories.has(story.rootId)) {
      roots.set(story.rootId, stories.get(story.rootId))
      continue
    }
    const bucket = pending.get(story.projectId) ?? []
    bucket.push(story.rootId)
    pending.set(story.projectId, bucket)
  }
  for (const [projectId, ids] of pending) {
    try {
      const fetched = await fetchStoriesByIds({ credentials, projectId, ids: [...new Set(ids)], ...options })
      for (const [id, root] of fetched) roots.set(id, root)
    } catch {
      // Without the parent we still show the child with its own number.
    }
  }
  for (const story of stories.values()) {
    const root = roots.get(story.rootId)
    if (root && root.id !== story.id) {
      story.rootName = root.name
      story.rootShortId = root.shortId || story.rootShortId
      story.rootUrl = root.url
      story.rootOwner = root.owner
    }
  }

  let list = [...stories.values()]
  if (excludeCompleted) list = list.filter((story) => !story.completed)
  list.sort((left, right) => String(right.modified).localeCompare(String(left.modified)))
  return { stories: list, rawCount, projects: projectResults, iterations }
}

/**
 * Attachments pinned to a story. TAPD keeps them in the same attachments table
 * as bugs/tasks, keyed by the long story id (`entry_id`).
 */
export async function fetchStoryAttachments(options) {
  const { credentials, projectId, storyId, limit = 50, maxPages = 2 } = options ?? {}
  if (!projectId) throw new TapdError('tapd/missing-projects', '缺少 TAPD 项目 ID')
  if (!storyId) throw new TapdError('tapd/bad-request', '缺少需求 ID')
  const attachments = []
  for (let page = 1; page <= maxPages; page += 1) {
    const body = await requestJson(
      'attachments',
      { workspace_id: projectId, entry_id: storyId, type: 'story', limit, page },
      credentials,
      options,
    )
    const rows = Array.isArray(body.data) ? body.data : []
    for (const row of rows) {
      const item = row?.Attachment ?? row
      const id = String(item?.id ?? '').trim()
      if (!id) continue
      attachments.push({
        id,
        name: String(item.filename ?? '').trim() || `附件-${id}`,
        contentType: String(item.content_type ?? '').trim(),
        created: String(item.created ?? '').trim(),
        owner: String(item.owner ?? '').trim(),
        projectId: String(projectId),
        storyId: String(storyId),
      })
    }
    if (rows.length < limit) break
  }
  return attachments
}

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

/**
 * Download one attachment. TAPD hands out a short-lived signed URL first, then
 * the bytes come straight from that URL (no credentials needed).
 */
const IMAGE_MEDIA_TYPES = new Map([
  ['image/png', 'image/png'],
  ['image/jpeg', 'image/jpeg'],
  ['image/jpg', 'image/jpeg'],
  ['image/webp', 'image/webp'],
  ['image/gif', 'image/gif'],
])

export const MAX_IMAGE_COUNT = 12
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024
export const MAX_IMAGE_TOTAL = 10 * 1024 * 1024

/** Relative capture paths of the images embedded in a story description. */
export function extractImagePaths(description) {
  const html = String(description ?? '')
  const paths = []
  const pattern = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi
  let match
  while ((match = pattern.exec(html))) {
    const src = match[1].trim()
    if (!src || src.startsWith('data:')) continue
    if (!/\.(png|gif|jpe?g|bmp)(\?|$)/i.test(src)) continue
    if (!paths.includes(src)) paths.push(src)
  }
  return paths
}

function imageMediaType(contentType, name) {
  const base = String(contentType ?? '').split(';')[0].trim().toLowerCase()
  if (IMAGE_MEDIA_TYPES.has(base)) return IMAGE_MEDIA_TYPES.get(base)
  const ext = String(name).split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return ''
}

/**
 * Download the images embedded in one or more story descriptions so the
 * dispatched agent can actually look at them. Images live behind /tfl/captures
 * and are not part of the 附件 list, so they need files/get_image to obtain a
 * temporary URL. `descriptions` merges a child story with its parent/root so a
 * requirement-level screenshot is not lost when it only exists upstream.
 */
export async function fetchStoryImages(options) {
  const { credentials, projectId, description, descriptions } = options ?? {}
  const limit = Number(options?.limit) || MAX_IMAGE_COUNT
  const sources = Array.isArray(descriptions) ? descriptions : [description]
  const paths = []
  for (const source of sources) {
    for (const imagePath of extractImagePaths(source)) {
      if (!paths.includes(imagePath)) paths.push(imagePath)
    }
  }
  paths.splice(limit)
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const maxBytes = Number(options.maxBytes) || MAX_IMAGE_BYTES
  const maxTotal = Number(options.maxTotal) || MAX_IMAGE_TOTAL
  const images = []
  let total = 0
  for (const [index, imagePath] of paths.entries()) {
    const rawName = decodeURIComponent(String(imagePath).split('/').pop() || `image-${index + 1}.png`)
    const name = rawName.split('?')[0]
    let body
    try {
      body = await requestJson(
        'files/get_image',
        { workspace_id: projectId, image_path: imagePath },
        credentials,
        options,
      )
    } catch (error) {
      throw new TapdError('tapd/image-failed', `获取需求图片「${name}」的下载地址失败：${error?.message ?? error}`, {
        image: name,
      })
    }
    const url = String(body?.data?.Attachment?.download_url ?? '').trim()
    if (!url) throw new TapdError('tapd/image-failed', `TAPD 没有返回需求图片「${name}」的下载地址`, { image: name })
    let response
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(60_000) })
    } catch (error) {
      throw new TapdError('tapd/image-failed', `下载需求图片「${name}」失败：${error?.message ?? error}`, { image: name })
    }
    if (!response.ok) throw new TapdError('tapd/image-failed', `下载需求图片「${name}」失败：HTTP ${response.status}`, { image: name })
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength > maxBytes) {
      throw new TapdError('tapd/image-too-large', `需求图片「${name}」超过 ${Math.round(maxBytes / 1024 / 1024)}MB，无法随首条消息发送`, {
        image: name,
        bytes: buffer.byteLength,
      })
    }
    total += buffer.byteLength
    if (total > maxTotal) {
      throw new TapdError('tapd/image-too-large', `需求图片合计超过 ${Math.round(maxTotal / 1024 / 1024)}MB，无法随首条消息发送`, {
        total,
      })
    }
    const mediaType = imageMediaType(response.headers?.get?.('content-type'), name)
    if (!mediaType) {
      throw new TapdError('tapd/image-unsupported', `需求图片「${name}」的格式无法作为图片发送`, { image: name })
    }
    images.push({ name, mediaType, data: new Uint8Array(buffer) })
  }
  return images
}

export async function downloadAttachment(options) {
  const { credentials, projectId, attachment } = options ?? {}
  if (!attachment?.id) throw new TapdError('tapd/bad-request', '缺少附件 ID')
  const body = await requestJson(
    'attachments/down',
    { workspace_id: projectId, id: attachment.id },
    credentials,
    options,
  )
  const url = String(body?.data?.Attachment?.download_url ?? '').trim()
  if (!url) {
    throw new TapdError('tapd/attachment-failed', `TAPD 没有返回附件「${attachment.name}」的下载地址`)
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  let response
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(60_000) })
  } catch (error) {
    throw new TapdError('tapd/attachment-failed', `下载附件「${attachment.name}」失败：${error?.message ?? error}`)
  }
  if (!response.ok) {
    throw new TapdError('tapd/attachment-failed', `下载附件「${attachment.name}」失败：HTTP ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const maxBytes = Number(options.maxBytes) || MAX_ATTACHMENT_BYTES
  if (buffer.byteLength > maxBytes) {
    throw new TapdError(
      'tapd/attachment-too-large',
      `附件「${attachment.name}」超过 ${Math.round(maxBytes / 1024 / 1024)}MB，无法随首条消息发送`,
      { attachment: attachment.name, bytes: buffer.byteLength },
    )
  }
  return {
    name: attachment.name,
    contentType: attachment.contentType,
    data: new Uint8Array(buffer),
  }
}

/** Fetch one story by id; used to refresh before dispatch. */
export async function fetchStory(options) {
  const { credentials, projectId, storyId } = options ?? {}
  if (!projectId) throw new TapdError('tapd/missing-projects', '缺少 TAPD 项目 ID')
  if (!storyId) throw new TapdError('tapd/bad-request', '缺少需求 ID')
  const specs = await fetchCustomFieldSpecs({ credentials, projectId, ...options })
  const body = await requestJson(
    'stories',
    { workspace_id: projectId, id: storyId, limit: 1, fields: storyFieldsFor(specs), with_v_status: 1 },
    credentials,
    options,
  )
  const rows = Array.isArray(body.data) ? body.data : []
  for (const row of rows) {
    const story = normalizeStory(row?.Story ?? row, projectId, specs)
    if (story && story.id === String(storyId)) return story
  }
  throw new TapdError('tapd/story-not-found', `TAPD 上找不到需求 ${storyId}`)
}

/** Gather a TAPD requirement’s own and inherited assets for dispatch. */
export async function fetchStoryAssets({ credentials, projectId, story, fetchImpl }) {
  const targetProject = projectId || String(story?.projectId ?? '')
  if (!targetProject) return { files: [], images: [] }

  const related = [story]
  for (const id of [story.parentId, story.rootId]) {
    const relatedId = String(id ?? '').trim()
    if (!relatedId || related.some((item) => item.id === relatedId)) continue
    try {
      related.push(await fetchStory({ credentials, projectId: targetProject, storyId: relatedId, fetchImpl }))
    } catch (error) {
      // A parent that is invisible or temporarily unavailable must not block
      // the child dispatch; its own assets are still delivered.
      console.warn(
        `[dsh-task-hub] 父需求 ${relatedId} 读取失败，继续使用当前需求：${error?.message ?? error}`,
      )
    }
  }

  const attachments = []
  const seenAttachments = new Set()
  for (const relatedStory of related) {
    const rows = await fetchStoryAttachments({
      credentials,
      projectId: targetProject,
      storyId: relatedStory.id,
      fetchImpl,
    })
    for (const attachment of rows) {
      if (seenAttachments.has(attachment.id)) continue
      seenAttachments.add(attachment.id)
      attachments.push(attachment)
    }
  }
  const files = []
  for (const attachment of attachments) {
    files.push(await downloadAttachment({ credentials, projectId: targetProject, attachment, fetchImpl }))
  }
  // Images pasted into the description are not 附件; fetch them through
  // files/get_image so the agent sees the screenshots, not just a name.
  const images = await fetchStoryImages({
    credentials,
    projectId: targetProject,
    fetchImpl,
    descriptions: related.map((item) => item.description),
  })
  return { files, images }
}
