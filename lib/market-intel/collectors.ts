/**
 * 0n Market Intel — Collectors
 *
 * Fetches publicly available listing data from freelance/job platforms,
 * normalizes it to the market_listings schema, and inserts via Supabase
 * service role.
 *
 * Sources implemented:
 *   - Upwork RSS (https://www.upwork.com/ab/feed/jobs/rss)
 *   - Reddit JSON API (r/forhire, r/freelance)
 *   - Hacker News "Who is hiring" threads (Algolia HN search API)
 *   - GitHub trending + discussions (public REST API)
 *
 * Stub collectors (return 0, log "not implemented"):
 *   - Fiverr, Freelancer, Toptal, PeoplePerHour
 */

import { createClient } from '@supabase/supabase-js'

export interface MarketListing {
  platform: string
  skill: string
  category: string
  title: string
  description?: string
  budget_min?: number
  budget_max?: number
  fixed_price?: number
  currency?: string
  buyer_location?: string
  seller_location?: string
  proposals_count?: number
  experience_level?: string
  duration?: string
  skills_tags: string[]
  listing_url?: string
  posted_at?: string
  raw_data?: Record<string, unknown>
}

export interface CollectorResult {
  platform: string
  fetched: number
  inserted: number
  skipped: number
  error?: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Skill / category extraction
// ────────────────────────────────────────────────────────────────────────────

const SKILL_KEYWORDS: Array<{ skill: string; category: string; matchers: RegExp[] }> = [
  { skill: 'React Development', category: 'Web Development', matchers: [/\breact(?:\.?js)?\b/i, /\bnext\.?js\b/i] },
  { skill: 'Vue Development', category: 'Web Development', matchers: [/\bvue(?:\.?js)?\b/i, /\bnuxt\b/i] },
  { skill: 'Angular Development', category: 'Web Development', matchers: [/\bangular\b/i] },
  { skill: 'Node.js Backend', category: 'Backend Development', matchers: [/\bnode\.?js\b/i, /\bexpress\.?js\b/i, /\bnestjs\b/i] },
  { skill: 'Python Development', category: 'Backend Development', matchers: [/\bpython\b/i, /\bdjango\b/i, /\bflask\b/i, /\bfastapi\b/i] },
  { skill: 'Ruby on Rails', category: 'Backend Development', matchers: [/\brails\b/i, /\bruby on rails\b/i] },
  { skill: 'Go Development', category: 'Backend Development', matchers: [/\bgolang\b/i, /\bgo developer\b/i] },
  { skill: 'Rust Development', category: 'Backend Development', matchers: [/\brust\b/i] },
  { skill: 'PHP / Laravel', category: 'Web Development', matchers: [/\blaravel\b/i, /\bphp\b/i, /\bwordpress plugin\b/i] },
  { skill: 'WordPress', category: 'Web Development', matchers: [/\bwordpress\b/i, /\bwoocommerce\b/i, /\belementor\b/i] },
  { skill: 'Shopify', category: 'E-Commerce', matchers: [/\bshopify\b/i, /\bliquid template\b/i] },
  { skill: 'Mobile — iOS', category: 'Mobile Development', matchers: [/\bios developer\b/i, /\bswift\b/i, /\bswiftui\b/i] },
  { skill: 'Mobile — Android', category: 'Mobile Development', matchers: [/\bandroid developer\b/i, /\bkotlin\b/i] },
  { skill: 'React Native', category: 'Mobile Development', matchers: [/\breact native\b/i] },
  { skill: 'Flutter', category: 'Mobile Development', matchers: [/\bflutter\b/i, /\bdart\b/i] },
  { skill: 'AI / LLM Engineering', category: 'AI & Machine Learning', matchers: [/\bllm\b/i, /\bopenai\b/i, /\banthropic\b/i, /\bgpt[-\s]?\d/i, /\bclaude\b/i, /\blangchain\b/i, /\brag\b/i] },
  { skill: 'Machine Learning', category: 'AI & Machine Learning', matchers: [/\bmachine learning\b/i, /\bml engineer\b/i, /\bpytorch\b/i, /\btensorflow\b/i] },
  { skill: 'Data Science', category: 'AI & Machine Learning', matchers: [/\bdata scientist\b/i, /\bdata science\b/i] },
  { skill: 'Data Engineering', category: 'Data', matchers: [/\bdata engineer\b/i, /\betl\b/i, /\bsnowflake\b/i, /\bdbt\b/i, /\bdatabricks\b/i] },
  { skill: 'DevOps / SRE', category: 'DevOps', matchers: [/\bdevops\b/i, /\bsre\b/i, /\bkubernetes\b/i, /\bk8s\b/i, /\bterraform\b/i] },
  { skill: 'Cloud — AWS', category: 'DevOps', matchers: [/\baws\b/i, /\bamazon web services\b/i] },
  { skill: 'Cloud — GCP', category: 'DevOps', matchers: [/\bgcp\b/i, /\bgoogle cloud\b/i] },
  { skill: 'Cloud — Azure', category: 'DevOps', matchers: [/\bazure\b/i, /\bmicrosoft cloud\b/i] },
  { skill: 'Solidity / Smart Contracts', category: 'Blockchain', matchers: [/\bsolidity\b/i, /\bsmart contract\b/i, /\bevm\b/i] },
  { skill: 'Web3 / Crypto', category: 'Blockchain', matchers: [/\bweb3\b/i, /\bdefi\b/i, /\bcrypto\b/i, /\bnft\b/i] },
  { skill: 'UI / UX Design', category: 'Design', matchers: [/\bui\/ux\b/i, /\bux design\b/i, /\bui design\b/i, /\bproduct design\b/i] },
  { skill: 'Figma Design', category: 'Design', matchers: [/\bfigma\b/i] },
  { skill: 'Logo / Brand Design', category: 'Design', matchers: [/\blogo design\b/i, /\bbrand identity\b/i, /\bbranding\b/i] },
  { skill: 'Video Editing', category: 'Video', matchers: [/\bvideo editing\b/i, /\bpremiere pro\b/i, /\bfinal cut\b/i, /\bdavinci resolve\b/i] },
  { skill: 'Motion Graphics', category: 'Video', matchers: [/\bmotion graphics\b/i, /\bafter effects\b/i] },
  { skill: 'Copywriting', category: 'Content', matchers: [/\bcopywriter\b/i, /\bcopywriting\b/i, /\bsales copy\b/i] },
  { skill: 'Content Writing', category: 'Content', matchers: [/\bcontent writer\b/i, /\bcontent writing\b/i, /\bblog post\b/i, /\barticle writing\b/i] },
  { skill: 'SEO', category: 'Marketing', matchers: [/\bseo\b/i, /\bsearch engine optimization\b/i, /\bbacklinks\b/i] },
  { skill: 'Paid Ads — Google', category: 'Marketing', matchers: [/\bgoogle ads\b/i, /\badwords\b/i, /\bppc\b/i] },
  { skill: 'Paid Ads — Meta', category: 'Marketing', matchers: [/\bfacebook ads\b/i, /\binstagram ads\b/i, /\bmeta ads\b/i] },
  { skill: 'Email Marketing', category: 'Marketing', matchers: [/\bemail marketing\b/i, /\bklaviyo\b/i, /\bmailchimp\b/i] },
  { skill: 'Social Media Management', category: 'Marketing', matchers: [/\bsocial media manager\b/i, /\bcommunity manager\b/i] },
  { skill: 'Voice Over', category: 'Audio', matchers: [/\bvoice ?over\b/i, /\bvoice acting\b/i] },
  { skill: 'Music / Audio Production', category: 'Audio', matchers: [/\bmusic production\b/i, /\baudio engineer\b/i, /\bmixing\b/i] },
  { skill: 'Translation', category: 'Translation', matchers: [/\btranslation\b/i, /\btranslator\b/i] },
  { skill: 'Virtual Assistant', category: 'Admin Support', matchers: [/\bvirtual assistant\b/i, /\bva position\b/i, /\bexecutive assistant\b/i] },
  { skill: 'Customer Support', category: 'Admin Support', matchers: [/\bcustomer support\b/i, /\bcustomer success\b/i, /\bhelpdesk\b/i] },
  { skill: 'Bookkeeping / Accounting', category: 'Finance', matchers: [/\bbookkeeping\b/i, /\baccountant\b/i, /\bquickbooks\b/i, /\bxero\b/i] },
  { skill: 'Legal Research', category: 'Legal', matchers: [/\blegal research\b/i, /\bparalegal\b/i, /\bcontract review\b/i] },
  { skill: 'Sales / BDR', category: 'Sales', matchers: [/\bsdr\b/i, /\bbdr\b/i, /\bsales rep\b/i, /\boutbound sales\b/i] },
  { skill: 'Game Development', category: 'Game Dev', matchers: [/\bunity\b/i, /\bunreal engine\b/i, /\bgame dev/i, /\bgodot\b/i] },
  { skill: '3D Modeling', category: 'Design', matchers: [/\b3d modeling\b/i, /\bblender\b/i, /\bzbrush\b/i] },
  { skill: 'CRM / Automations', category: 'No-Code & Automation', matchers: [/\bzapier\b/i, /\bmake\.?com\b/i, /\bairtable\b/i, /\bautomation\b/i] },
  { skill: 'No-Code Development', category: 'No-Code & Automation', matchers: [/\bbubble\.?io\b/i, /\bwebflow\b/i, /\bno[-\s]?code\b/i] },
]

function extractSkill(text: string): { skill: string; category: string; tags: string[] } {
  const tags: string[] = []
  let best: { skill: string; category: string } | null = null
  let bestScore = 0
  for (const entry of SKILL_KEYWORDS) {
    const hits = entry.matchers.filter((m) => m.test(text)).length
    if (hits > 0) {
      tags.push(entry.skill)
      if (hits > bestScore) {
        bestScore = hits
        best = { skill: entry.skill, category: entry.category }
      }
    }
  }
  return {
    skill: best?.skill || 'General Freelance',
    category: best?.category || 'Uncategorized',
    tags: Array.from(new Set(tags)),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Insert helper — dedupes on listing_url
// ────────────────────────────────────────────────────────────────────────────

async function insertListings(listings: MarketListing[]): Promise<{ inserted: number; skipped: number }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { inserted: 0, skipped: listings.length }
  }
  if (listings.length === 0) return { inserted: 0, skipped: 0 }

  const sb = admin()
  const urls = listings.map((l) => l.listing_url).filter(Boolean) as string[]

  let existing = new Set<string>()
  if (urls.length > 0) {
    const { data } = await sb
      .from('market_listings')
      .select('listing_url')
      .in('listing_url', urls)
    existing = new Set((data || []).map((d: { listing_url: string }) => d.listing_url))
  }

  const fresh = listings.filter((l) => !l.listing_url || !existing.has(l.listing_url))
  if (fresh.length === 0) return { inserted: 0, skipped: listings.length }

  const { error } = await sb.from('market_listings').insert(fresh)
  if (error) {
    console.error('[market-intel] insert error', error.message)
    return { inserted: 0, skipped: listings.length }
  }

  return { inserted: fresh.length, skipped: listings.length - fresh.length }
}

// ────────────────────────────────────────────────────────────────────────────
// Upwork RSS collector
// ────────────────────────────────────────────────────────────────────────────

const UPWORK_FEEDS = [
  'https://www.upwork.com/ab/feed/jobs/rss?paging=0%3B10&sort=recency&q=developer',
  'https://www.upwork.com/ab/feed/jobs/rss?paging=0%3B10&sort=recency&q=designer',
  'https://www.upwork.com/ab/feed/jobs/rss?paging=0%3B10&sort=recency&q=writer',
  'https://www.upwork.com/ab/feed/jobs/rss?paging=0%3B10&sort=recency&q=marketing',
  'https://www.upwork.com/ab/feed/jobs/rss?paging=0%3B10&sort=recency&q=AI',
]

function decodeHtml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function parseUpworkItem(itemXml: string): MarketListing | null {
  const get = (tag: string) => {
    const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
    return m ? decodeHtml(m[1].trim()) : ''
  }
  const title = get('title')
  const link = get('link')
  const desc = get('description')
  const pubDate = get('pubDate')
  if (!title || !link) return null

  // Description contains useful fields like "Budget", "Hourly Range", "Country"
  const text = `${title} ${desc}`.replace(/<[^>]+>/g, ' ')
  const { skill, category, tags } = extractSkill(text)

  let budget_min: number | undefined
  let budget_max: number | undefined
  let fixed_price: number | undefined
  let buyer_location: string | undefined

  const hourly = desc.match(/Hourly Range[^$]*\$([\d.]+)\s*[-–]\s*\$([\d.]+)/i)
  if (hourly) {
    budget_min = parseFloat(hourly[1])
    budget_max = parseFloat(hourly[2])
  }
  const fixed = desc.match(/Budget[^$]*\$([\d,.]+)/i)
  if (fixed) fixed_price = parseFloat(fixed[1].replace(/,/g, ''))

  const country = desc.match(/Country\s*[:–-]\s*([A-Za-z][\w\s]+?)(?:<|$)/i)
  if (country) buyer_location = country[1].trim()

  return {
    platform: 'upwork',
    skill,
    category,
    title: title.slice(0, 500),
    description: text.slice(0, 2000),
    budget_min,
    budget_max,
    fixed_price,
    currency: 'USD',
    buyer_location,
    skills_tags: tags,
    listing_url: link,
    posted_at: pubDate ? new Date(pubDate).toISOString() : undefined,
  }
}

export async function collectUpwork(): Promise<CollectorResult> {
  const all: MarketListing[] = []
  let fetched = 0
  for (const url of UPWORK_FEEDS) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': '0nMarketIntel/1.0 (+https://0ncore.com)' },
      })
      if (!res.ok) continue
      const xml = await res.text()
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || []
      fetched += items.length
      for (const item of items) {
        const parsed = parseUpworkItem(item)
        if (parsed) all.push(parsed)
      }
    } catch (e) {
      console.error('[market-intel] upwork fetch failed', url, e)
    }
  }
  const { inserted, skipped } = await insertListings(all)
  return { platform: 'upwork', fetched, inserted, skipped }
}

// ────────────────────────────────────────────────────────────────────────────
// Reddit collector — r/forhire, r/freelance
// ────────────────────────────────────────────────────────────────────────────

interface RedditPost {
  data: {
    title: string
    selftext: string
    permalink: string
    created_utc: number
    link_flair_text?: string
    author?: string
  }
}

const REDDIT_SUBS = ['forhire', 'freelance', 'slavelabour', 'jobbit']

export async function collectReddit(): Promise<CollectorResult> {
  const all: MarketListing[] = []
  let fetched = 0
  for (const sub of REDDIT_SUBS) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=50`, {
        headers: { 'User-Agent': '0nMarketIntel/1.0 (by u/0ncore)' },
      })
      if (!res.ok) continue
      const json = (await res.json()) as { data?: { children?: RedditPost[] } }
      const posts = json.data?.children || []
      fetched += posts.length

      for (const p of posts) {
        const title = p.data.title || ''
        // Filter: only [HIRING] / [H] posts (people offering money)
        if (!/\[?HIRING\]?|\[H\]/i.test(title)) continue

        const text = `${title} ${p.data.selftext || ''}`
        const { skill, category, tags } = extractSkill(text)

        let budget_min: number | undefined
        let budget_max: number | undefined
        const range = text.match(/\$([\d,]+)\s*[-–to]+\s*\$?([\d,]+)/)
        if (range) {
          budget_min = parseFloat(range[1].replace(/,/g, ''))
          budget_max = parseFloat(range[2].replace(/,/g, ''))
        }
        const flat = text.match(/\$([\d,]+)\b/)
        const fixed_price = !range && flat ? parseFloat(flat[1].replace(/,/g, '')) : undefined

        all.push({
          platform: 'reddit',
          skill,
          category,
          title: title.slice(0, 500),
          description: (p.data.selftext || '').slice(0, 2000),
          budget_min,
          budget_max,
          fixed_price,
          currency: 'USD',
          skills_tags: tags,
          listing_url: `https://reddit.com${p.data.permalink}`,
          posted_at: new Date(p.data.created_utc * 1000).toISOString(),
        })
      }
    } catch (e) {
      console.error('[market-intel] reddit fetch failed', sub, e)
    }
  }
  const { inserted, skipped } = await insertListings(all)
  return { platform: 'reddit', fetched, inserted, skipped }
}

// ────────────────────────────────────────────────────────────────────────────
// Hacker News "Who is Hiring" collector via Algolia HN search
// ────────────────────────────────────────────────────────────────────────────

interface HnHit {
  objectID: string
  comment_text?: string
  created_at?: string
  parent_id?: number
}

export async function collectHackerNews(): Promise<CollectorResult> {
  const all: MarketListing[] = []
  let fetched = 0
  try {
    const res = await fetch(
      'https://hn.algolia.com/api/v1/search_by_date?tags=comment&query=hiring%20remote&hitsPerPage=80'
    )
    if (!res.ok) {
      return { platform: 'hackernews', fetched: 0, inserted: 0, skipped: 0, error: `${res.status}` }
    }
    const json = (await res.json()) as { hits?: HnHit[] }
    const hits = json.hits || []
    fetched = hits.length

    for (const h of hits) {
      if (!h.comment_text) continue
      const text = h.comment_text.replace(/<[^>]+>/g, ' ').slice(0, 2000)
      // Heuristic: HN hiring comments tend to start with company | role | location
      if (!/hiring|engineer|developer|designer|remote|onsite/i.test(text)) continue

      const { skill, category, tags } = extractSkill(text)
      const title = text.split(/[.|—\n]/)[0].slice(0, 200)

      const salary = text.match(/\$(\d{2,3})[k,](?:\s*[-–]\s*\$?(\d{2,3})k)?/i)
      let budget_min: number | undefined
      let budget_max: number | undefined
      if (salary) {
        budget_min = parseFloat(salary[1]) * 1000
        if (salary[2]) budget_max = parseFloat(salary[2]) * 1000
      }

      const remote = /remote/i.test(text)

      all.push({
        platform: 'hackernews',
        skill,
        category,
        title,
        description: text,
        budget_min,
        budget_max,
        currency: 'USD',
        buyer_location: remote ? 'Remote' : undefined,
        skills_tags: tags,
        listing_url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        posted_at: h.created_at,
      })
    }
  } catch (e) {
    console.error('[market-intel] hackernews fetch failed', e)
  }
  const { inserted, skipped } = await insertListings(all)
  return { platform: 'hackernews', fetched, inserted, skipped }
}

// ────────────────────────────────────────────────────────────────────────────
// GitHub trending repos — signal for hot tech / skill demand
// ────────────────────────────────────────────────────────────────────────────

interface GitHubRepo {
  full_name: string
  description?: string | null
  language?: string | null
  stargazers_count: number
  html_url: string
  pushed_at: string
  topics?: string[]
}

export async function collectGitHub(): Promise<CollectorResult> {
  const all: MarketListing[] = []
  let fetched = 0
  try {
    // Repos created in last 7 days, ordered by stars — proxy for emerging tech demand
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const res = await fetch(
      `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=50`,
      {
        headers: {
          'User-Agent': '0nMarketIntel/1.0',
          Accept: 'application/vnd.github+json',
          ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
      }
    )
    if (!res.ok) {
      return { platform: 'github', fetched: 0, inserted: 0, skipped: 0, error: `${res.status}` }
    }
    const json = (await res.json()) as { items?: GitHubRepo[] }
    const items = json.items || []
    fetched = items.length

    for (const repo of items) {
      const text = `${repo.full_name} ${repo.description || ''} ${repo.language || ''} ${(repo.topics || []).join(' ')}`
      const { skill, category, tags } = extractSkill(text)

      all.push({
        platform: 'github',
        skill,
        category,
        title: repo.full_name,
        description: (repo.description || '').slice(0, 1000),
        skills_tags: Array.from(new Set([...tags, ...(repo.topics || [])])),
        listing_url: repo.html_url,
        posted_at: repo.pushed_at,
        raw_data: { stars: repo.stargazers_count, language: repo.language },
      })
    }
  } catch (e) {
    console.error('[market-intel] github fetch failed', e)
  }
  const { inserted, skipped } = await insertListings(all)
  return { platform: 'github', fetched, inserted, skipped }
}

// ────────────────────────────────────────────────────────────────────────────
// Stub collectors — to be replaced with scrapers
// ────────────────────────────────────────────────────────────────────────────

export async function collectFiverr(): Promise<CollectorResult> {
  console.log('[market-intel] fiverr collector: not implemented (scraping required)')
  return { platform: 'fiverr', fetched: 0, inserted: 0, skipped: 0, error: 'not_implemented' }
}

export async function collectFreelancer(): Promise<CollectorResult> {
  console.log('[market-intel] freelancer collector: not implemented (scraping required)')
  return { platform: 'freelancer', fetched: 0, inserted: 0, skipped: 0, error: 'not_implemented' }
}

export async function collectToptal(): Promise<CollectorResult> {
  console.log('[market-intel] toptal collector: not implemented (scraping required)')
  return { platform: 'toptal', fetched: 0, inserted: 0, skipped: 0, error: 'not_implemented' }
}

export async function collectPeoplePerHour(): Promise<CollectorResult> {
  console.log('[market-intel] peopleperhour collector: not implemented (scraping required)')
  return { platform: 'peopleperhour', fetched: 0, inserted: 0, skipped: 0, error: 'not_implemented' }
}

// ────────────────────────────────────────────────────────────────────────────
// Run all collectors
// ────────────────────────────────────────────────────────────────────────────

export async function collectAll(): Promise<CollectorResult[]> {
  const collectors = [
    collectUpwork,
    collectReddit,
    collectHackerNews,
    collectGitHub,
    collectFiverr,
    collectFreelancer,
    collectToptal,
    collectPeoplePerHour,
  ]
  const results: CollectorResult[] = []
  for (const c of collectors) {
    try {
      results.push(await c())
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      results.push({ platform: c.name, fetched: 0, inserted: 0, skipped: 0, error: msg })
    }
  }
  return results
}
