/**
 * Minimal GitLab (and JiHu GitLab) REST v4 client.
 *
 * Issues assigned to the token owner are listed with `scope=assigned_to_me`,
 * either instance-wide or scoped to one project. Markdown image/file links that
 * point at GitLab uploads are downloaded so they can ride along with the first
 * prompt message.
 */
const REQUEST_TIMEOUT_MS = 20_000
const PAGE_SIZE = 100
const MAX_PAGES = 5
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_BYTES = 20 * 1024 * 1024

export class GitlabError extends Error {
  constructor(code, message, details) {
    super(message)
    this.name = 'GitlabError'
    this.code = code
    this.details = details
  }
}

export function apiRoot(baseUrl) {
  const base = String(baseUrl ?? '').trim().replace(/\/+$/, '')
  if (!base) return ''
  if (/\/api\/v4$/i.test(base)) return base
  return `${base}/api/v4`
}

function headersFor(token) {
  return {
    accept: 'application/json',
    'private-token': String(token ?? '').trim(),
  }
}

export function projectRef(projectPath) {
  return encodeURIComponent(String(projectPath ?? '').trim())
}

async function readBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 500) }
  }
}

function errorMessageOf(body) {
  if (!body || typeof body !== 'object') return ''
  if (typeof body.message === 'string') return body.message
  if (Array.isArray(body.error)) return body.error.join('；')
  if (typeof body.error === 'string') return body.error
  return ''
}

async function requestJson(options) {
  const { baseUrl, token, path, method = 'GET', fetchImpl = globalThis.fetch } = options
  const root = apiRoot(baseUrl)
  if (!root) throw new GitlabError('gitlab/missing-base-url', '尚未填写 GitLab 地址')
  if (!String(token ?? '').trim()) throw new GitlabError('gitlab/missing-credentials', '尚未配置 GitLab 访问令牌')
  let response
  try {
    response = await fetchImpl(`${root}${path}`, {
      method,
      headers: headersFor(token),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new GitlabError('gitlab/timeout', 'GitLab 请求超时')
    }
    throw new GitlabError('gitlab/network', `无法连接 GitLab：${error?.message ?? error}`)
  }
  const body = await readBody(response)
  if (response.status === 401 || response.status === 403) {
    throw new GitlabError('gitlab/auth-failed', 'GitLab 认证失败，请检查访问令牌权限')
  }
  if (response.status === 404) {
    throw new GitlabError('gitlab/not-found', 'GitLab 上没有找到该项目或 Issue')
  }
  if (response.status === 429) {
    throw new GitlabError('gitlab/rate-limited', 'GitLab 请求频率超限，请稍后重试')
  }
  if (!response.ok) {
    const detail = errorMessageOf(body)
    throw new GitlabError('gitlab/http-error', `GitLab 返回 ${response.status}${detail ? `：${detail}` : ''}`)
  }
  return { body, headers: response.headers }
}

function normalizeStatus(state) {
  const value = String(state ?? '').trim().toLowerCase()
  return {
    status: value,
    vStatus: value === 'closed' ? '已关闭' : value === 'opened' ? '打开' : value,
    completed: value === 'closed',
  }
}

function normalizeLabel(raw) {
  if (!raw) return null
  if (typeof raw === 'string') return raw
  return String(raw.name ?? '').trim() || null
}

function normalizeFailure(raw) {
  if (!raw) return ''
  if (Array.isArray(raw)) return raw.map(normalizeLabel).filter(Boolean).join(', ')
  return normalizeLabel(raw) ?? ''
}

function normalizeIssue(raw, context) {
  if (!raw || typeof raw !== 'object') return null
  const iid = String(raw.iid ?? '').trim()
  if (!iid) return null
  const projectId = String(raw.project_id ?? context.projectPath ?? '').trim()
  const labels = (Array.isArray(raw.labels) ? raw.labels : []).map(normalizeLabel).filter(Boolean)
  const milestone = raw.milestone && typeof raw.milestone === 'object' ? raw.milestone : null
  const assignees = Array.isArray(raw.assignees) ? raw.assignees : []
  const owner = assignees.map((assignee) => normalizeFailure(assignee)).filter(Boolean).join('、')
  const status = normalizeStatus(raw.state)
  const priorityLabel = labels.find((label) => /^p\d$/i.test(label)) ?? labels.slice(0, 3).join(' · ')
  const projectName = String(raw.references?.full ?? '').split('#')[0].replace(/!$/, '') || context.projectPath || projectId
  return {
    source: 'gitlab',
    kind: 'issue',
    id: `issue-${projectId}-${iid}`,
    remoteId: iid,
    shortId: `#${iid}`,
    name: String(raw.title ?? '').trim() || `Issue ${iid}`,
    description: typeof raw.description === 'string' ? raw.description : '',
    ...status,
    owner,
    creator: normalizeFailure(raw.author),
    priority: '',
    priorityLabel,
    labels,
    due: String(milestone?.due_date ?? raw.due_date ?? '').trim(),
    begin: '',
    created: String(raw.created_at ?? '').trim().slice(0, 10),
    modified: String(raw.updated_at ?? '').trim().slice(0, 10),
    iterationId: milestone ? String(milestone.id ?? '') : '',
    iterationName: milestone ? String(milestone.title ?? '').trim() : '',
    categoryId: '',
    projectId,
    projectName,
    url: String(raw.web_url ?? '').trim(),
    rootId: '',
    rootShortId: '',
    level: '1',
  }
}

async function listPaged(options, pathForPage) {
  const rows = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { body, headers } = await requestJson({ ...options, path: pathForPage(page) })
    if (!Array.isArray(body)) throw new GitlabError('gitlab/bad-response', 'GitLab 返回内容无法解析')
    rows.push(...body)
    const next = String(headers?.get?.('x-next-page') ?? '').trim()
    if (next ? !/^\d+$/.test(next) : body.length < PAGE_SIZE) break
  }
  return rows
}

/** Issues assigned to me, optionally limited to one project path (`group/project`). */
export async function fetchMyIssues(options) {
  const { baseUrl, token, projectPath, labels, excludeCompleted, fetchImpl } = options ?? {}
  const project = String(projectPath ?? '').trim().replace(/^\/+|\/+$/g, '')
  const state = excludeCompleted === false ? 'all' : 'opened'
  const labelQuery = String(labels ?? '').trim()
  const basePath = project ? `/projects/${projectRef(project)}/issues` : '/issues'
  const query = (page) => {
    const search = new URLSearchParams({
      scope: 'assigned_to_me',
      state,
      per_page: String(PAGE_SIZE),
      page: String(page),
      order_by: 'updated_at',
    })
    if (labelQuery) search.set('labels', labelQuery)
    return `${basePath}?${search.toString()}`
  }
  const rows = await listPaged({ baseUrl, token, fetchImpl }, query)
  const stories = rows
    .map((raw) => normalizeIssue(raw, { projectPath: project }))
    .filter(Boolean)
  return {
    stories,
    rawCount: rows.length,
    iterations: [...new Set(stories.map((story) => story.iterationName).filter(Boolean))],
    containerName: project,
  }
}

/** Fetch one issue fresh, so a dispatch uses the latest description. */
export async function fetchIssue(options) {
  const { baseUrl, token, projectPath, iid, projectId, webUrl } = options ?? {}
  const project = String(projectId ?? projectPath ?? '').trim()
  if (!project) {
    if (!webUrl) throw new GitlabError('gitlab/bad-request', '缺少 GitLab 项目信息')
    const match = String(webUrl).match(/^(.*?)\/([^/]+)\/-\/issues\/(\d+)/)
    if (!match) throw new GitlabError('gitlab/bad-request', '无法从 Issue 链接解析项目')
    const [, host, repo, remoteIid] = match
    const { body } = await requestJson({
      baseUrl: host,
      token,
      path: `/projects/${projectRef(decodeURIComponent(repo))}/issues/${remoteIid}`,
    })
    return normalizeIssue(body, { projectPath: decodeURIComponent(repo) })
  }
  const { body } = await requestJson({
    baseUrl,
    token,
    path: `/projects/${projectRef(project)}/issues/${encodeURIComponent(iid)}`,
  })
  return normalizeIssue(body, { projectPath: project })
}

function absoluteUpload(url, baseUrl) {
  const raw = String(url ?? '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  const base = String(baseUrl ?? '').trim().replace(/\/+$/, '')
  if (!base) return ''
  if (raw.startsWith('/uploads/') || raw.startsWith('uploads/')) return `${base}/${raw.replace(/^\/+/, '')}`
  return ''
}

function uploadLinks(description, baseUrl) {
  const text = String(description ?? '')
  const images = []
  const files = []
  const seen = new Set()
  const imageRe = /!\[[^\]]*\]\(([^)\s]+)\)/g
  const fileRe = /(?<!!)\[[^\]]*\]\(([^)\s]+)\)/g
  for (const match of text.matchAll(imageRe)) {
    const url = absoluteUpload(match[1], baseUrl)
    if (!url || seen.has(url)) continue
    seen.add(url)
    images.push(url)
  }
  for (const match of text.matchAll(fileRe)) {
    const url = absoluteUpload(match[1], baseUrl)
    if (!url || seen.has(url) || images.includes(url)) continue
    seen.add(url)
    files.push(url)
  }
  return { images, files }
}

function fileNameOf(url, fallback) {
  try {
    const pathname = new URL(url).pathname
    const name = decodeURIComponent(pathname.split('/').pop() ?? '')
    return name && name.length <= 120 ? name : fallback
  } catch {
    return fallback
  }
}

function imageTypeOf(name, contentType) {
  const type = String(contentType ?? '').split(';')[0].trim().toLowerCase()
  if (['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(type)) return type
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  return ''
}

async function download(url, token, fetchImpl) {
  let response
  try {
    response = await fetchImpl(url, {
      headers: { 'private-token': String(token ?? '').trim() },
      signal: AbortSignal.timeout(60_000),
    })
  } catch (error) {
    throw new GitlabError('gitlab/image-failed', `下载 GitLab 附件失败：${error?.message ?? error}`)
  }
  if (!response.ok) throw new GitlabError('gitlab/image-failed', `下载 GitLab 附件失败：HTTP ${response.status}`)
  return response
}

/** Download description images and non-image uploads, bounded by size. */
export async function fetchIssueAssets(options) {
  const { description, baseUrl, token, fetchImpl = globalThis.fetch } = options ?? {}
  const links = uploadLinks(description, baseUrl)
  const files = []
  const images = []
  let total = 0
  for (const url of links.files) {
    const response = await download(url, token, fetchImpl)
    const data = new Uint8Array(await response.arrayBuffer())
    if (data.byteLength > MAX_IMAGE_BYTES || total + data.byteLength > MAX_TOTAL_BYTES) continue
    total += data.byteLength
    files.push({ name: fileNameOf(url, 'gitlab-upload'), data })
  }
  for (const url of links.images) {
    const response = await download(url, token, fetchImpl)
    const mediaType = imageTypeOf(fileNameOf(url, ''), response.headers.get('content-type'))
    if (!mediaType) continue
    const data = new Uint8Array(await response.arrayBuffer())
    if (data.byteLength > MAX_IMAGE_BYTES || total + data.byteLength > MAX_TOTAL_BYTES) continue
    total += data.byteLength
    images.push({ name: fileNameOf(url, 'gitlab-image'), mediaType, data })
  }
  return { files, images, skipped: links.images.length + links.files.length - files.length - images.length }
}
