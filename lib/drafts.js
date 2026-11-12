/**
 * Draft asset storage for "dispatch without sending".
 *
 * A draft dispatch keeps the requirement text and its files/images out of the
 * conversation: the panel opens the session, seeds the composer, and lets the
 * operator press send. The composer can only accept real browser `File`
 * objects, so the bytes are parked on disk here and streamed to the Client by
 * the `/api/task-hub/asset` route; everything stays readable after a reload
 * until the draft folder is cleaned up.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { DATA_DIR } from './store.js'

export const DRAFT_DIR = path.join(DATA_DIR, 'drafts')

/** Session ids are host-generated uuids; reject anything path-like. */
function sessionDir(sessionId, root = DRAFT_DIR) {
  const id = String(sessionId ?? '').trim()
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(id) || id.startsWith('.')) {
    throw Object.assign(new Error('无效的会话 ID'), { code: 'draft/bad-session' })
  }
  return path.join(root, id)
}

function assetDir(sessionId, root, draftId) {
  const dir = sessionDir(sessionId, root)
  if (draftId == null) return dir
  if (typeof draftId !== 'string' || !/^[a-f0-9-]{36}$/.test(draftId)) {
    throw Object.assign(new Error('无效的草稿 ID'), { code: 'draft/bad-id' })
  }
  return path.join(dir, 'revisions', draftId)
}

function itemName(name, kind, index) {
  const base = String(name ?? '').trim() || `${kind}-${index}`
  return base.replace(/[\\/:*?"<>|\r\n\t]+/g, '_').slice(0, 120)
}

/**
 * Persist one dispatch's assets and return the descriptors the Client fetches.
 * `files` are attachments (any type), `images` are inline screenshots whose
 * media type decides how the composer renders them.
 */
export async function saveDraftAssets({ sessionId, files = [], images = [], root = DRAFT_DIR, draftId }) {
  const dir = assetDir(sessionId, root, draftId)
  await mkdir(dir, { recursive: true })
  const items = []
  let index = 0
  const write = async (entry, kind) => {
    const name = itemName(entry.name, kind, index)
    const mediaType =
      kind === 'image'
        ? String(entry.mediaType || 'image/png')
        : String(entry.mediaType || 'application/octet-stream')
    await writeFile(path.join(dir, `${index}.bin`), Buffer.from(entry.data))
    items.push({
      index,
      kind,
      name,
      mediaType,
      bytes: entry.data.byteLength,
    })
    index += 1
  }
  for (const file of files) await write(file, 'file')
  for (const image of images) await write(image, 'image')
  await writeFile(
    path.join(dir, 'manifest.json'),
    JSON.stringify({ sessionId: String(sessionId), createdAt: new Date().toISOString(), items }, null, 2),
  )
  return items
}

/** Read one stored asset back for the Client; the manifest is the authority. */
export async function readDraftAsset({ sessionId, index, root = DRAFT_DIR, draftId }) {
  const dir = assetDir(sessionId, root, draftId)
  const wanted = Number(index)
  if (!Number.isInteger(wanted) || wanted < 0 || wanted > 999) {
    throw Object.assign(new Error('附件序号无效'), { code: 'draft/bad-index' })
  }
  const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'))
  const item = (manifest.items ?? []).find((entry) => entry.index === wanted)
  if (!item) throw Object.assign(new Error('附件不存在'), { code: 'draft/missing-asset' })
  const data = await readFile(path.join(dir, `${wanted}.bin`))
  return { name: item.name, mediaType: item.mediaType, kind: item.kind, bytes: data.byteLength, data }
}

/** Drop a session's draft assets once they are no longer needed. */
export async function clearDraftAssets(sessionId, root = DRAFT_DIR) {
  await rm(sessionDir(sessionId, root), { recursive: true, force: true })
}
