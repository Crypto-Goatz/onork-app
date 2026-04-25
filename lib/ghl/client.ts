import { getAuthForLocation } from '@/lib/crm'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

async function crmFetch(path: string, locationId: string, options: RequestInit = {}) {
  const auth = await getAuthForLocation(locationId)
  const token = auth.token
  const res = await fetch(`${CRM_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: CRM_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`CRM ${options.method ?? 'GET'} ${path} → ${res.status}: ${body}`)
  }
  return res.json()
}

// ── Social Planner ────────────────────────────────────────────────────────────

export interface SchedulePostPayload {
  locationId: string
  content: string
  scheduledAt: string           // ISO 8601
  accountIds: string[]          // LinkedIn account IDs
  mediaUrls?: string[]
  postType?: 'post' | 'article'
}

export interface ScheduledPost {
  id: string
  status: string
  scheduledAt: string
  content: string
  accountIds: string[]
}

export async function schedulePost(payload: SchedulePostPayload): Promise<{ postId: string }> {
  const body = {
    locationId: payload.locationId,
    scheduledDate: payload.scheduledAt,
    summary: payload.content,
    accountIds: payload.accountIds,
    ...(payload.mediaUrls?.length ? { urls: payload.mediaUrls } : {}),
    type: payload.postType ?? 'post',
  }
  const data = await crmFetch('/social-media-posting/posts', payload.locationId, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { postId: data.post?.id ?? data.id }
}

export async function getScheduledPosts(locationId: string, opts: {
  limit?: number
  skip?: number
  status?: string
} = {}): Promise<ScheduledPost[]> {
  const params = new URLSearchParams({ locationId })
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.skip) params.set('skip', String(opts.skip))
  if (opts.status) params.set('status', opts.status)
  const data = await crmFetch(`/social-media-posting/posts?${params}`, locationId)
  return data.posts ?? []
}

export async function cancelPost(locationId: string, postId: string): Promise<void> {
  await crmFetch(`/social-media-posting/posts/${postId}`, locationId, {
    method: 'DELETE',
  })
}

export interface LinkedInAccount {
  id: string
  name: string
  type: 'profile' | 'page'
  avatarUrl?: string
}

export async function getLinkedInAccounts(locationId: string): Promise<LinkedInAccount[]> {
  const data = await crmFetch(`/social-media-posting/accounts?locationId=${locationId}&platform=linkedin`, locationId)
  const accounts: LinkedInAccount[] = (data.accounts ?? [])
    .filter((a: { platform: string }) => a.platform === 'linkedin')
    .map((a: { id: string; name: string; type: string; avatar?: string }) => ({
      id: a.id,
      name: a.name,
      type: a.type === 'page' ? 'page' : 'profile',
      avatarUrl: a.avatar,
    }))
  return accounts
}
