import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PostRequest {
  content: Record<string, string>
  platforms: string[]
  campaign?: string
  hashtags?: string[]
  titles?: Record<string, string>
  scheduled_at?: string | null
}

interface PlatformResult {
  platform: string
  success: boolean
  message: string
  url?: string
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
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        article: {
          title: title || 'New Post from 0nCore',
          body_markdown: content,
          published: true,
          tags: tags.slice(0, 4).map((t) => t.replace('#', '').toLowerCase()),
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { platform: 'devto', success: false, message: `Dev.to error: ${res.status} ${err.slice(0, 100)}` }
    }

    const data = await res.json()
    return {
      platform: 'devto',
      success: true,
      message: 'Published to Dev.to',
      url: data.url,
    }
  } catch (err) {
    return { platform: 'devto', success: false, message: `Dev.to error: ${err instanceof Error ? err.message : 'Unknown'}` }
  }
}

// ── Reddit posting (stub) ──────────────────────────────────
async function postToReddit(content: string, title: string): Promise<PlatformResult> {
  const token = process.env.REDDIT_ACCESS_TOKEN
  if (!token) {
    return { platform: 'reddit', success: false, message: 'Reddit credentials not configured. Add REDDIT_ACCESS_TOKEN env var.' }
  }

  // Real implementation would use Reddit OAuth2 API
  return { platform: 'reddit', success: false, message: 'Reddit OAuth flow required. Connect account in Settings.' }
}

// ── LinkedIn posting (stub) ─────────────────────────────────
async function postToLinkedIn(content: string): Promise<PlatformResult> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  if (!token) {
    return { platform: 'linkedin', success: false, message: 'LinkedIn credentials not configured. Add LINKEDIN_ACCESS_TOKEN env var.' }
  }

  // Real implementation would use LinkedIn v2 API
  return { platform: 'linkedin', success: false, message: 'LinkedIn OAuth flow required. Connect account in Settings.' }
}

// ── Twitter/X posting (stub) ────────────────────────────────
async function postToTwitter(content: string): Promise<PlatformResult> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN
  if (!bearerToken) {
    return { platform: 'twitter', success: false, message: 'Twitter/X credentials not configured. Add TWITTER_BEARER_TOKEN env var.' }
  }

  return { platform: 'twitter', success: false, message: 'Twitter/X OAuth 2.0 flow required. Connect account in Settings.' }
}

// ── Facebook posting (stub) ─────────────────────────────────
async function postToFacebook(content: string): Promise<PlatformResult> {
  return { platform: 'facebook', success: false, message: 'Facebook integration coming soon.' }
}

// ── Instagram posting (stub) ────────────────────────────────
async function postToInstagram(content: string): Promise<PlatformResult> {
  return { platform: 'instagram', success: false, message: 'Instagram integration coming soon.' }
}

// ── Hacker News posting (stub) ──────────────────────────────
async function postToHackerNews(content: string, title: string): Promise<PlatformResult> {
  return { platform: 'hackernews', success: false, message: 'Hacker News integration coming soon.' }
}

// ── GitHub Discussions posting (stub) ───────────────────────
async function postToGitHub(content: string, title: string): Promise<PlatformResult> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return { platform: 'github', success: false, message: 'GitHub token not configured. Add GITHUB_TOKEN env var.' }
  }

  // Real implementation would use GitHub GraphQL API for Discussions
  return { platform: 'github', success: false, message: 'GitHub Discussions integration requires repo configuration.' }
}

// ── Platform router ─────────────────────────────────────────
const PLATFORM_HANDLERS: Record<string, (content: string, title: string, tags: string[]) => Promise<PlatformResult>> = {
  devto: (c, t, tags) => postToDevTo(c, t, tags),
  reddit: (c, t) => postToReddit(c, t),
  linkedin: (c) => postToLinkedIn(c),
  twitter: (c) => postToTwitter(c),
  facebook: (c) => postToFacebook(c),
  instagram: (c) => postToInstagram(c),
  hackernews: (c, t) => postToHackerNews(c, t),
  github: (c, t) => postToGitHub(c, t),
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: PostRequest = await request.json()
  const { content, platforms, campaign, hashtags = [], titles = {} } = body

  if (!content || !platforms?.length) {
    return NextResponse.json({ error: 'content and platforms are required' }, { status: 400 })
  }

  // Post to each platform in parallel
  const promises = platforms.map(async (platform) => {
    const handler = PLATFORM_HANDLERS[platform]
    if (!handler) {
      return { platform, success: false, message: `Unknown platform: ${platform}` }
    }
    const platformContent = typeof content === 'string' ? content : (content[platform] || '')
    const title = titles[platform] || ''
    return handler(platformContent, title, hashtags)
  })

  const results = await Promise.all(promises)

  // Log to Supabase (best-effort)
  try {
    for (const result of results) {
      await supabase.from('social_posts').insert({
        user_id: user.id,
        platform: result.platform,
        content: typeof content === 'string' ? content : (content[result.platform] || ''),
        title: titles[result.platform] || null,
        campaign: campaign || null,
        hashtags: hashtags,
        status: result.success ? 'posted' : 'failed',
        error_message: result.success ? null : result.message,
        external_url: result.url || null,
        posted_at: result.success ? new Date().toISOString() : null,
      })
    }
  } catch {
    // Logging failure is non-blocking
  }

  return NextResponse.json({
    results,
    posted: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  })
}
