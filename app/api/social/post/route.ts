import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

interface PostRequest {
  content: Record<string, string>
  platforms: string[]
  campaign?: string
  hashtags?: string[]
  titles?: Record<string, string>
  scheduled_at?: string | null
  media?: { url: string; type: string; caption?: string }[]
}

interface PlatformResult {
  platform: string
  success: boolean
  message: string
  url?: string
  postId?: string
}

// CRM platform keys that go through social planner
const CRM_PLATFORMS = new Set([
  'google', 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'tiktok_business', 'pinterest', 'youtube',
])

// ── CRM Social Planner posting ─────────────────────────────
async function postViaCRM(
  platforms: string[],
  content: string,
  locationId: string,
  accountMap: Record<string, string>,
  opts: {
    media?: { url: string; type: string; caption?: string }[]
    scheduled_at?: string | null
    title?: string
    hashtags?: string[]
    followUpComment?: string
  }
): Promise<PlatformResult[]> {
  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''

  // Collect account IDs for the requested CRM platforms
  const accountIds: string[] = []
  const missingPlatforms: string[] = []

  for (const p of platforms) {
    const accountId = accountMap[p]
    if (accountId) {
      accountIds.push(accountId)
    } else {
      missingPlatforms.push(p)
    }
  }

  const results: PlatformResult[] = []

  // Report missing connections
  for (const p of missingPlatforms) {
    results.push({
      platform: p,
      success: false,
      message: `${p} account not connected. Go to Accounts tab to connect via OAuth.`,
    })
  }

  if (accountIds.length === 0) return results

  // Build CRM social planner payload
  const body: Record<string, unknown> = {
    accountIds,
    summary: content,
    type: 'post',
  }

  // Media attachments
  if (opts.media?.length) {
    body.media = opts.media.map(m => ({
      url: m.url,
      type: m.type,
      caption: m.caption || '',
    }))
  }

  // Scheduling
  if (opts.scheduled_at) {
    body.status = 'scheduled'
    body.scheduleDate = opts.scheduled_at
  } else {
    body.status = 'draft' // publish immediately via 'draft' with no schedule
  }

  // Follow-up comment
  if (opts.followUpComment) {
    body.followUpComment = opts.followUpComment
  }

  // Platform-specific details
  const hasFacebook = platforms.includes('facebook')
  const hasInstagram = platforms.includes('instagram')
  const hasLinkedIn = platforms.includes('linkedin')
  const hasYouTube = platforms.includes('youtube')
  const hasTikTok = platforms.includes('tiktok') || platforms.includes('tiktok_business')
  const hasPinterest = platforms.includes('pinterest')

  if (hasFacebook) {
    body.facebookPostDetails = { type: 'post' }
  }
  if (hasInstagram) {
    body.instagramPostDetails = { type: 'post', showOnFeed: true }
  }
  if (hasLinkedIn) {
    body.linkedinPostDetails = {}
  }
  if (hasYouTube && opts.title) {
    body.youtubePostDetails = { title: opts.title, privacyLevel: 'public', type: 'video' }
  }
  if (hasTikTok) {
    body.tiktokPostDetails = { privacyLevel: 'PUBLIC_TO_EVERYONE', enableComment: true, enableDuet: true }
  }
  if (hasPinterest && opts.title) {
    body.pinterestPostDetails = { title: opts.title }
  }

  // OG tags if media
  if (opts.media?.[0]) {
    body.ogTagsDetails = {
      metaImage: opts.media[0].url,
      ogTitle: opts.title || '',
      ogDescription: content.slice(0, 160),
    }
  }

  try {
    const res = await fetch(`${CRM_API}/social-media-posting/${locationId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[social/post] CRM create post failed:', res.status, err)
      // Mark all connected platforms as failed
      for (const p of platforms.filter(x => !missingPlatforms.includes(x))) {
        results.push({
          platform: p,
          success: false,
          message: `CRM post failed: ${res.status} — ${err.slice(0, 200)}`,
        })
      }
      return results
    }

    const data = await res.json()
    const postId = data.id || data.postId || ''

    // Mark all connected platforms as success
    for (const p of platforms.filter(x => !missingPlatforms.includes(x))) {
      results.push({
        platform: p,
        success: true,
        message: opts.scheduled_at ? `Scheduled on ${p} via CRM` : `Posted to ${p} via CRM`,
        postId,
      })
    }
  } catch (err) {
    for (const p of platforms.filter(x => !missingPlatforms.includes(x))) {
      results.push({
        platform: p,
        success: false,
        message: `CRM error: ${err instanceof Error ? err.message : 'Unknown'}`,
      })
    }
  }

  return results
}

// ── Dev.to posting ──────────────────────────────────────────
async function postToDevTo(content: string, title: string, tags: string[]): Promise<PlatformResult> {
  const apiKey = process.env.DEVTO_API_KEY
  if (!apiKey) {
    return { platform: 'devto', success: false, message: 'Dev.to API key not configured' }
  }

  try {
    const res = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        article: {
          title: title || 'New Post from 0nCore',
          body_markdown: content,
          published: true,
          tags: tags.slice(0, 4).map(t => t.replace('#', '').toLowerCase()),
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { platform: 'devto', success: false, message: `Dev.to error: ${res.status} ${err.slice(0, 100)}` }
    }

    const data = await res.json()
    return { platform: 'devto', success: true, message: 'Published to Dev.to', url: data.url }
  } catch (err) {
    return { platform: 'devto', success: false, message: `Dev.to error: ${err instanceof Error ? err.message : 'Unknown'}` }
  }
}

// ── Reddit posting ──────────────────────────────────────────
async function postToReddit(content: string, title: string): Promise<PlatformResult> {
  const token = process.env.REDDIT_ACCESS_TOKEN
  if (!token) {
    return { platform: 'reddit', success: false, message: 'Reddit credentials not configured. Add REDDIT_ACCESS_TOKEN env var.' }
  }
  return { platform: 'reddit', success: false, message: 'Reddit OAuth flow required. Connect account in Settings.' }
}

// ── GitHub Discussions posting ──────────────────────────────
async function postToGitHub(content: string, title: string): Promise<PlatformResult> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return { platform: 'github', success: false, message: 'GitHub token not configured.' }
  }
  return { platform: 'github', success: false, message: 'GitHub Discussions integration requires repo configuration.' }
}

// ── Hacker News ─────────────────────────────────────────────
async function postToHackerNews(): Promise<PlatformResult> {
  return { platform: 'hackernews', success: false, message: 'Hacker News integration coming soon.' }
}

// ── Direct platform router ──────────────────────────────────
const DIRECT_HANDLERS: Record<string, (content: string, title: string, tags: string[]) => Promise<PlatformResult>> = {
  devto: (c, t, tags) => postToDevTo(c, t, tags),
  reddit: (c, t) => postToReddit(c, t),
  github: (c, t) => postToGitHub(c, t),
  hackernews: () => postToHackerNews(),
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: PostRequest = await request.json()
  const { content, platforms, campaign, hashtags = [], titles = {}, scheduled_at, media } = body

  if (!content || !platforms?.length) {
    return NextResponse.json({ error: 'content and platforms are required' }, { status: 400 })
  }

  // Split platforms into CRM-routed vs direct
  const crmPlatforms = platforms.filter(p => CRM_PLATFORMS.has(p))
  const directPlatforms = platforms.filter(p => !CRM_PLATFORMS.has(p))

  const allResults: PlatformResult[] = []

  // ── CRM Social Planner for connected platforms ──
  if (crmPlatforms.length > 0) {
    // Get user's CRM location + connected account IDs
    const { data: profile } = await supabase
      .from('profiles')
      .select('crm_location_id')
      .eq('id', user.id)
      .single()

    const locationId = profile?.crm_location_id
    if (!locationId) {
      for (const p of crmPlatforms) {
        allResults.push({ platform: p, success: false, message: 'No CRM location linked to your account.' })
      }
    } else {
      // Fetch connected accounts to get account IDs
      const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
      let accountMap: Record<string, string> = {}

      try {
        const accRes = await fetch(`${CRM_API}/social-media-posting/${locationId}/accounts`, {
          headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
        })
        if (accRes.ok) {
          const accData = await accRes.json()
          const accounts = accData.accounts || accData || []
          for (const acc of accounts) {
            const type = (acc.type || acc.platform || acc.provider || '').toLowerCase()
            // Map platform type to account ID
            if (type && acc.id) {
              accountMap[type] = acc.id
            }
            // Handle variations
            if (type === 'google_business' || type === 'gmb') accountMap['google'] = acc.id
            if (type === 'x' || type === 'twitter') accountMap['twitter'] = acc.id
          }
        }
      } catch (err) {
        console.error('[social/post] Failed to fetch accounts:', err)
      }

      // Get primary content (first platform or string)
      const primaryContent = typeof content === 'string'
        ? content
        : content[crmPlatforms[0]] || Object.values(content)[0] || ''

      const crmResults = await postViaCRM(crmPlatforms, primaryContent, locationId, accountMap, {
        media,
        scheduled_at,
        title: titles[crmPlatforms[0]] || '',
        hashtags,
      })
      allResults.push(...crmResults)
    }
  }

  // ── Direct integrations ──
  const directPromises = directPlatforms.map(async (platform) => {
    const handler = DIRECT_HANDLERS[platform]
    if (!handler) {
      return { platform, success: false, message: `Unknown platform: ${platform}` } as PlatformResult
    }
    const platformContent = typeof content === 'string' ? content : (content[platform] || '')
    const title = titles[platform] || ''
    return handler(platformContent, title, hashtags)
  })

  const directResults = await Promise.all(directPromises)
  allResults.push(...directResults)

  // Log to Supabase (best-effort)
  try {
    for (const result of allResults) {
      await supabase.from('social_posts').insert({
        user_id: user.id,
        platform: result.platform,
        content: typeof content === 'string' ? content : (content[result.platform] || ''),
        title: titles[result.platform] || null,
        campaign: campaign || null,
        hashtags,
        status: result.success ? (scheduled_at ? 'scheduled' : 'posted') : 'failed',
        error_message: result.success ? null : result.message,
        external_url: result.url || null,
        crm_post_id: result.postId || null,
        posted_at: result.success && !scheduled_at ? new Date().toISOString() : null,
        scheduled_at: scheduled_at || null,
      })
    }
  } catch {
    // Logging failure is non-blocking
  }

  return NextResponse.json({
    results: allResults,
    posted: allResults.filter(r => r.success).length,
    failed: allResults.filter(r => !r.success).length,
  })
}
