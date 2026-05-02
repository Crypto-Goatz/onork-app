/**
 * Server-side stack/CRM detectors.
 *
 * Ported from 0n-extension/src/lib/detectors. Browser-only signals (cookie,
 * global) are skipped — we work from fetched HTML + extracted hosts only.
 *
 * Signal kinds supported server-side:
 *   meta, script, iframe, html, attr, host, header
 *
 * Categories: platform, crm, analytics, chat, email, payments, security
 */

export type Category =
  | 'platform'
  | 'crm'
  | 'analytics'
  | 'chat'
  | 'email'
  | 'payments'
  | 'security'

export const CATEGORIES: Category[] = [
  'platform',
  'crm',
  'analytics',
  'chat',
  'email',
  'payments',
  'security',
]

type Signal =
  | { kind: 'meta'; name: string; match?: string | RegExp }
  | { kind: 'script'; src_includes: string }
  | { kind: 'iframe'; src_includes: string }
  | { kind: 'html'; source_includes?: string; source_match?: RegExp }
  | { kind: 'attr'; selector: string; attr: string }
  | { kind: 'host'; hostname_includes: string }
  | { kind: 'header'; name: string; match?: string | RegExp }
  | { kind: 'cookie'; name?: string; name_starts?: string }
  | { kind: 'global'; path: string }

export interface Detector {
  id: string
  name: string
  category: Category
  fallback?: boolean
  requires?: string[]
  cross_link?: string
  signals: Signal[]
}

// ─────────────────────────────────────────────────────────────
// Detector definitions (kept in sync with 0n-extension)
// ─────────────────────────────────────────────────────────────

const PLATFORM: Detector[] = [
  {
    id: 'wordpress',
    name: 'WordPress',
    category: 'platform',
    signals: [
      { kind: 'meta', name: 'generator', match: /WordPress/i },
      { kind: 'script', src_includes: '/wp-content/' },
      { kind: 'script', src_includes: '/wp-includes/' },
      { kind: 'host', hostname_includes: 'wp.com' },
      { kind: 'html', source_includes: 'wp-json' },
    ],
  },
  {
    id: 'wix',
    name: 'Wix',
    category: 'platform',
    signals: [
      { kind: 'header', name: 'x-wix-request-id' },
      { kind: 'host', hostname_includes: 'wixstatic.com' },
      { kind: 'host', hostname_includes: 'wix.com' },
    ],
  },
  {
    id: 'squarespace',
    name: 'Squarespace',
    category: 'platform',
    signals: [
      { kind: 'host', hostname_includes: 'squarespace.com' },
      { kind: 'host', hostname_includes: 'squarespace-cdn.com' },
      { kind: 'meta', name: 'generator', match: /Squarespace/i },
    ],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'platform',
    signals: [
      { kind: 'host', hostname_includes: 'cdn.shopify.com' },
      { kind: 'header', name: 'x-shopify-stage' },
      { kind: 'meta', name: 'shopify-checkout-api-token' },
      { kind: 'html', source_includes: 'Shopify.theme' },
      { kind: 'html', source_includes: 'Shopify.shop' },
    ],
  },
  {
    id: 'webflow',
    name: 'Webflow',
    category: 'platform',
    signals: [
      { kind: 'meta', name: 'generator', match: /Webflow/i },
      { kind: 'attr', selector: 'html', attr: 'data-wf-site' },
      { kind: 'host', hostname_includes: 'website-files.com' },
      { kind: 'host', hostname_includes: 'webflow.com' },
    ],
  },
  {
    id: 'framer',
    name: 'Framer',
    category: 'platform',
    signals: [
      { kind: 'host', hostname_includes: 'framerusercontent.com' },
      { kind: 'host', hostname_includes: 'framer.com' },
      { kind: 'meta', name: 'generator', match: /Framer/i },
    ],
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    category: 'platform',
    signals: [
      { kind: 'html', source_includes: '__NEXT_DATA__' },
      { kind: 'script', src_includes: '/_next/static/' },
      { kind: 'meta', name: 'next-head-count' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom / Unknown',
    category: 'platform',
    fallback: true,
    signals: [],
  },
]

const CRM: Detector[] = [
  {
    id: 'crm_rocket',
    name: 'CRM (Rocket)',
    category: 'crm',
    signals: [
      { kind: 'host', hostname_includes: 'app.gohighlevel.com' },
      { kind: 'host', hostname_includes: 'msgsndr.com' },
      { kind: 'host', hostname_includes: 'leadconnectorhq.com' },
      { kind: 'host', hostname_includes: 'highlevel' },
      { kind: 'script', src_includes: 'leadconnector' },
      { kind: 'iframe', src_includes: 'gohighlevel' },
      { kind: 'iframe', src_includes: 'leadconnector' },
      { kind: 'iframe', src_includes: 'msgsndr' },
    ],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    signals: [
      { kind: 'host', hostname_includes: 'js.hs-scripts.com' },
      { kind: 'host', hostname_includes: 'js.hs-analytics.net' },
      { kind: 'host', hostname_includes: 'forms.hsforms.com' },
      { kind: 'script', src_includes: 'hs-scripts' },
      { kind: 'script', src_includes: 'hs-analytics' },
    ],
  },
  {
    id: 'pardot',
    name: 'Salesforce Pardot',
    category: 'crm',
    signals: [
      { kind: 'host', hostname_includes: 'pi.pardot.com' },
      { kind: 'host', hostname_includes: 'go.pardot.com' },
    ],
  },
  {
    id: 'activecampaign',
    name: 'ActiveCampaign',
    category: 'crm',
    signals: [
      { kind: 'host', hostname_includes: 'trackcmp.net' },
      { kind: 'host', hostname_includes: 'activehosted.com' },
    ],
  },
  {
    id: 'zoho',
    name: 'Zoho',
    category: 'crm',
    signals: [
      { kind: 'host', hostname_includes: 'zohocdn.com' },
      { kind: 'host', hostname_includes: 'zoho.com' },
    ],
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    category: 'crm',
    signals: [
      { kind: 'host', hostname_includes: 'pipedrive.com' },
      { kind: 'host', hostname_includes: 'leadbooster' },
    ],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    signals: [
      { kind: 'host', hostname_includes: 'force.com' },
      { kind: 'host', hostname_includes: 'salesforce.com' },
      { kind: 'host', hostname_includes: 'pardot.com' },
    ],
  },
]

const ANALYTICS: Detector[] = [
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    category: 'analytics',
    signals: [
      { kind: 'script', src_includes: 'googletagmanager.com/gtag/js' },
      { kind: 'html', source_match: /G-[A-Z0-9]{6,12}/ },
    ],
  },
  {
    id: 'gtm',
    name: 'Google Tag Manager',
    category: 'analytics',
    signals: [
      { kind: 'script', src_includes: 'googletagmanager.com/gtm.js' },
      { kind: 'html', source_includes: 'GTM-' },
    ],
  },
  {
    id: 'plausible',
    name: 'Plausible',
    category: 'analytics',
    signals: [
      { kind: 'host', hostname_includes: 'plausible.io' },
      { kind: 'script', src_includes: 'plausible.io/js' },
    ],
  },
  {
    id: 'fathom',
    name: 'Fathom',
    category: 'analytics',
    signals: [
      { kind: 'host', hostname_includes: 'usefathom.com' },
      { kind: 'host', hostname_includes: 'cdn.usefathom.com' },
    ],
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    category: 'analytics',
    signals: [
      { kind: 'host', hostname_includes: 'cdn.mxpnl.com' },
      { kind: 'host', hostname_includes: 'api-js.mixpanel.com' },
    ],
  },
  {
    id: 'amplitude',
    name: 'Amplitude',
    category: 'analytics',
    signals: [
      { kind: 'host', hostname_includes: 'cdn.amplitude.com' },
      { kind: 'host', hostname_includes: 'amplitude.com' },
    ],
  },
  {
    id: 'posthog',
    name: 'PostHog',
    category: 'analytics',
    signals: [
      { kind: 'host', hostname_includes: 'app.posthog.com' },
      { kind: 'host', hostname_includes: 'i.posthog.com' },
    ],
  },
  {
    id: 'meta_pixel',
    name: 'Meta Pixel',
    category: 'analytics',
    signals: [
      { kind: 'script', src_includes: 'connect.facebook.net' },
      { kind: 'html', source_includes: 'fbq(' },
    ],
  },
]

const CHAT: Detector[] = [
  {
    id: 'intercom',
    name: 'Intercom',
    category: 'chat',
    signals: [
      { kind: 'host', hostname_includes: 'widget.intercom.io' },
      { kind: 'host', hostname_includes: 'js.intercomcdn.com' },
    ],
  },
  {
    id: 'drift',
    name: 'Drift',
    category: 'chat',
    signals: [
      { kind: 'host', hostname_includes: 'js.driftt.com' },
      { kind: 'host', hostname_includes: 'drift.com' },
    ],
  },
  {
    id: 'tawk',
    name: 'Tawk.to',
    category: 'chat',
    signals: [{ kind: 'host', hostname_includes: 'embed.tawk.to' }],
  },
  {
    id: 'livechat',
    name: 'LiveChat',
    category: 'chat',
    signals: [
      { kind: 'host', hostname_includes: 'cdn.livechatinc.com' },
      { kind: 'host', hostname_includes: 'livechatinc.com' },
    ],
  },
  {
    id: 'crisp',
    name: 'Crisp',
    category: 'chat',
    signals: [{ kind: 'host', hostname_includes: 'client.crisp.chat' }],
  },
  {
    id: 'hubspot_chat',
    name: 'HubSpot Chat',
    category: 'chat',
    cross_link: 'hubspot',
    signals: [{ kind: 'script', src_includes: 'js.usemessages.com' }],
  },
]

const EMAIL: Detector[] = [
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'email',
    signals: [
      { kind: 'host', hostname_includes: 'chimpstatic.com' },
      { kind: 'host', hostname_includes: 'list-manage.com' },
      { kind: 'host', hostname_includes: 'mailchimp.com' },
      { kind: 'script', src_includes: 'mc.us' },
    ],
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    category: 'email',
    signals: [
      { kind: 'host', hostname_includes: 'static.klaviyo.com' },
      { kind: 'host', hostname_includes: 'klaviyo.com' },
    ],
  },
  {
    id: 'convertkit',
    name: 'ConvertKit',
    category: 'email',
    signals: [
      { kind: 'host', hostname_includes: 'f.convertkit.com' },
      { kind: 'host', hostname_includes: 'convertkit.com' },
    ],
  },
  {
    id: 'customerio',
    name: 'Customer.io',
    category: 'email',
    signals: [{ kind: 'host', hostname_includes: 'assets.customer.io' }],
  },
  {
    id: 'brevo',
    name: 'Brevo (Sendinblue)',
    category: 'email',
    signals: [
      { kind: 'host', hostname_includes: 'sibautomation.com' },
      { kind: 'host', hostname_includes: 'sib-cdn.com' },
      { kind: 'host', hostname_includes: 'brevo.com' },
    ],
  },
  {
    id: 'beehiiv',
    name: 'beehiiv',
    category: 'email',
    signals: [
      { kind: 'host', hostname_includes: 'beehiiv.com' },
      { kind: 'iframe', src_includes: 'beehiiv.com/embed' },
    ],
  },
]

const PAYMENTS: Detector[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    signals: [
      { kind: 'host', hostname_includes: 'js.stripe.com' },
      { kind: 'script', src_includes: 'js.stripe.com' },
    ],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    category: 'payments',
    signals: [
      { kind: 'host', hostname_includes: 'paypal.com/sdk/js' },
      { kind: 'host', hostname_includes: 'paypalobjects.com' },
    ],
  },
  {
    id: 'square',
    name: 'Square',
    category: 'payments',
    signals: [
      { kind: 'host', hostname_includes: 'web.squarecdn.com' },
      { kind: 'host', hostname_includes: 'squareup.com' },
    ],
  },
  {
    id: 'shopify_payments',
    name: 'Shopify Payments',
    category: 'payments',
    requires: ['shopify'],
    signals: [
      { kind: 'host', hostname_includes: 'shop.app' },
      { kind: 'html', source_includes: 'shopify_payments' },
    ],
  },
]

const SECURITY: Detector[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    category: 'security',
    signals: [
      { kind: 'header', name: 'cf-ray' },
      { kind: 'header', name: 'server', match: /cloudflare/i },
      { kind: 'host', hostname_includes: 'cdnjs.cloudflare.com' },
    ],
  },
  {
    id: 'recaptcha',
    name: 'reCAPTCHA',
    category: 'security',
    signals: [
      { kind: 'host', hostname_includes: 'google.com/recaptcha' },
      { kind: 'host', hostname_includes: 'gstatic.com/recaptcha' },
    ],
  },
  {
    id: 'hcaptcha',
    name: 'hCaptcha',
    category: 'security',
    signals: [
      { kind: 'host', hostname_includes: 'hcaptcha.com' },
      { kind: 'host', hostname_includes: 'js.hcaptcha.com' },
    ],
  },
  {
    id: 'cookiebot',
    name: 'Cookiebot',
    category: 'security',
    signals: [{ kind: 'host', hostname_includes: 'consent.cookiebot.com' }],
  },
  {
    id: 'onetrust',
    name: 'OneTrust',
    category: 'security',
    signals: [
      { kind: 'host', hostname_includes: 'cdn.cookielaw.org' },
      { kind: 'host', hostname_includes: 'onetrust.com' },
    ],
  },
]

export const ALL_DETECTORS: Detector[] = [
  ...PLATFORM,
  ...CRM,
  ...ANALYTICS,
  ...CHAT,
  ...EMAIL,
  ...PAYMENTS,
  ...SECURITY,
]

// ─────────────────────────────────────────────────────────────
// Page extraction (regex over fetched HTML — no JSDOM dependency)
// ─────────────────────────────────────────────────────────────

interface PageContext {
  html: string
  scripts: string[] // src URLs
  iframes: string[] // src URLs
  hosts: Set<string> // hostnames from script + iframe srcs
  metas: Map<string, string> // name → content
  htmlAttrs: Record<string, string> // attributes on <html>
  headers: Record<string, string> // response headers (lower-case keys)
  generator?: string
}

const SCRIPT_RE = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi
const IFRAME_RE = /<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi
const META_RE = /<meta\b[^>]*\bname\s*=\s*["']([^"']+)["'][^>]*\bcontent\s*=\s*["']([^"']*)["'][^>]*>/gi
const META_RE_REVERSE = /<meta\b[^>]*\bcontent\s*=\s*["']([^"']*)["'][^>]*\bname\s*=\s*["']([^"']+)["'][^>]*>/gi
const HTML_TAG_RE = /<html\b([^>]*)>/i
const ATTR_RE = /([a-zA-Z][\w:-]*)\s*=\s*["']([^"']*)["']/g

function extractContext(html: string, baseHost: string, headers: Record<string, string>): PageContext {
  const scripts: string[] = []
  const iframes: string[] = []
  const hosts = new Set<string>()
  const metas = new Map<string, string>()

  // baseHost itself is a host
  hosts.add(baseHost)

  let m: RegExpExecArray | null
  while ((m = SCRIPT_RE.exec(html))) {
    const src = m[1]
    scripts.push(src)
    const h = hostFromSrc(src, baseHost)
    if (h) hosts.add(h)
  }
  while ((m = IFRAME_RE.exec(html))) {
    const src = m[1]
    iframes.push(src)
    const h = hostFromSrc(src, baseHost)
    if (h) hosts.add(h)
  }
  while ((m = META_RE.exec(html))) {
    metas.set(m[1].toLowerCase(), m[2])
  }
  while ((m = META_RE_REVERSE.exec(html))) {
    if (!metas.has(m[2].toLowerCase())) metas.set(m[2].toLowerCase(), m[1])
  }

  // Parse <html> attributes
  const htmlAttrs: Record<string, string> = {}
  const htmlMatch = html.match(HTML_TAG_RE)
  if (htmlMatch) {
    let am: RegExpExecArray | null
    const attrText = htmlMatch[1]
    const attrRe = new RegExp(ATTR_RE.source, 'g')
    while ((am = attrRe.exec(attrText))) {
      htmlAttrs[am[1].toLowerCase()] = am[2]
    }
  }

  return {
    html,
    scripts,
    iframes,
    hosts,
    metas,
    htmlAttrs,
    headers,
    generator: metas.get('generator'),
  }
}

function hostFromSrc(src: string, baseHost: string): string | null {
  try {
    const url = src.startsWith('//')
      ? new URL('https:' + src)
      : src.startsWith('http')
        ? new URL(src)
        : new URL(src, `https://${baseHost}`)
    return url.hostname.toLowerCase()
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// Signal evaluators
// ─────────────────────────────────────────────────────────────

function matchVal(haystack: string, match: string | RegExp | undefined, namePart: string): boolean {
  if (!match) return true
  if (match instanceof RegExp) return match.test(haystack)
  return haystack.toLowerCase().includes(String(match).toLowerCase())
}

function evalSignal(
  sig: Signal,
  ctx: PageContext,
): { kind: string; detail: string } | null {
  switch (sig.kind) {
    case 'meta': {
      const v = ctx.metas.get(sig.name.toLowerCase())
      if (v == null) return null
      if (matchVal(v, sig.match, sig.name)) {
        return { kind: 'meta', detail: `${sig.name}=${v.slice(0, 80)}` }
      }
      return null
    }
    case 'script': {
      for (const s of ctx.scripts) {
        if (s.includes(sig.src_includes)) return { kind: 'script', detail: s.slice(0, 100) }
      }
      return null
    }
    case 'iframe': {
      for (const f of ctx.iframes) {
        if (f.includes(sig.src_includes)) return { kind: 'iframe', detail: f.slice(0, 100) }
      }
      return null
    }
    case 'html': {
      if (sig.source_includes && ctx.html.includes(sig.source_includes)) {
        return { kind: 'html', detail: sig.source_includes }
      }
      if (sig.source_match) {
        const m = ctx.html.match(sig.source_match)
        if (m) return { kind: 'html', detail: m[0].slice(0, 80) }
      }
      return null
    }
    case 'attr': {
      if (sig.selector === 'html' && ctx.htmlAttrs[sig.attr.toLowerCase()] != null) {
        return { kind: 'attr', detail: `html[${sig.attr}]` }
      }
      return null
    }
    case 'host': {
      for (const h of ctx.hosts) {
        if (h.includes(sig.hostname_includes)) return { kind: 'host', detail: h }
      }
      return null
    }
    case 'header': {
      const v = ctx.headers[sig.name.toLowerCase()]
      if (v == null) return null
      if (matchVal(v, sig.match, sig.name)) {
        return { kind: 'header', detail: `${sig.name}=${v.slice(0, 80)}` }
      }
      return null
    }
    case 'cookie':
    case 'global':
      // Browser-only signals — skip server-side
      return null
  }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export interface ScanHit {
  id: string
  name: string
  category: Category
  evidence: Array<{ kind: string; detail: string }>
}

export interface ScanResult {
  hits: ScanHit[]
  by_category: Record<Category, ScanHit[]>
}

export function runDetectorsOnHtml(
  html: string,
  hostname: string,
  headers: Record<string, string> = {},
): ScanResult {
  const lowerHeaders: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) lowerHeaders[k.toLowerCase()] = v

  const ctx = extractContext(html, hostname.toLowerCase(), lowerHeaders)
  const hits: ScanHit[] = []

  for (const det of ALL_DETECTORS) {
    if (det.fallback) continue
    const evidence: Array<{ kind: string; detail: string }> = []
    for (const sig of det.signals) {
      const r = evalSignal(sig, ctx)
      if (r) evidence.push(r)
    }
    if (evidence.length > 0) {
      hits.push({ id: det.id, name: det.name, category: det.category, evidence })
    }
  }

  const by_category = {
    platform: [],
    crm: [],
    analytics: [],
    chat: [],
    email: [],
    payments: [],
    security: [],
  } as Record<Category, ScanHit[]>
  for (const h of hits) by_category[h.category].push(h)

  if (by_category.platform.length === 0) {
    const custom = ALL_DETECTORS.find((d) => d.id === 'custom')
    if (custom) {
      const customHit: ScanHit = {
        id: custom.id,
        name: custom.name,
        category: custom.category,
        evidence: [],
      }
      hits.push(customHit)
      by_category.platform.push(customHit)
    }
  }

  return { hits, by_category }
}

// ─────────────────────────────────────────────────────────────
// Fetch + scan a single URL
// ─────────────────────────────────────────────────────────────

export interface UrlScanResult {
  ok: boolean
  url: string
  hostname: string
  status?: number
  result?: ScanResult
  error?: string
  fetched_bytes?: number
  elapsed_ms: number
}

const FETCH_TIMEOUT_MS = 12_000
const MAX_BYTES = 600_000 // cap response body to avoid runaway pages

export async function scanUrl(rawUrl: string): Promise<UrlScanResult> {
  const start = Date.now()
  let url: URL
  try {
    url = new URL(rawUrl.trim().match(/^https?:\/\//) ? rawUrl.trim() : `https://${rawUrl.trim()}`)
  } catch {
    return {
      ok: false,
      url: rawUrl,
      hostname: '',
      error: 'invalid_url',
      elapsed_ms: Date.now() - start,
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; 0nCore-Scanner/1.0; +https://0ncore.com/scanner)',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v
    })

    let html = ''
    let bytes = 0
    if (res.body) {
      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8', { fatal: false })
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        html += decoder.decode(value, { stream: true })
        if (bytes >= MAX_BYTES) {
          try {
            await reader.cancel()
          } catch {
            // ignore
          }
          break
        }
      }
      html += decoder.decode()
    } else {
      html = await res.text()
      bytes = html.length
    }

    const result = runDetectorsOnHtml(html, url.hostname, headers)
    return {
      ok: true,
      url: url.toString(),
      hostname: url.hostname,
      status: res.status,
      result,
      fetched_bytes: bytes,
      elapsed_ms: Date.now() - start,
    }
  } catch (e) {
    const err = e as Error
    return {
      ok: false,
      url: url.toString(),
      hostname: url.hostname,
      error: err.name === 'AbortError' ? 'timeout' : err.message || 'fetch_failed',
      elapsed_ms: Date.now() - start,
    }
  } finally {
    clearTimeout(timer)
  }
}
