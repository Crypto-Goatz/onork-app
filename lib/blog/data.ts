/**
 * The blog's read model — the one place that knows the real shape of `blog_posts`.
 *
 * Every blog surface (/blog, /blog/[category], /blog/[category]/[slug]) wrote its
 * own select against columns that do not exist — `category_slug`, `subtitle`,
 * `reading_time`, `author_name` — plus a `blog_categories` table that was never
 * created. PostgREST answers an unknown column with an error, supabase-js puts it
 * in `error` and leaves `data` null, and all three callers read `data || []`.
 * So the blog rendered "no posts" while 40 published rows sat in the table, and
 * every post page shipped `<title>Post Not Found</title>` with no canonical.
 *
 * Categories are DERIVED from the `category` column rather than stored in a
 * second table: the posts already carry the value, and a table that has to agree
 * with a column is the two-sources-of-truth bug wearing a schema.
 */

import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/** Columns that actually exist on `blog_posts`. Verified against production. */
const POST_COLUMNS =
  'id, slug, title, excerpt, meta_description, category, author, author_title, word_count, image, tags, published_at, updated_at, created_at'

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  metaDescription: string | null
  categorySlug: string
  categoryName: string
  authorName: string
  authorTitle: string | null
  readingTime: number
  wordCount: number
  image: string | null
  tags: string[]
  publishedAt: string
  /**
   * `updated_at` when present, else `published_at`, normalized to ISO-8601 `Z`.
   * Postgres hands back `+00:00` with microseconds; the sitemap mixes these with
   * git-derived dates, and one format across every entry is one fewer thing for a
   * crawler to disagree with us about. Never a build timestamp.
   */
  lastModified: string
}

export interface BlogCategory {
  slug: string
  name: string
  description: string
  color: string
  count: number
}

/**
 * `category` is free text and has been written by several generators, so the same
 * topic arrives as 'tutorial' and 'tutorials', 'Case Study' and 'case-study'.
 * One function turns all of them into the slug that appears in the URL, and every
 * caller — pages and sitemap alike — goes through it.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  tutorial: 'tutorials',
  guide: 'guides',
  'case-studies': 'case-study',
  announcement: 'announcements',
}

export function slugifyCategory(raw: string | null | undefined): string {
  const base = (raw || 'uncategorized')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return CATEGORY_ALIASES[base] || base || 'uncategorized'
}

/** Display copy for the slugs we actually publish under. Unknown slugs fall back. */
const CATEGORY_META: Record<string, { name: string; description: string; color: string }> = {
  'ai-automation': { name: 'AI & Automation', description: 'Agents that execute, not just chat — automation patterns built on the 0nMCP tool layer.', color: '#7ed957' },
  'crm-strategy': { name: 'CRM Strategy', description: 'Pipeline, follow-up and revenue operations for agencies running many client accounts.', color: '#00d4ff' },
  product: { name: 'Product', description: 'What shipped in 0nCore, why it was built that way, and how to use it.', color: '#a78bfa' },
  engineering: { name: 'Engineering', description: 'How the platform is actually put together — architecture, tradeoffs and postmortems.', color: '#f97316' },
  guides: { name: 'Guides', description: 'Step-by-step builds you can follow end to end.', color: '#fbbf24' },
  tutorials: { name: 'Tutorials', description: 'Short, task-shaped walkthroughs of one thing at a time.', color: '#14b8a6' },
  'case-study': { name: 'Case Studies', description: 'Real deployments, with the numbers that came out of them.', color: '#ec4899' },
  release: { name: 'Releases', description: 'Release notes for the platform and the marketplace add-ons.', color: '#8b5cf6' },
  announcements: { name: 'Announcements', description: 'Company and platform news worth reading in full.', color: '#00d4ff' },
  news: { name: 'News', description: 'What moved in the AI and CRM ecosystem, and what it means for operators.', color: '#60a5fa' },
  roadmap: { name: 'Roadmap', description: 'What is being built next, and the thinking behind the order.', color: '#f472b6' },
  marketplace: { name: 'Marketplace', description: 'Add-on launches, pricing and install guides for the 0nCore marketplace.', color: '#fbbf24' },
  compliance: { name: 'Compliance', description: 'HIPAA, data handling and the parts of security a buyer actually audits.', color: '#ef4444' },
}

const FALLBACK_COLORS = ['#7ed957', '#00d4ff', '#a78bfa', '#fbbf24', '#14b8a6', '#ec4899', '#f97316', '#60a5fa']

function titleCase(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function readingTime(wordCount: number | null): number {
  if (!wordCount || wordCount < 1) return 1
  return Math.max(1, Math.round(wordCount / 200))
}

function normalize(row: Record<string, unknown>): BlogPost {
  const categorySlug = slugifyCategory(row.category as string)
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: (row.excerpt as string) ?? null,
    metaDescription: (row.meta_description as string) ?? null,
    categorySlug,
    categoryName: CATEGORY_META[categorySlug]?.name ?? titleCase(categorySlug),
    authorName: (row.author as string) || '0nCore',
    authorTitle: (row.author_title as string) ?? null,
    readingTime: readingTime(row.word_count as number),
    wordCount: (row.word_count as number) || 0,
    image: (row.image as string) ?? null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    publishedAt: new Date(String(row.published_at)).toISOString(),
    lastModified: new Date(String(row.updated_at || row.published_at)).toISOString(),
  }
}

/**
 * Every published post, newest first. One query per request; the surfaces derive
 * what they need from it.
 *
 * A failure here used to be indistinguishable from an empty blog. It now logs
 * PostgREST's own words and rethrows nothing — callers still get [], but the
 * build log says why, which is the only reason anyone found this at all.
 */
export const getPublishedPosts = cache(async (): Promise<BlogPost[]> => {
  const { data, error } = await admin
    .from('blog_posts')
    .select(POST_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('[blog] blog_posts query failed:', error.code, error.message, error.details ?? '')
    return []
  }
  return (data || []).filter(r => r.slug && r.published_at).map(normalize)
})

export const getCategories = cache(async (): Promise<BlogCategory[]> => {
  const posts = await getPublishedPosts()
  const counts = new Map<string, number>()
  for (const p of posts) counts.set(p.categorySlug, (counts.get(p.categorySlug) || 0) + 1)

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([slug, count], i) => ({
      slug,
      count,
      name: CATEGORY_META[slug]?.name ?? titleCase(slug),
      description: CATEGORY_META[slug]?.description ?? `Articles filed under ${titleCase(slug)}.`,
      color: CATEGORY_META[slug]?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }))
})

export async function getCategory(slug: string): Promise<BlogCategory | null> {
  const cats = await getCategories()
  return cats.find(c => c.slug === slug) ?? null
}

export async function getPostsByCategory(slug: string): Promise<BlogPost[]> {
  const posts = await getPublishedPosts()
  return posts.filter(p => p.categorySlug === slug)
}

/**
 * Slugs are unique across the table, so a post is looked up by slug alone and the
 * category segment is verified against it. That way /blog/wrong-cat/real-post is
 * a 404 rather than a second URL serving the same article.
 */
export async function getPost(categorySlug: string, slug: string): Promise<BlogPost | null> {
  const posts = await getPublishedPosts()
  const post = posts.find(p => p.slug === slug)
  if (!post || post.categorySlug !== categorySlug) return null
  return post
}

/**
 * The article body. Kept out of the list query on purpose — `content` is the one
 * large column, and the index, the category pages and the sitemap never render it.
 *
 * `content` is the markdown source; some older rows only filled `body`.
 */
export async function getPostContent(slug: string): Promise<string> {
  const { data, error } = await admin
    .from('blog_posts')
    .select('content, body')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    console.error('[blog] content query failed for', slug + ':', error.code, error.message)
    return ''
  }
  return (data?.content || data?.body || '') as string
}
