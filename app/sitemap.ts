import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: '', priority: 1, changeFrequency: 'daily' as const },
    { path: '/platform', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/connections', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/request', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/hipaa', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/launch-party', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/login', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/signup', priority: 0.6, changeFrequency: 'monthly' as const },
  ]

  return pages.map(p => ({
    url: `https://0ncore.com${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))
}
