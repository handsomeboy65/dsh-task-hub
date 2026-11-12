/**
 * Source adapters: one common task shape over TAPD and ZenTao.
 *
 * Every normalized task carries `source`, a provider-qualified `id` and a
 * `shortId` for display. Dispatch state is keyed by `uid` so ids from different
 * systems never collide.
 */
import { fetchStory, fetchMyStories, fetchStoryAssets } from './tapd.js'
import { fetchMyWork, fetchWorkDetails, fetchWorkAssets, ZentaoError } from './zentao.js'

export const PROVIDERS = ['tapd', 'zentao']

export const SOURCE_LABELS = {
  tapd: 'TAPD',
  zentao: '禅道',
}

export class SourceError extends Error {
  constructor(code, message, details) {
    super(message)
    this.name = 'SourceError'
    this.code = code
    this.details = details
  }
}

export function uidOf(provider, id) {
  return `${provider}:${String(id ?? '')}`
}

function withUid(story, provider) {
  return story ? { ...story, source: provider, uid: uidOf(provider, story.id) } : null
}

function sortByModified(stories) {
  return stories.sort((left, right) => String(right.modified).localeCompare(String(left.modified)))
}

export function providerOf(settings) {
  return PROVIDERS.includes(settings?.provider) ? settings.provider : 'tapd'
}

/** Tasks assigned to me for the configured provider. */
export async function listTasks(options) {
  const { provider, settings, credentials, excludeCompleted = true, includeStatusOptions, fetchImpl } = options ?? {}
  if (provider === 'tapd') {
    const tapd = settings.tapd ?? {}
    const result = await fetchMyStories({
      credentials: credentials?.tapd ?? {},
      projects: tapd.projects,
      owner: tapd.owner,
      excludeCompleted,
      includeStatusOptions,
      fetchImpl,
    })
    return {
      provider,
      stories: sortByModified(result.stories.map((story) => withUid(story, provider))),
      rawCount: result.rawCount,
      projects: result.projects,
      iterations: result.iterations,
    }
  }
  if (provider === 'zentao') {
    const config = settings.zentao ?? {}
    let result
    try {
      result = await fetchMyWork({
        baseUrl: config.baseUrl,
        credentials: credentials?.zentao ?? {},
        scope: config.scope,
        containerId: config.containerId,
        containerName: config.containerName,
        containerIds: config.containerIds,
        containerNames: config.containerNames,
        includeStatusOptions,
        fetchImpl,
      })
    } catch (error) {
      if (error instanceof ZentaoError) throw new SourceError(error.code, error.message, error.details)
      throw error
    }
    const ownerFilteredEmpty = result.rawCount > 0 && result.stories.length === 0
    let stories = result.stories.map((story) => withUid(story, provider))
    if (excludeCompleted) stories = stories.filter((story) => !story.completed)
    return {
      provider,
      stories: sortByModified(stories),
      rawCount: result.rawCount,
      iterations: result.iterations,
      ownerFilteredEmpty,
      ...(result.statusOptions && { statusOptions: result.statusOptions }),
    }
  }
  throw new SourceError('source/unknown', `未知的需求来源：${provider}`)
}

/** Re-read one task before dispatching; returns the normalized story. */
export async function fetchTask(options) {
  const { provider, settings, credentials, story, fetchImpl } = options ?? {}
  if (!story) throw new SourceError('source/bad-request', '缺少需求信息')
  if (provider === 'tapd') {
    const tapd = settings.tapd ?? {}
    const fresh = await fetchStory({
      credentials: credentials?.tapd ?? {},
      projectId: story.projectId ?? tapd.projects?.[0],
      storyId: story.id,
      fetchImpl,
    })
    return withUid(fresh, provider)
  }
  if (provider === 'zentao') {
    const fresh = await fetchWorkDetails({ baseUrl: settings.zentao.baseUrl, credentials: credentials.zentao, story, fetchImpl })
    return withUid(fresh, provider)
  }
  throw new SourceError('source/unknown', `未知的需求来源：${provider}`)
}

/** Download source-specific assets, leaving draft storage to the dispatch layer. */
export async function fetchTaskAssets({ provider, settings, credentials, projectId, story, fetchImpl }) {
  if (provider === 'tapd') return fetchStoryAssets({ credentials: credentials.tapd, projectId, story, fetchImpl })
  if (provider === 'zentao') {
    return fetchWorkAssets({ baseUrl: settings.zentao.baseUrl, credentials: credentials.zentao, story, fetchImpl })
  }
  throw new SourceError('source/unknown', `未知的需求来源：${provider}`)
}
