/**
 * Structured data — single source of truth for the marketing site.
 *
 * Every JSON-LD block on www.0ncore.com resolves back to ONE Organization and
 * ONE WebSite node, addressed by @id. That is the whole point of putting them
 * here: a Product on /pricing and a SoftwareApplication on /platform that both
 * point at `${SITE}/#organization` are understood as the same publisher, where
 * two hand-written Organization blocks with slightly different names are two
 * companies as far as a crawler is concerned.
 *
 * HOST IS www, ALWAYS. The apex redirects and robots.txt now advertises www
 * (audit C2), so an @id or url written against https://0ncore.com describes a
 * URL that answers with a 308 — a different node from the one the canonical
 * tag points at. Use SITE; never hardcode the apex.
 */

export const SITE = 'https://www.0ncore.com'

export const ORG_ID = `${SITE}/#organization`
export const WEBSITE_ID = `${SITE}/#website`

/** The publisher node. Referenced by @id from every other page's graph. */
export const organization = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: '0nCore',
  legalName: 'RocketOpp LLC',
  url: SITE,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE}/0ncore-logo-light.png`,
  },
  description:
    'Run every client account from one chat. 0nCore installs into the CRM you already use, plans the work, prices it, and runs it once you approve.',
} as const

export const website = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: SITE,
  name: '0nCore',
  publisher: { '@id': ORG_ID },
} as const

/** Reference the publisher without restating it. */
export const orgRef = { '@id': ORG_ID } as const

export interface FaqItem {
  q: string
  a: string
}

/**
 * FAQPage from the SAME array the page renders.
 *
 * Google requires the answer text in the markup to match what a visitor sees;
 * schema written by hand alongside a rendered list drifts the first time
 * someone edits one and not the other. Pass the render array in, so it cannot.
 *
 * ONE FAQPage PER PAGE. If a page renders two FAQ sections, concatenate the
 * arrays into a single call rather than emitting a second FAQPage block.
 */
export function faqPage(items: readonly FaqItem[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export interface Crumb {
  name: string
  /** Absolute path, leading slash. `/` for home. */
  path: string
}

export function breadcrumbList(trail: readonly Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.path === '/' ? SITE : `${SITE}${c.path}`,
    })),
  }
}

/** Wrap nodes in the @graph envelope every page ships. */
export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}

/**
 * Spread onto a <script> tag:
 *   <script {...jsonLdScript(graph(organization, website))} />
 */
export function jsonLdScript(data: unknown) {
  return {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  } as const
}
