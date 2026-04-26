/**
 * Profile Scraper — extracts structured freelancer profile data from any
 * platform URL (LinkedIn, Upwork, Fiverr, GitHub, personal site).
 *
 * Strategy:
 *   1. Detect platform from URL
 *   2. Fetch raw page content (or use platform API where available)
 *   3. Hand the content to Groq with a strict JSON schema prompt
 *   4. Persist to market_profiles
 *
 * For auth-walled URLs we return a `needs_paste: true` flag so the caller
 * can prompt the user to paste their profile text instead.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const GROQ_KEY = process.env.GROQ_API_KEY!
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

export interface MarketProfile {
  id?: string
  user_id: string
  platform: string
  profile_url: string
  display_name: string | null
  headline: string | null
  skills: string[]
  experience_years: number | null
  hourly_rate: number | null
  total_earnings: number | null
  completed_jobs: number | null
  rating: number | null
  location: string | null
  bio: string | null
  raw_data: Record<string, unknown> | null
}

export interface ScrapeResult {
  profile?: MarketProfile
  needs_paste?: boolean
  reason?: string
}

function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export function detectPlatform(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('linkedin.com')) return 'linkedin'
  if (u.includes('upwork.com')) return 'upwork'
  if (u.includes('fiverr.com')) return 'fiverr'
  if (u.includes('freelancer.com')) return 'freelancer'
  if (u.includes('toptal.com')) return 'toptal'
  if (u.includes('github.com')) return 'github'
  if (u.includes('behance.net')) return 'behance'
  if (u.includes('dribbble.com')) return 'dribbble'
  return 'website'
}

async function fetchPage(url: string, timeoutMs = 15000): Promise<{ html: string; status: number }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; 0nORK-MarketIntel/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  })
  const html = await res.text()
  return { html, status: res.status }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000)
}

interface GitHubUser {
  login: string
  name: string | null
  bio: string | null
  location: string | null
  blog: string | null
  public_repos: number
  followers: number
  created_at: string
}

interface GitHubRepo {
  name: string
  language: string | null
  stargazers_count: number
  fork: boolean
  description: string | null
}

async function scrapeGitHub(url: string): Promise<{ data: Record<string, unknown>; text: string } | null> {
  const match = url.match(/github\.com\/([^/?#]+)/)
  if (!match) return null
  const username = match[1]

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { signal: AbortSignal.timeout(10000) }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { signal: AbortSignal.timeout(10000) }),
    ])
    if (!userRes.ok) return null
    const user = await userRes.json() as GitHubUser
    const repos = reposRes.ok ? (await reposRes.json()) as GitHubRepo[] : []

    const langCount = new Map<string, number>()
    for (const r of repos) {
      if (r.language && !r.fork) langCount.set(r.language, (langCount.get(r.language) || 0) + 1)
    }
    const languages = Array.from(langCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([lang]) => lang)

    const topRepos = repos
      .filter(r => !r.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10)
      .map(r => `${r.name} (${r.language || '?'}, ★${r.stargazers_count}): ${r.description || ''}`)

    const yearsActive = Math.max(1, Math.floor((Date.now() - new Date(user.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000)))

    return {
      data: { user, languages, repo_count: repos.length, years_active: yearsActive },
      text: `GitHub user: ${user.login} (${user.name || ''})
Bio: ${user.bio || ''}
Location: ${user.location || ''}
Website: ${user.blog || ''}
Public repos: ${user.public_repos}, Followers: ${user.followers}
Years active: ${yearsActive}
Top languages: ${languages.join(', ')}
Top repos:
${topRepos.join('\n')}`,
    }
  } catch {
    return null
  }
}

const EXTRACTION_SCHEMA = `{
  "display_name": "string or null",
  "headline": "string or null (their tagline / current role)",
  "skills": ["array of skill strings — normalize to canonical names like 'Next.js', 'Supabase', 'Voice AI', 'Workflow Automation'"],
  "experience_years": "integer or null",
  "hourly_rate": "number USD or null",
  "total_earnings": "number USD or null",
  "completed_jobs": "integer or null",
  "rating": "number 0-5 or null",
  "location": "string or null",
  "bio": "string — 2-3 sentences summarizing what they do and offer"
}`

async function extractWithGroq(platform: string, sourceText: string, profileUrl: string): Promise<Partial<MarketProfile>> {
  const prompt = `You are extracting structured freelancer profile data from a ${platform} profile.

Profile URL: ${profileUrl}

Profile content (raw):
\`\`\`
${sourceText}
\`\`\`

Extract the data into this exact JSON schema. Output ONLY valid JSON — no markdown, no commentary.

Schema:
${EXTRACTION_SCHEMA}

Rules:
- Skills should be specific, canonical, and useful for matching against freelance job listings (e.g. "Next.js" not "javascript framework", "Voice AI" not "AI stuff").
- Limit skills to the top 15 most relevant.
- For platforms that don't expose earnings or jobs (LinkedIn, GitHub, personal sites), use null.
- The bio should describe what they BUILD or OFFER, not generic blurbs.
- If a field is genuinely unknown, use null.`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You extract structured data from freelancer profiles. Output JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) throw new Error(`groq ${res.status}: ${await res.text()}`)
  const json = await res.json() as { choices: Array<{ message: { content: string } }> }
  const content = json.choices?.[0]?.message?.content?.trim() || '{}'
  return JSON.parse(content)
}

/**
 * Scrape a profile URL and persist to market_profiles.
 * If `pastedText` is provided, skip the fetch and parse the supplied text.
 */
export async function scrapeProfile(
  userId: string,
  profileUrl: string,
  pastedText?: string
): Promise<ScrapeResult> {
  const platform = detectPlatform(profileUrl)
  let sourceText = ''
  let rawData: Record<string, unknown> = { url: profileUrl, platform }

  if (pastedText && pastedText.trim().length > 50) {
    sourceText = pastedText.slice(0, 12000)
    rawData.source = 'pasted'
  } else if (platform === 'github') {
    const gh = await scrapeGitHub(profileUrl)
    if (!gh) return { needs_paste: true, reason: 'GitHub user not found' }
    sourceText = gh.text
    rawData = { ...rawData, ...gh.data, source: 'github_api' }
  } else {
    try {
      const { html, status } = await fetchPage(profileUrl)
      if (status === 401 || status === 403 || status === 999) {
        return { needs_paste: true, reason: `${platform} requires login (status ${status})` }
      }
      const stripped = stripHtml(html)
      if (stripped.length < 200) {
        return { needs_paste: true, reason: `${platform} returned minimal content (likely auth-walled)` }
      }
      // LinkedIn often returns a login wall even on 200
      if (platform === 'linkedin' && /sign\s*in|join\s*now/i.test(stripped.slice(0, 500))) {
        return { needs_paste: true, reason: 'LinkedIn requires login — paste your profile text' }
      }
      sourceText = stripped
      rawData.source = 'fetched'
    } catch (e) {
      return { needs_paste: true, reason: `Fetch failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  }

  let extracted: Partial<MarketProfile> = {}
  try {
    extracted = await extractWithGroq(platform, sourceText, profileUrl)
  } catch (e) {
    return { needs_paste: true, reason: `Parsing failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  const profile: MarketProfile = {
    user_id: userId,
    platform,
    profile_url: profileUrl,
    display_name: extracted.display_name ?? null,
    headline: extracted.headline ?? null,
    skills: Array.isArray(extracted.skills) ? extracted.skills.slice(0, 30) : [],
    experience_years: extracted.experience_years ?? null,
    hourly_rate: extracted.hourly_rate ?? null,
    total_earnings: extracted.total_earnings ?? null,
    completed_jobs: extracted.completed_jobs ?? null,
    rating: extracted.rating ?? null,
    location: extracted.location ?? null,
    bio: extracted.bio ?? null,
    raw_data: rawData,
  }

  const sb = admin()
  const { data, error } = await sb
    .from('market_profiles')
    .upsert(
      { ...profile, scraped_at: new Date().toISOString() },
      { onConflict: 'user_id,platform' }
    )
    .select()
    .single()

  if (error) throw new Error(`profile upsert failed: ${error.message}`)
  return { profile: data as MarketProfile }
}
