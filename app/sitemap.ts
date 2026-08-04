import type { MetadataRoute } from 'next'

/**
 * The sitemap.
 *
 * ORIGIN MUST MATCH THE CANONICALS. Every page declares
 * `https://www.0ncore.com/…` as its canonical, and the bare domain 308s to www —
 * so listing bare-domain URLs here pointed crawlers at a redirect for every
 * single entry, which wastes crawl budget and muddies which URL is the real one.
 *
 * /agencies was missing entirely despite being the primary conversion page.
 */

const ORIGIN = 'https://www.0ncore.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: '', priority: 1, changeFrequency: 'daily' as const },

    // Agency product surfaces — one page per search intent.
    { path: '/agencies', priority: 0.95, changeFrequency: 'weekly' as const },
    { path: '/client-management', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/ai-task-lists', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/website-management', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/course-builder', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/verticals', priority: 0.6, changeFrequency: 'monthly' as const },

    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/security', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/0nagent', priority: 0.8, changeFrequency: 'monthly' as const },

    { path: '/platform', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/connections', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/request', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/hipaa', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/launch-party', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/login', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/signup', priority: 0.6, changeFrequency: 'monthly' as const },
  ]

  return pages.map((p) => ({
    url: `${ORIGIN}${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))
}
