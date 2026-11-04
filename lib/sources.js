/**
 * Source adapters: one common task shape over TAPD, ZenTao and GitLab.
 *
 * Every normalized task carries `source`, a provider-qualified `id` and a
 * `shortId` for display. Dispatch state is keyed by `uid` so ids from different
 * systems never collide.
 */
import { fetchStory, fetchMyStories, fetchStoryAssets } from './tapd.js'
import { fetchMyWork, fetchWorkDetails, fetchWorkAssets, ZentaoError } from './zentao.js'
import { fetchIssue, fetchMyIssues, GitlabError } from './gitlab.js'

export const PROVIDERS = ['tapd', 'zentao', 'gitlab']

export const SOURCE_LABELS = {
  tapd: 'TAPD',
  zentao: '禅道',
  gitlab: 'GitLab',
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
  const { provider, settings, credentials, excludeCompleted = true, fetchImpl } = options ?? {}
  if (provider === 'tapd') {
    const tapd = settings.tapd ?? {}
    const result = await fetchMyStories({
      credentials: credentials?.tapd ?? {},
      projects: tapd.projects,
      owner: tapd.owner,
      excludeCompleted,
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
        fetchImpl,
      })
    } catch (error) {
      if (error instanceof ZentaoError) throw new SourceError(error.code, error.message, error.details)
      throw error
    }
    const ownerFilteredEmpty = result.rawCount > 0 && result.stories.length === 0
    let stories = result.stories.map((story) => withUid(story, provider))
    if (excludeCompleted) stories = stories.filter((story) => !story.completed)
    return { provider, stories: sortByModified(stories), rawCount: result.rawCount, iterations: result.iterations, ownerFilteredEmpty }
  }
  if (provider === 'gitlab') {
    const config = settings.gitlab ?? {}
    let result
    try {
      result = await fetchMyIssues({
        baseUrl: config.baseUrl,
        token: credentials?.gitlab?.token,
        projectPath: config.projectPath,
        labels: config.labels,
        excludeCompleted,
        fetchImpl,
      })
    } catch (error) {
      if (error instanceof GitlabError) throw new SourceError(error.code, error.message, error.details)
      throw error
    }
    let stories = result.stories.map((story) => withUid(story, provider))
    if (excludeCompleted) stories = stories.filter((story) => !story.completed)
    return { provider, stories: sortByModified(stories), rawCount: result.rawCount, iterations: result.iterations }
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
  if (provider === 'gitlab') {
    const config = settings.gitlab ?? {}
    try {
      const fresh = await fetchIssue({
        baseUrl: config.baseUrl,
        token: credentials?.gitlab?.token,
        projectPath: config.projectPath,
        projectId: story.projectId,
        iid: story.remoteId ?? story.id,
        webUrl: story.url,
        fetchImpl,
      })
      return withUid(fresh ?? story, provider)
    } catch (error) {
      if (error instanceof GitlabError && error.code !== 'gitlab/auth-failed') {
        // A list snapshot is still good enough to dispatch from.
        return withUid(story, provider)
      }
      throw error instanceof GitlabError ? new SourceError(error.code, error.message, error.details) : error
    }
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
  if (provider === 'gitlab') {
    try {
      return await fetchIssueAssets({
        description: story.description,
        baseUrl: settings.gitlab.baseUrl,
        token: credentials.gitlab.token,
        fetchImpl,
      })
    } catch (error) {
      console.warn(`[dsh-task-hub] GitLab 附件读取失败，继续派发：${error?.message ?? error}`)
      return { files: [], images: [] }
    }
  }
  throw new SourceError('source/unknown', `未知的需求来源：${provider}`)
}
