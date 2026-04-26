/**
 * Market Intelligence collectors — pull listings from public sources and
 * normalize to the shared `NormalizedListing` shape, then upsert into
 * `market_listings`.
 *
 * All sources here are public, no auth required. Each collector is best-effort:
 * a network blip or upstream change is logged and returns 0, never throws.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface NormalizedListing {
  platform: 'upwork' | 'reddit' | 'hackernews' | 'fiverr' | 'freelancer'
  external_id: string
  skill: string | null
  category: string | null
  title: string
  description?: string
  budget_min?: number | null
  budget_max?: number | null
  budget_type?: 'fixed' | 'hourly' | 'unspecified'
  currency?: string
  skills_tags: string[]
  location?: string | null
  client_country?: string | null
  listing_url: string
  posted_at?: string | null
  raw?: Record<string, unknown>
}

export interface CollectorResult {
  platform: string
  collected: number
  inserted: number
  errors: string[]
}

// ─── Skill / category normalization ─────────────────────────────────────────
const SKILL_KEYWORDS: Record<string, { skill: string; category: string }> = {
  // Development
  'react': { skill: 'react', category: 'development' },
  'next.js': { skill: 'nextjs', category: 'development' },
  'nextjs': { skill: 'nextjs', category: 'development' },
  'node.js': { skill: 'nodejs', category: 'development' },
  'nodejs': { skill: 'nodejs', category: 'development' },
  'python': { skill: 'python', category: 'development' },
  'django': { skill: 'django', category: 'development' },
  'rails': { skill: 'rails', category: 'development' },
  'laravel': { skill: 'laravel', category: 'development' },
  'php': { skill: 'php', category: 'development' },
  'wordpress': { skill: 'wordpress', category: 'development' },
  'shopify': { skill: 'shopify', category: 'development' },
  'webflow': { skill: 'webflow', category: 'development' },
  'typescript': { skill: 'typescript', category: 'development' },
  'javascript': { skill: 'javascript', category: 'development' },
  'golang': { skill: 'golang', category: 'development' },
  'rust': { skill: 'rust', category: 'development' },
  'swift': { skill: 'swift', category: 'development' },
  'flutter': { skill: 'flutter', category: 'development' },
  'react native': { skill: 'react-native', category: 'development' },
  'ios': { skill: 'ios', category: 'development' },
  'android': { skill: 'android', category: 'development' },
  // AI / data
  'openai': { skill: 'openai', category: 'ai' },
  'gpt': { skill: 'openai', category: 'ai' },
  'chatgpt': { skill: 'openai', category: 'ai' },
  'claude': { skill: 'claude', category: 'ai' },
  'anthropic': { skill: 'claude', category: 'ai' },
  'langchain': { skill: 'langchain', category: 'ai' },
  'rag': { skill: 'rag', category: 'ai' },
  'llm': { skill: 'llm', category: 'ai' },
  'machine learning': { skill: 'machine-learning', category: 'ai' },
  'mcp': { skill: 'mcp', category: 'ai' },
  'agent': { skill: 'ai-agents', category: 'ai' },
  'automation': { skill: 'automation', category: 'ai' },
  'n8n': { skill: 'n8n', category: 'ai' },
  'zapier': { skill: 'zapier', category: 'ai' },
  'make.com': { skill: 'make', category: 'ai' },
  // Design
  'figma': { skill: 'figma', category: 'design' },
  'ui/ux': { skill: 'ui-ux', category: 'design' },
  'ux': { skill: 'ui-ux', category: 'design' },
  'logo': { skill: 'logo-design', category: 'design' },
  'illustrator': { skill: 'illustrator', category: 'design' },
  'photoshop': { skill: 'photoshop', category: 'design' },
  'branding': { skill: 'branding', category: 'design' },
  // Writing / content
  'copywriting': { skill: 'copywriting', category: 'writing' },
  'content writing': { skill: 'content-writing', category: 'writing' },
  'blog': { skill: 'blog-writing', category: 'writing' },
  'seo': { skill: 'seo', category: 'marketing' },
  'technical writing': { skill: 'technical-writing', category: 'writing' },
  // Marketing
  'google ads': { skill: 'google-ads', category: 'marketing' },
  'facebook ads': { skill: 'facebook-ads', category: 'marketing' },
  'meta ads': { skill: 'meta-ads', category: 'marketing' },
  'tiktok ads': { skill: 'tiktok-ads', category: 'marketing' },
  'email marketing': { skill: 'email-marketing', category: 'marketing' },
  'social media': { skill: 'social-media', category: 'marketing' },
  'linkedin': { skill: 'linkedin-marketing', category: 'marketing' },
  // Video
  'video editing': { skill: 'video-editing', category: 'video' },
  'premiere': { skill: 'video-editing', category: 'video' },
  'final cut': { skill: 'video-editing', category: 'video' },
  'after effects': { skill: 'motion-graphics', category: 'video' },
  // Data
  'data analysis': { skill: 'data-analysis', category: 'data' },
  'sql': { skill: 'sql', category: 'data' },
  'tableau': { skill: 'tableau', category: 'data' },
  'power bi': { skill: 'power-bi', category: 'data' },
  // Crypto / web3
  'solidity': { skill: 'solidity', category: 'web3' },
  'web3': { skill: 'web3', category: 'web3' },
  'smart contract': { skill: 'smart-contracts', category: 'web3' },
}

export function classify(text: string): { skill: string | null; category: string | null; tags: string[] } {
  const lower = text.toLowerCase()
  const tags: string[] = []
  let skill: string | null = null
  let category: string | null = null

  for (const [keyword, hit] of Object.entries(SKILL_KEYWORDS)) {
    if (lower.includes(keyword)) {
      tags.push(hit.skill)
      if (!skill) {
        skill = hit.skill
        category = hit.category
      }
    }
  }
  return { skill, category, tags: Array.from(new Set(tags)) }
}

// ─── Budget extraction ──────────────────────────────────────────────────────
export function extractBudget(text: string): { min: number | null; max: number | null; type: 'fixed' | 'hourly' | 'unspecified' } {
  const cleaned = text.replace(/,/g, '')
  const hourlyMatch = cleaned.match(/\$(\d+(?:\.\d+)?)\s*(?:-|to)\s*\$?(\d+(?:\.\d+)?)\s*\/\s*(?:hr|hour)/i)
  const hourlySingle = cleaned.match(/\$(\d+(?:\.\d+)?)\s*\/\s*(?:hr|hour)/i)
  const range = cleaned.match(/\$(\d{2,6}(?:\.\d+)?)\s*(?:-|to)\s*\$?(\d{2,6}(?:\.\d+)?)/i)
  const single = cleaned.match(/(?:budget|fixed|price)[^\$]{0,20}\$(\d{2,6}(?:\.\d+)?)/i)

  if (hourlyMatch) return { min: parseFloat(hourlyMatch[1]), max: parseFloat(hourlyMatch[2]), type: 'hourly' }
  if (hourlySingle) return { min: parseFloat(hourlySingle[1]), max: parseFloat(hourlySingle[1]), type: 'hourly' }
  if (range) return { min: parseFloat(range[1]), max: parseFloat(range[2]), type: 'fixed' }
  if (single) return { min: parseFloat(single[1]), max: parseFloat(single[1]), type: 'fixed' }
  return { min: null, max: null, type: 'unspecified' }
}

// ─── Supabase admin client ──────────────────────────────────────────────────
function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function upsert(rows: NormalizedListing[]): Promise<number> {
  if (rows.length === 0) return 0
  const sb = admin()
  const { error, count } = await sb
    .from('market_listings')
    .upsert(rows, { onConflict: 'platform,external_id', ignoreDuplicates: true, count: 'exact' })
  if (error) {
    console.error('[market-intel] upsert error', error.message)
    return 0
  }
  return count ?? rows.length
}

// ─── Upwork RSS ─────────────────────────────────────────────────────────────
const UPWORK_FEEDS = [
  'https://www.upwork.com/ab/feed/jobs/rss?sort=recency&paging=NaN%3B10&api_params=1&q=&securityToken=&userUid=&orgUid=',
  // Category-based feeds (public, no auth)
  'https://www.upwork.com/ab/feed/jobs/rss?category2_uid=531770282580668418&sort=recency&paging=NaN%3B10&api_params=1', // Web, Mobile & Software Dev
  'https://www.upwork.com/ab/feed/jobs/rss?category2_uid=531770282580668420&sort=recency&paging=NaN%3B10&api_params=1', // Design & Creative
  'https://www.upwork.com/ab/feed/jobs/rss?category2_uid=531770282580668422&sort=recency&paging=NaN%3B10&api_params=1', // Writing
]

function parseRssItem(xml: string): { title: string; link: string; description: string; pubDate: string; guid: string } | null {
  const get = (tag: string) => {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
    if (!m) return ''
    return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
  }
  const title = get('title')
  const link = get('link')
  if (!title || !link) return null
  return {
    title,
    link,
    description: get('description'),
    pubDate: get('pubDate'),
    guid: get('guid') || link,
  }
}

export async function collectUpwork(): Promise<CollectorResult> {
  const errors: string[] = []
  const all: NormalizedListing[] = []

  for (const feed of UPWORK_FEEDS) {
    try {
      const res = await fetch(feed, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 0nMarketBot/1.0)' },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) {
        errors.push(`upwork ${res.status}`)
        continue
      }
      const xml = await res.text()
      const items = xml.split(/<item[\s>]/i).slice(1).map(chunk => '<item>' + chunk.split('</item>')[0] + '</item>')
      for (const item of items) {
        const parsed = parseRssItem(item)
        if (!parsed) continue
        const text = `${parsed.title} ${parsed.description}`
        const { skill, category, tags } = classify(text)
        const budget = extractBudget(parsed.description)
        all.push({
          platform: 'upwork',
          external_id: parsed.guid,
          skill,
          category,
          title: parsed.title.replace(/\s*-\s*Upwork$/, ''),
          description: parsed.description.replace(/<[^>]+>/g, '').slice(0, 2000),
          budget_min: budget.min,
          budget_max: budget.max,
          budget_type: budget.type,
          currency: 'USD',
          skills_tags: tags,
          listing_url: parsed.link,
          posted_at: parsed.pubDate ? new Date(parsed.pubDate).toISOString() : null,
          raw: { feed },
        })
      }
    } catch (e) {
      errors.push(`upwork: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const inserted = await upsert(all)
  return { platform: 'upwork', collected: all.length, inserted, errors }
}

// ─── Reddit (r/forhire + r/freelance) ───────────────────────────────────────
interface RedditPost {
  data: {
    id: string
    title: string
    selftext: string
    permalink: string
    created_utc: number
    link_flair_text?: string
    author?: string
    subreddit: string
  }
}

interface RedditListing {
  data: { children: RedditPost[] }
}

async function collectSubreddit(sub: string): Promise<NormalizedListing[]> {
  const url = `https://www.reddit.com/r/${sub}/new.json?limit=100`
  const res = await fetch(url, {
    headers: { 'User-Agent': '0nMarketBot/1.0 (by /u/0nork)' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`reddit ${sub} ${res.status}`)
  const json = (await res.json()) as RedditListing
  const posts = json?.data?.children || []

  return posts
    .filter(p => {
      const flair = (p.data.link_flair_text || '').toLowerCase()
      const title = p.data.title.toLowerCase()
      // r/forhire uses [HIRING] / [FOR HIRE] tags; we want hiring posts only
      return flair.includes('hiring') || title.includes('[hiring]') || title.includes('[h]') || sub === 'freelance'
    })
    .map(p => {
      const text = `${p.data.title} ${p.data.selftext}`
      const { skill, category, tags } = classify(text)
      const budget = extractBudget(text)
      return {
        platform: 'reddit' as const,
        external_id: p.data.id,
        skill,
        category,
        title: p.data.title,
        description: p.data.selftext.slice(0, 2000),
        budget_min: budget.min,
        budget_max: budget.max,
        budget_type: budget.type,
        currency: 'USD',
        skills_tags: tags,
        listing_url: `https://www.reddit.com${p.data.permalink}`,
        posted_at: new Date(p.data.created_utc * 1000).toISOString(),
        raw: { subreddit: p.data.subreddit, flair: p.data.link_flair_text, author: p.data.author },
      }
    })
}

export async function collectReddit(): Promise<CollectorResult> {
  const errors: string[] = []
  const all: NormalizedListing[] = []
  for (const sub of ['forhire', 'freelance']) {
    try {
      all.push(...(await collectSubreddit(sub)))
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }
  const inserted = await upsert(all)
  return { platform: 'reddit', collected: all.length, inserted, errors }
}

// ─── HackerNews "Who is hiring" + "Freelancer Seeking Freelancer" ───────────
interface HnItem {
  id: number
  by?: string
  time: number
  text?: string
  title?: string
  type: string
  kids?: number[]
  parent?: number
}

async function hnFetch<T>(path: string): Promise<T> {
  const res = await fetch(`https://hacker-news.firebaseio.com/v0${path}`, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`hn ${res.status}`)
  return res.json()
}

async function findLatestThread(query: RegExp): Promise<HnItem | null> {
  // Use Algolia HN search to find the most recent thread matching
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query.source)}&tags=story&hitsPerPage=5`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) return null
  const json = await res.json() as { hits: Array<{ objectID: string; title?: string }> }
  for (const hit of json.hits) {
    if (hit.title && query.test(hit.title)) {
      try {
        return await hnFetch<HnItem>(`/item/${hit.objectID}.json`)
      } catch {
        continue
      }
    }
  }
  return null
}

export async function collectHackerNews(): Promise<CollectorResult> {
  const errors: string[] = []
  const all: NormalizedListing[] = []

  try {
    const thread = await findLatestThread(/who is hiring|freelancer\?/i)
    if (!thread || !thread.kids) {
      return { platform: 'hackernews', collected: 0, inserted: 0, errors: ['no-thread'] }
    }

    const kids = thread.kids.slice(0, 100)
    const posts = await Promise.all(
      kids.map(id => hnFetch<HnItem>(`/item/${id}.json`).catch(() => null))
    )

    for (const post of posts) {
      if (!post || !post.text) continue
      const cleaned = post.text.replace(/<[^>]+>/g, ' ').replace(/&\w+;/g, ' ').trim()
      const title = cleaned.split(/\.|\n/)[0].slice(0, 200)
      const { skill, category, tags } = classify(cleaned)
      const budget = extractBudget(cleaned)
      all.push({
        platform: 'hackernews',
        external_id: String(post.id),
        skill,
        category,
        title,
        description: cleaned.slice(0, 2000),
        budget_min: budget.min,
        budget_max: budget.max,
        budget_type: budget.type,
        currency: 'USD',
        skills_tags: tags,
        listing_url: `https://news.ycombinator.com/item?id=${post.id}`,
        posted_at: new Date(post.time * 1000).toISOString(),
        raw: { thread_id: thread.id, by: post.by },
      })
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e))
  }

  const inserted = await upsert(all)
  return { platform: 'hackernews', collected: all.length, inserted, errors }
}

// ─── Stub collectors — public APIs require auth/scraping; return empty ─────
export async function collectFiverr(): Promise<CollectorResult> {
  return { platform: 'fiverr', collected: 0, inserted: 0, errors: ['stub: no public listings api'] }
}

export async function collectFreelancer(): Promise<CollectorResult> {
  return { platform: 'freelancer', collected: 0, inserted: 0, errors: ['stub: api requires oauth'] }
}

// ─── Run all ────────────────────────────────────────────────────────────────
export async function collectAll(): Promise<CollectorResult[]> {
  return Promise.all([
    collectUpwork(),
    collectReddit(),
    collectHackerNews(),
    collectFiverr(),
    collectFreelancer(),
  ])
}
