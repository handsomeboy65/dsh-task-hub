/**
 * Prompt construction for a dispatched requirement/task. Kept pure so the
 * wording can be unit tested without a host or network.
 */

const MAX_DESCRIPTION_CHARS = 6000

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
  gitlab: 'GitLab',
}

function sourceLabel(story) {
  return SOURCE_LABELS[story?.source] ?? SOURCE_LABELS.tapd
}

function itemLabel(story) {
  if (story?.source === 'gitlab') return 'Issue'
  if (story?.source === 'zentao' && story?.kind === 'task') return '任务'
  return '需求'
}

function describeStory(story) {
  const rows = []
  const label = sourceLabel(story)
  if (story.owner) rows.push(`- 处理人：${story.owner}`)
  if (story.vStatus || story.status) rows.push(`- 状态：${story.vStatus || story.status}`)
  if (story.priorityLabel) rows.push(`- 优先级：${story.priorityLabel}`)
  if (story.iterationName || story.iterationId) rows.push(`- 迭代/里程碑：${story.iterationName || story.iterationId}`)
  if (story.begin) rows.push(`- 开始：${story.begin}`)
  if (story.due) rows.push(`- 截止：${story.due}`)
  if (story.url) rows.push(`- ${label}：${story.url}`)
  return rows.join('\n')
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
  const plainDescription = htmlToText(story?.description ?? '')
  const description = plainDescription.slice(0, MAX_DESCRIPTION_CHARS)
  const truncated = plainDescription.length > MAX_DESCRIPTION_CHARS
  const attachments = Array.isArray(options.attachments)
    ? options.attachments.filter((attachment) => attachment && attachment.name)
    : []
  const images = Array.isArray(options.images)
    ? options.images.filter((image) => image && image.name)
    : []

  const checkout = worktreePath
    ? `当前会话的目录是为你单独检出的 worktree：\`${worktreePath}\`，分支 \`${branch}\`。`
    : `当前会话的目录就是目标仓库，分支已经切到 \`${branch}\`。`

  const sections = [
    [
      isChild
        ? `你现在负责 ${label} ${kind} ${rootId}${rootName ? `（${rootName}）` : ''}下的子${kind} ${id}：${name}。`
        : `你现在负责 ${label} ${kind} ${id}：${name}。`,
      '',
      checkout,
      baseBranch ? `这个分支基于 \`${baseBranch}\` 创建，请以它为比较基线。` : '',
    ]
      .filter((line, index, all) => line !== '' || all[index - 1] !== '')
      .join('\n'),
    [
      '## ' + label + ' 信息',
      [describeStory(story), isChild ? `- 父需求：${rootId}${rootName ? ` ${rootName}` : ''}` : '']
        .filter(Boolean)
        .join('\n') || '- （无附加字段）',
    ].join('\n'),
    [
      '## 需求描述',
      description || `（${label} 上没有填写描述，请先根据标题和代码上下文推断范围，并在动手前把假设说清楚。）`,
      truncated ? `（描述过长，已截断；需要时可直接打开 ${label} 查看完整内容。）` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    attachments.length > 0
      ? [
          '## 附件',
          `需求附带的 ${attachments.length} 个文件已随本条消息发送，可直接读取：`,
          ...attachments.map((attachment) => `- ${attachment.name}`),
        ].join('\n')
      : '',
    images.length > 0
      ? [
          '## 图片',
          `需求描述中的 ${images.length} 张图片已随本条消息发送，可以直接查看：`,
          ...images.map((image) => `- ${image.name}`),
        ].join('\n')
      : '',
    [
      '## 工作方式',
      '1. 先读需求、再看仓库现状（相关模块、已有约定、测试），必要时先提出一个简短的实施计划。',
      `2. 所有改动都留在 \`${branch}\` 分支上，不要切换或合并到其他分支；不要执行 push。`,
      '3. 改动保持聚焦，遵循仓库现有的代码风格与目录结构；不要顺手做无关重构。',
      '4. 实现后运行与改动相关的构建或测试；如果跑不起来，说明原因而不是假设通过。',
      '5. 最后用中文总结：做了什么、改了哪些文件、怎么验证、还有什么风险或后续事项。',
    ].join('\n'),
    '如果需求信息不足以确定实现方式，先列出你需要的澄清点，再按最合理的解释继续。',
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
