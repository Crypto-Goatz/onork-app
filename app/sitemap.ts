import type { MetadataRoute } from 'next'
import LASTMOD_JSON from '@/lib/content-lastmod.json'
import { CATEGORIES, visibleAddons } from '@/lib/marketplace-data'
import { GUIDES } from '@/lib/guides/registry'
import { VALID_SLUGS as COMPARE_SLUGS } from '@/lib/compare-data'
import { getPublishedPosts, getCategories } from '@/lib/blog/data'
import { getPublishedUseCases } from '@/lib/use-cases/data'

/**
 * The sitemap.
 *
 * ORIGIN MUST MATCH THE CANONICALS. Every page declares
 * `https://www.0ncore.com/…` as its canonical, and the bare domain 308s to www —
 * so listing bare-domain URLs here pointed crawlers at a redirect for every
 * single entry, which wastes crawl budget and muddies which URL is the real one.
 *
 * Two things this file used to get wrong, both of which cost indexing:
 *
 * 1. It listed 18 hand-written paths. The blog (40 published posts), the
 *    marketplace add-on and category pages, the comparison pages and the guides
 *    were all built, JSON-LD-equipped and live — and none of them were ever
 *    submitted. They were reachable only by a crawler finding an internal link.
 *
 * 2. Every entry carried `new Date()`, so all 18 shared one build timestamp that
 *    moved on every deploy. A lastmod that changes when the content did not is a
 *    lastmod crawlers stop trusting, and the cost lands on the pages that really
 *    did change. Dates now come per URL from the thing that actually produces the
 *    page: `published_at`/`updated_at` for a post, the last commit that touched
 *    the source file for everything static (see scripts/gen-content-lastmod.mjs).
 *
 * /login and /signup are gone. They are auth endpoints with nothing to rank.
 */

export const revalidate = 3600

const ORIGIN = 'https://www.0ncore.com'

const LASTMOD: Record<string, string> = LASTMOD_JSON

/**
 * Used only for a path with no dated source. It is the old bug in miniature, so
 * it says so out loud rather than quietly stamping today's date on everything.
 */
function fallback(reason: string): string {
  console.warn('[sitemap] no dated source for', reason, '— falling back to build time')
  return new Date().toISOString()
}

function fileDate(file: string, quiet = false): string | undefined {
  const d = LASTMOD[file]
  if (!d && !quiet) console.warn('[sitemap] not in content-lastmod.json:', file)
  return d
}

/** The newest of several sources — a page is as fresh as its freshest input. */
function newest(...dates: (string | undefined)[]): string | undefined {
  const valid = dates.filter((d): d is string => Boolean(d))
  if (valid.length === 0) return undefined
  return valid.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
}

/** `/docs/course-builder` → `app/docs/course-builder/page.tsx`; `''` → `app/page.tsx`. */
function pageFile(path: string): string {
  return path ? `app/${path.replace(/^\//, '')}/page.tsx` : 'app/page.tsx'
}

type Entry = MetadataRoute.Sitemap[number]

function entry(
  path: string,
  priority: number,
  changeFrequency: Entry['changeFrequency'],
  lastModified?: string,
): Entry {
  return {
    url: `${ORIGIN}${path}`,
    lastModified: lastModified ?? fallback(path || '/'),
    changeFrequency,
    priority,
  }
}

// ── Static pages ─────────────────────────────────────────────────────────────
// lastmod is the last commit that touched the page's own file.

const STATIC: { path: string; priority: number; changeFrequency: Entry['changeFrequency'] }[] = [
  { path: '', priority: 1, changeFrequency: 'daily' },

  // Agency product surfaces — one page per search intent.
  { path: '/agencies', priority: 0.95, changeFrequency: 'weekly' },
  { path: '/client-management', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/ai-task-lists', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/website-management', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/course-builder', priority: 0.7, changeFrequency: 'monthly' },
  // The docs page carries the app's permissions, data handling and FAQ — the
  // things both a marketplace reviewer and an answer engine come looking for,
  // so it is ranked above the marketing page rather than below it.
  { path: '/docs/course-builder', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/verticals', priority: 0.6, changeFrequency: 'monthly' },

  { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/security', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/0nagent', priority: 0.8, changeFrequency: 'monthly' },

  { path: '/platform', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/connections', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/request', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/hipaa', priority: 0.9, changeFrequency: 'weekly' },
  // /launch-party is NOT here: it 307s to /signup, which this sitemap drops.
  // It was submitted for months because a redirect-following probe reports 200.

  // Built, JSON-LD-equipped and previously unsubmitted.
  { path: '/builtwith', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: Entry[] = STATIC.map(p => entry(p.path, p.priority, p.changeFrequency, fileDate(pageFile(p.path))))

  // ── Blog ───────────────────────────────────────────────────────────────────
  // Dates come from the rows, so each post reports when it was actually written
  // or edited. If the query fails the blog contributes nothing rather than a
  // block of URLs stamped with today — getPublishedPosts logs the reason.
  const [posts, blogCategories] = await Promise.all([getPublishedPosts(), getCategories()])

  const blogIndexFile = fileDate('app/blog/page.tsx')
  urls.push(entry('/blog', 0.9, 'daily', newest(blogIndexFile, posts[0]?.lastModified)))

  const categoryPageFile = fileDate('app/blog/[category]/page.tsx')
  for (const cat of blogCategories) {
    const newestInCat = newest(...posts.filter(p => p.categorySlug === cat.slug).map(p => p.lastModified))
    urls.push(entry(`/blog/${cat.slug}`, 0.7, 'weekly', newest(categoryPageFile, newestInCat)))
  }

  for (const post of posts) {
    urls.push(entry(`/blog/${post.categorySlug}/${post.slug}`, 0.8, 'monthly', post.lastModified))
  }

  // ── Marketplace ────────────────────────────────────────────────────────────
  // Listings are static data, so a listing page is as old as the registry that
  // renders it. visibleAddons() with no viewer is the same gate the pages use —
  // an owner-only listing must not be discoverable through the sitemap either.
  const registry = fileDate('lib/marketplace-data.ts')

  urls.push(entry('/marketplace', 0.9, 'weekly', newest(fileDate('app/marketplace/page.tsx'), registry)))

  const marketplaceCategoryFile = fileDate('app/marketplace/[category]/page.tsx')
  const categoryDate = newest(marketplaceCategoryFile, registry)
  urls.push(entry('/marketplace/all', 0.8, 'weekly', categoryDate))
  for (const cat of CATEGORIES) {
    urls.push(entry(`/marketplace/${cat.slug}`, 0.8, 'weekly', categoryDate))
  }

  const addonDate = newest(fileDate('app/marketplace/addon/[slug]/page.tsx'), registry)
  for (const addon of visibleAddons()) {
    urls.push(entry(`/marketplace/addon/${addon.slug}`, 0.7, 'monthly', addonDate))
  }

  // ── Guides ─────────────────────────────────────────────────────────────────
  // Only 'live' guides have a page; /guides/[slug] 404s for the rest, and a
  // sitemap full of 404s is worse than a short sitemap.
  const guideRegistry = fileDate('lib/guides/registry.ts')
  const guidePageFile = fileDate('app/guides/[slug]/page.tsx')
  urls.push(entry('/guides', 0.8, 'weekly', newest(fileDate('app/guides/page.tsx'), guideRegistry)))
  for (const guide of GUIDES.filter(g => g.status === 'live')) {
    urls.push(entry(
      `/guides/${guide.slug}`,
      0.7,
      'monthly',
      newest(guidePageFile, fileDate(`content/guides/${guide.file}`)),
    ))
  }

  // ── Comparisons ────────────────────────────────────────────────────────────
  // There is no /compare index route — it 404s — so only the leaves are listed.
  const compareDate = newest(fileDate('app/compare/[slug]/page.tsx'), fileDate('lib/compare-data.ts'))
  for (const slug of COMPARE_SLUGS) {
    urls.push(entry(`/compare/${slug}`, 0.75, 'monthly', compareDate))
  }

  // ── Use cases ──────────────────────────────────────────────────────────────
  // The children used to be held out by hand: `use_cases` did not exist in this
  // Supabase project, so every /use-cases/<slug> 404d and a sitemap of 404s is
  // worse than a short one. The table exists now (20260819_use_cases.sql), so the
  // list is derived from the rows that will actually render — never hand-kept,
  // and empty rather than wrong if the query fails.
  const useCases = await getPublishedUseCases()

  const useCasesIndexFile = fileDate('app/use-cases/page.tsx')
  urls.push(entry('/use-cases', 0.8, 'weekly', newest(useCasesIndexFile, useCases[0]?.lastModified)))

  const useCasePageFile = fileDate('app/use-cases/[slug]/page.tsx')
  for (const uc of useCases) {
    urls.push(entry(`/use-cases/${uc.slug}`, 0.7, 'monthly', newest(useCasePageFile, uc.lastModified)))
  }

  return urls
}
