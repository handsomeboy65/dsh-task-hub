/**
 * Prompt construction for a dispatched requirement/task. Kept pure so the
 * wording can be unit tested without a host or network.
 */

const ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
}

/** Convert the HTML-ish TAPD story description into readable plain text. */
export function htmlToText(input) {
  if (typeof input !== 'string' || !input.trim()) return ''
  let text = input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|h[1-6]|tr|blockquote)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, '')
  text = text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const key = `&${entity.toLowerCase()};`
    if (ENTITIES[key]) return ENTITIES[key]
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return match
  })
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const SOURCE_LABELS = {
  tapd: 'TAPD',
  zentao: '禅道',
}

function sourceLabel(story) {
  return SOURCE_LABELS[story?.source] ?? SOURCE_LABELS.tapd
}

function itemLabel(story) {
  if (story?.source === 'zentao') {
    if (story.kind === 'task') return '任务'
    if (story.requirementType === 'epic') return '业务需求'
    if (story.requirementType === 'requirement') return '用户需求'
    if (story.requirementType === 'story') return '研发需求'
  }
  return '需求'
}

function taskContentSections(story, options) {
  const label = sourceLabel(story)
  const description = htmlToText(story?.description ?? '')
  const attachments = Array.isArray(options.attachments)
    ? options.attachments.filter((attachment) => attachment && attachment.name)
    : []
  const images = Array.isArray(options.images)
    ? options.images.filter((image) => image && image.name)
    : []

  return [
    [
      // The composer shows raw text, so section labels are plain bracket
      // headings instead of Markdown `##` lines.
      '【需求内容】',
      '',
      description || `（${label} 上没有填写描述，请先阅读参考资料；若仍无法确定目标，请提出需要澄清的问题。）`,
    ]
      .join('\n'),
    attachments.length > 0 || images.length > 0
      ? [
          '【参考资料】',
          '',
          ...attachments.map((attachment) => `- 附件：${attachment.name}`),
          ...images.map((image) => `- 图片：${image.name}`),
        ].join('\n')
      : '',
  ].filter(Boolean)
}

/**
 * Build the first message placed in the new session's composer. The composer
 * renders raw text, so the brief deliberately avoids Markdown syntax.
 */
export function buildTaskPrompt(story, options = {}) {
  // ZenTao normalizes `shortId` to `#4` for display, so the leading marker has
  // to be removed before composing `#4` — otherwise the title reads `##4`.
  const id = String(story?.shortId || story?.id || '').trim().replace(/^#+/, '')
  const name = String(story?.name ?? '').trim() || `需求 ${id}`
  const rootId = String(story?.rootShortId ?? '').trim().replace(/^#+/, '')
  const rootName = String(story?.rootName ?? '').trim()
  const isChild = Boolean(rootId) && rootId !== id
  const label = sourceLabel(story)
  const kind = itemLabel(story)

  const sections = [
    [
      `${label}${kind} #${id}：${name}`,
      [
        story?.url ? `需求地址：${story.url}` : '',
        isChild ? `父需求：${rootId}${rootName ? ` ${rootName}` : ''}` : '',
        story?.app ? `关联应用：${story.app}` : '',
      ].filter(Boolean).join('\n'),
    ]
      .filter(Boolean)
      .join('\n\n'),
    ...taskContentSections(story, options),
  ]
  return sections.filter(Boolean).join('\n\n')
}

/** Short session title for the sidebar. */
export function sessionTitleFor(story, options = {}) {
  const name = String(story?.name ?? '').trim()
  const branch = String(options.branch ?? '').trim()
  const text = branch && name ? `${branch} · ${name}` : branch || name
  return text.length > 80 ? `${text.slice(0, 77)}…` : text
}

/** Refresh only the generated description and assets, preserving the 【补充要求】 section. */
export function refreshTaskPrompt(text, story, options = {}) {
  const content = taskContentSections(story, options).join('\n\n')
  // Accept the plain-text template as well as drafts saved with the old
  // Markdown headings; legacy sections are replaced by the compact brief.
  const markers = ['\n\n【需求内容】\n', '\n\n## 需求内容\n', '\n\n## 需求描述\n']
  const boundaries = ['\n\n【补充要求】\n', '\n\n## 补充要求\n']
  for (const marker of markers) {
    const start = text.indexOf(marker)
    if (start < 0) continue
    let end = text.length
    for (const boundary of boundaries) {
      const at = text.indexOf(boundary, start + marker.length)
      if (at >= 0 && at < end) end = at
    }
    return `${text.slice(0, start)}\n\n${content}${text.slice(end)}`
  }
  return [text, content].filter(Boolean).join('\n\n')
}

const LEGACY_HEADINGS = new Map([
  ['需求内容', '【需求内容】'],
  ['需求描述', '【需求内容】'],
  ['参考资料', '【参考资料】'],
  ['补充要求', '【补充要求】'],
  ['补充说明', '【补充要求】'],
])

// Sections the brief no longer carries. Older drafts kept the checkout facts
// and the operator instructions in the composer; the dispatch record and the
// session title still know the branch, so the text drops them.
const LEGACY_DROPPED_HEADINGS = new Set(['工作环境', '执行要求', '工作方式'])

/**
 * Rewrite a composer draft saved with the old Markdown template into the
 * plain-text one. Drafts are persisted with their text, so changing the
 * template alone leaves every earlier record showing `## …` headings; the
 * store upgrades them while reading instead of rewriting files on disk.
 */
export function upgradeDraftText(input) {
  const text = typeof input === 'string' ? input : ''
  // Fast path: drafts written with the plain-text template have no headings.
  if (!text.includes('## ')) return text
  const output = []
  let dropping = false
  for (const line of text.split('\n')) {
    const heading = /^## +(.+?)\s*$/.exec(line)
    if (heading) {
      const label = heading[1].trim()
      if (LEGACY_HEADINGS.has(label)) {
        dropping = false
        output.push(LEGACY_HEADINGS.get(label))
        continue
      }
      if (LEGACY_DROPPED_HEADINGS.has(label)) {
        dropping = true
        continue
      }
      // A heading the operator wrote themselves: keep it verbatim.
      dropping = false
      output.push(line)
      continue
    }
    if (!dropping) output.push(line)
  }
  if (/^# /.test(output[0] ?? '')) {
    // The title used to be a Markdown H1; `##4` came from the ZenTao short id.
    output[0] = output[0].slice(2).trim().replace(/(^|\s)##(\d)/g, '$1#$2')
  }
  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
