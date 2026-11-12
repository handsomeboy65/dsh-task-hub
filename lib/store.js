/**
 * Settings and dispatch-state persistence for the task view.
 *
 * The harness storage domain service needs a zod DomainSpec, which is more
 * machinery than this plugin needs, so two small JSON files live under
 * ~/.dsh/task-hub/. Secrets never go here: API passwords and tokens are owned
 * by the host credentials service.
 *
 * Settings are grouped per source so TAPD and ZenTao can coexist. Older
 * flat TAPD settings are migrated on read.
 */
import { randomUUID } from 'node:crypto'
import { access, cp, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const DATA_DIR = path.join(os.homedir(), '.dsh', 'task-hub')
export const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
export const STATE_FILE = path.join(DATA_DIR, 'state.json')

// The plugin used to be called dsh-tapd-tasks and kept its files here. Copy
// them across once on first read so the rename does not wipe source config or
// dispatch history.
const LEGACY_DIR = path.join(os.homedir(), '.dsh', 'tapd-tasks')

let readyPromise = null
const writes = new Map()

function serializeWrite(file, operation) {
  const next = (writes.get(file) ?? Promise.resolve()).catch(() => {}).then(operation)
  writes.set(file, next)
  return next.finally(() => {
    if (writes.get(file) === next) writes.delete(file)
  })
}

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function migrateLegacyData() {
  if (!(await exists(LEGACY_DIR))) return
  for (const name of ['settings.json', 'state.json']) {
    const target = path.join(DATA_DIR, name)
    if (await exists(target)) continue
    if (await exists(path.join(LEGACY_DIR, name))) {
      await cp(path.join(LEGACY_DIR, name), target)
    }
  }
}

function ready() {
  readyPromise ??= (async () => {
    await mkdir(DATA_DIR, { recursive: true })
    try {
      await migrateLegacyData()
    } catch {
      // Never block the panel on a migration hiccup; defaults are used instead.
    }
  })()
  return readyPromise
}

export const PROVIDERS = ['tapd', 'zentao']

export const DEFAULT_SETTINGS = Object.freeze({
  provider: 'tapd',
  tapd: Object.freeze({
    authMode: 'token',
    allowQueryAuth: false,
    apiUser: '',
    nick: '',
    owner: '',
    projects: [],
    projectNames: {},
  }),
  zentao: Object.freeze({
    baseUrl: '',
    basicAuth: false,
    basicAccount: '',
    account: '',
    owner: '',
    scope: 'product',
    containerIds: [],
    containerNames: {},
  }),
  defaultWorkspacePath: '',
  baseBranch: '',
  useWorktree: true,
  excludeCompleted: true,
  agentPreset: '',
})

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function numericIds(value) {
  const list = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  return [
    ...new Set(
      list
        .map((id) => String(id).trim())
        .filter((id) => /^\d+$/.test(id)),
    ),
  ]
}

function hasLegacyTapd(input) {
  return ['authMode', 'apiUser', 'nick', 'owner', 'projects', 'projectNames'].some((key) => key in input)
}

function normalizeTapd(input) {
  const raw = asRecord(input)
  const projectNames = {}
  for (const [key, value] of Object.entries(asRecord(raw.projectNames))) {
    const id = String(key).trim()
    if (!/^\d+$/.test(id)) continue
    projectNames[id] = asString(value).trim() || id
  }
  return {
    authMode: raw.authMode === 'basic' ? 'basic' : 'token',
    // Profiles saved before this setting may rely on the legacy gateway.
    allowQueryAuth: asBoolean(raw.allowQueryAuth, hasLegacyTapd(raw)),
    apiUser: asString(raw.apiUser).trim(),
    nick: asString(raw.nick).trim(),
    owner: asString(raw.owner).trim(),
    projects: numericIds(raw.projects),
    projectNames,
  }
}

function normalizeZentao(input) {
  const raw = asRecord(input)
  const containerIds = numericIds(raw.containerIds ?? [raw.containerId])
  const names = asRecord(raw.containerNames)
  const legacyId = String(raw.containerId ?? '').trim()
  const containerNames = {}
  for (const id of containerIds) {
    const name = asString(names[id] ?? (id === legacyId ? raw.containerName : '')).trim()
    if (name) containerNames[id] = name
  }
  return {
    baseUrl: asString(raw.baseUrl).trim().replace(/\/+$/, ''),
    basicAuth: asBoolean(raw.basicAuth, false),
    basicAccount: asString(raw.basicAccount).trim(),
    account: asString(raw.account).trim(),
    owner: asString(raw.owner).trim(),
    scope: raw.scope === 'project' ? 'project' : 'product',
    containerIds,
    containerNames,
  }
}

/** Normalize whatever is on disk into a complete, typed settings object. */
export function normalizeSettings(raw) {
  const input = asRecord(raw)
  const tapdInput = 'tapd' in input ? input.tapd : hasLegacyTapd(input) ? input : null
  return {
    provider: PROVIDERS.includes(input.provider) ? input.provider : DEFAULT_SETTINGS.provider,
    tapd: normalizeTapd(tapdInput ?? DEFAULT_SETTINGS.tapd),
    zentao: normalizeZentao(input.zentao ?? DEFAULT_SETTINGS.zentao),
    defaultWorkspacePath: asString(input.defaultWorkspacePath).trim(),
    baseBranch: asString(input.baseBranch).trim(),
    useWorktree: asBoolean(input.useWorktree, DEFAULT_SETTINGS.useWorktree),
    excludeCompleted: asBoolean(input.excludeCompleted, DEFAULT_SETTINGS.excludeCompleted),
    agentPreset: asString(input.agentPreset).trim(),
  }
}

async function readJson(file, allowInvalid = true) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error && (error.code === 'ENOENT' || (allowInvalid && error.name === 'SyntaxError'))) return null
    throw error
  }
}

async function writeJson(file, value) {
  await ready()
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' })
    await rename(temp, file)
  } catch (error) {
    await unlink(temp).catch(() => {})
    throw error
  }
}

export async function loadSettings() {
  await ready()
  return normalizeSettings(await readJson(SETTINGS_FILE))
}

/** Merge a patch into the stored settings; returns the normalized result. */
export function saveSettings(patch) {
  return serializeWrite(SETTINGS_FILE, async () => {
    const current = await loadSettings()
    const input = asRecord(patch)
    const merged = { ...current, ...input }
    if (input.tapd && typeof input.tapd === 'object') merged.tapd = { ...current.tapd, ...input.tapd }
    if (input.zentao && typeof input.zentao === 'object') merged.zentao = { ...current.zentao, ...input.zentao }
    const next = normalizeSettings(merged)
    await writeJson(SETTINGS_FILE, next)
    return next
  })
}

/** dispatch key (provider:storyId) -> dispatch record */
export async function loadState() {
  await ready()
  const raw = await readJson(STATE_FILE)
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
}

export function saveState(state) {
  return serializeWrite(STATE_FILE, async () => {
    const input = asRecord(state)
    await writeJson(STATE_FILE, input)
    return input
  })
}

export function putDispatch(storyKey, record) {
  return serializeWrite(STATE_FILE, async () => {
    await ready()
    const state = asRecord(await readJson(STATE_FILE, false))
    state[String(storyKey)] = record
    await writeJson(STATE_FILE, state)
    return state
  })
}

export async function getDispatch(storyKey) {
  const state = await loadState()
  return state[String(storyKey)] ?? null
}

/** Read a dispatch record by its provider-qualified key, tolerating old TAPD ids. */
export async function findDispatch(provider, storyId) {
  const state = await loadState()
  const key = `${provider}:${storyId}`
  return state[key] ?? (provider === 'tapd' ? state[String(storyId)] : undefined) ?? null
}
