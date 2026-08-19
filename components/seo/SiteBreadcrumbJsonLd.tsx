'use client'

import { usePathname } from 'next/navigation'
import { breadcrumbList, graph, jsonLdScript, type Crumb } from '@/lib/seo/jsonld'

/**
 * BreadcrumbList for every marketing page, emitted once from the root layout.
 *
 * WHY A CLIENT COMPONENT. The path is what a breadcrumb is made of, and a
 * server layout in the App Router is not told which child route rendered it —
 * only a Client Component gets usePathname(). It still lands in the initial
 * HTML: this renders during SSR, so the <script> is in the document a crawler
 * is served, not something hydration paints in later. (Same reason
 * PublicNavWrapper is a client component.)
 *
 * Labels come from LABELS where a segment has a real product name that
 * title-casing would mangle ('0nagent' → '0nagent', not 'Onagent'); everything
 * else is title-cased from the slug, which is right far more often than it is
 * wrong and degrades gracefully for routes that do not exist yet.
 */

/**
 * Routes that build their own BreadcrumbList with names this component cannot
 * know — a marketplace addon's real title, a docs page's section. Two
 * BreadcrumbList nodes on one page is a contradiction, not extra coverage, so
 * those pages keep theirs and this one stands down.
 */
const SELF_MANAGED = ['/hipaa', '/marketplace/', '/docs/']

const LABELS: Record<string, string> = {
  '0nagent': '0nAgent',
  'ai-task-lists': 'AI Task Lists',
  agencies: 'Agencies',
  blog: 'Blog',
  'client-management': 'Client Management',
  'course-builder': 'Course Builder',
  crm: 'CRM',
  docs: 'Docs',
  hipaa: 'HIPAA',
  marketplace: 'Marketplace',
  platform: 'Platform',
  pricing: 'Pricing',
  security: 'Security',
  'use-cases': 'Use Cases',
  'website-management': 'Website Management',
}

function label(segment: string) {
  if (LABELS[segment]) return LABELS[segment]
  return segment
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export default function SiteBreadcrumbJsonLd() {
  const pathname = usePathname()

  // Home is the root of the trail, not a step in it — a one-item breadcrumb
  // says nothing and Google ignores it.
  if (!pathname || pathname === '/') return null
  if (SELF_MANAGED.some((p) => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p))) return null

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const trail: Crumb[] = [{ name: 'Home', path: '/' }]
  segments.forEach((segment, i) => {
    trail.push({ name: label(segment), path: '/' + segments.slice(0, i + 1).join('/') })
  })

  return <script {...jsonLdScript(graph(breadcrumbList(trail)))} />
}
