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
      '## 需求内容',
      '',
      description || `（${label} 上没有填写描述，请先阅读参考资料；若仍无法确定目标，请提出需要澄清的问题。）`,
    ]
      .join('\n'),
    attachments.length > 0 || images.length > 0
      ? [
          '## 参考资料',
          '',
          ...attachments.map((attachment) => `- 附件：${attachment.name}`),
          ...images.map((image) => `- 图片：${image.name}`),
        ].join('\n')
      : '',
  ].filter(Boolean)
}

/**
 * Build the first message sent to the dispatched agent.
 * `options.branch` / `options.baseBranch` / `options.worktreePath` describe the
 * checkout that was prepared before the session was created.
 */
export function buildTaskPrompt(story, options = {}) {
  const id = String(story?.shortId || story?.id || '').trim()
  const name = String(story?.name ?? '').trim() || `需求 ${id}`
  const rootId = String(story?.rootShortId ?? '').trim()
  const rootName = String(story?.rootName ?? '').trim()
  const isChild = Boolean(rootId) && rootId !== id
  const label = sourceLabel(story)
  const kind = itemLabel(story)
  const branch = String(options.branch ?? '').trim()
  const baseBranch = String(options.baseBranch ?? '').trim()
  const worktreePath = String(options.worktreePath ?? '').trim()
  const repoRoot = String(options.repoRoot ?? '').trim()

  const sections = [
    [
      `# ${label}${kind} #${id}：${name}`,
      [
        story?.url ? `需求地址：${story.url}` : '',
        isChild ? `父需求：${rootId}${rootName ? ` ${rootName}` : ''}` : '',
        story?.app ? `关联应用：${story.app}` : '',
      ].filter(Boolean).join('\n'),
    ]
      .filter(Boolean)
      .join('\n\n'),
    ...taskContentSections(story, options),
    [
      '## 工作环境',
      '',
      `- 仓库：${worktreePath || repoRoot ? `\`${worktreePath || repoRoot}\`` : '当前工作目录'}`,
      branch ? `- 工作分支：\`${branch}\`` : '',
      baseBranch ? `- 对比基线：\`${baseBranch}\`` : '',
    ].filter((line, index) => line || index === 1).join('\n'),
    [
      '## 执行要求',
      '',
      '1. 先阅读需求和参考资料，结合仓库现状确定改动范围。',
      '2. 若关键信息不足，说明需要澄清的问题；不影响判断的部分可按合理假设继续。',
      '3. 只在指定分支进行相关修改，不切换分支、不要执行 push。',
      '4. 完成后运行相关构建或测试；无法验证时说明原因。',
      '5. 用中文说明改动、验证结果和剩余问题。',
    ].join('\n'),
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

/** Refresh only the generated description and assets, preserving the rest of the draft. */
export function refreshTaskPrompt(text, story, options = {}) {
  const content = taskContentSections(story, options).join('\n\n')
  // Keep compatibility with drafts saved before the compact template.
  for (const [marker, boundary] of [
    ['\n\n## 需求内容\n', '\n\n## 工作环境\n'],
    ['\n\n## 需求内容\n', '\n\n## 工作方式\n1. 先读需求、再看仓库现状'],
    ['\n\n## 需求描述\n', '\n\n## 工作方式\n1. 先读需求、再看仓库现状'],
  ]) {
    const start = text.indexOf(marker)
    if (start < 0) continue
    const end = text.indexOf(boundary, start + marker.length)
    if (end >= 0) return `${text.slice(0, start)}\n\n${content}${text.slice(end)}`
  }
  return [text, content].filter(Boolean).join('\n\n')
}
