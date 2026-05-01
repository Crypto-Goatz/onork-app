/**
 * CRM + Marketing Stack scanner.
 *
 * Inspects HTML, response headers, and third-party script loaders to identify
 * every CRM, email tool, analytics platform, chat widget, ad pixel, booking
 * app, payment processor, support desk, and form builder on the page.
 *
 * Detection signals (in order of confidence):
 *   1. Direct <script src> matches against known CDN domains
 *   2. <link>, <iframe>, <img> sources with known patterns
 *   3. Inline <script> content matches (window.intercom, _hsq, dataLayer push)
 *   4. <meta> generator tags
 *   5. HTTP response headers (server, x-powered-by)
 *   6. Cookie names set on the response
 *   7. Known DOM IDs / class prefixes
 *
 * Each signal has a confidence weight; multiple signals on the same vendor
 * collapse into one detection with the highest confidence.
 */

import type { ScanInput, ScanOutput } from './types'

interface VendorSignal {
  /** Pattern matched. */
  pattern: string
  /** Where we found it. */
  location: 'script' | 'link' | 'iframe' | 'meta' | 'header' | 'cookie' | 'inline' | 'dom'
  /** 0-100 confidence this signal contributes. */
  confidence: number
}

interface VendorDetection {
  vendor: string
  category: VendorCategory
  /** Highest confidence across all signals. */
  confidence: number
  /** Every signal that fired for this vendor. */
  signals: VendorSignal[]
  /** Optional sub-product if detected (e.g. HubSpot Marketing Hub vs. CRM Hub). */
  product?: string
  /** Vendor URL for the operator to reference. */
  homepage?: string
}

export type VendorCategory =
  | 'crm'
  | 'email_marketing'
  | 'marketing_automation'
  | 'analytics'
  | 'tag_manager'
  | 'ad_pixel'
  | 'live_chat'
  | 'support_desk'
  | 'booking'
  | 'payments'
  | 'forms'
  | 'reviews'
  | 'a_b_testing'
  | 'session_replay'
  | 'consent_mgmt'
  | 'cdn'
  | 'cms'
  | 'ecommerce'
  | 'unknown'

export interface CrmStackResult {
  total_vendors: number
  by_category: Record<string, number>
  vendors: VendorDetection[]
  /** True if at least one CRM/marketing-automation tool was detected. */
  has_crm: boolean
  /** True if at least one analytics tool was detected. */
  has_analytics: boolean
  /** True if at least one tag manager was detected. */
  has_tag_manager: boolean
  /** Highlighted gaps the operator can sell against. */
  gaps: string[]
  /** Headline takeaway for the dashboard list view. */
  takeaway: string
}

// ━━━ Vendor signature catalogue ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface VendorSignature {
  vendor: string
  category: VendorCategory
  homepage?: string
  product?: string
  /** Patterns to match against script src + link href + iframe src — case-insensitive substring. */
  src_patterns?: string[]
  /** Patterns to match against inline script bodies. */
  inline_patterns?: string[]
  /** Cookie names that uniquely identify this vendor when set on the page. */
  cookies?: string[]
  /** HTTP header names (lowercased) whose presence/value identifies the vendor. */
  headers?: Array<{ name: string; valueIncludes?: string }>
  /** Meta `name=generator` content matches. */
  generators?: string[]
  /** DOM ID or class prefixes that identify the vendor. */
  dom?: string[]
}

const SIGNATURES: VendorSignature[] = [
  // ━━━ CRM / MARKETING AUTOMATION ━━━
  { vendor: 'HubSpot',     category: 'marketing_automation', homepage: 'hubspot.com',
    src_patterns: ['js.hs-scripts.com', 'js.hs-banner.com', 'js.hs-analytics.net', 'forms.hsforms.com', 'static.hsappstatic.net'],
    inline_patterns: ['_hsq', '_hsp', 'hsConversationsSettings'],
    cookies: ['hubspotutk', '__hssc', '__hssrc', '__hstc'] },
  { vendor: 'Salesforce',  category: 'crm', homepage: 'salesforce.com',
    src_patterns: ['salesforce.com', 'force.com', 'pardot.com'],
    inline_patterns: ['piTracker', 'pi_pardotAccountId'] },
  { vendor: 'Marketo',     category: 'marketing_automation', homepage: 'marketo.com',
    src_patterns: ['mktoresp.com', 'mktoutility.com', 'mktoweb.com'],
    inline_patterns: ['Munchkin.init'] },
  { vendor: 'ActiveCampaign', category: 'marketing_automation', homepage: 'activecampaign.com',
    src_patterns: ['trackcmp.net', 'activehosted.com'],
    inline_patterns: ['vgo(', 'visitorGlobalObjectAlias'] },
  { vendor: 'Mailchimp',   category: 'email_marketing', homepage: 'mailchimp.com',
    src_patterns: ['list-manage.com', 'chimpstatic.com', 'mc.us'],
    inline_patterns: ['mc4wp', 'mailchimp'] },
  { vendor: 'Klaviyo',     category: 'email_marketing', homepage: 'klaviyo.com',
    src_patterns: ['static.klaviyo.com', 'a.klaviyo.com'],
    inline_patterns: ['_learnq', 'klaviyo.identify'] },
  { vendor: 'ConvertKit',  category: 'email_marketing', homepage: 'convertkit.com',
    src_patterns: ['convertkit.com', 'ck-assets.com', 'ckcdn.com'] },
  { vendor: 'Drip',        category: 'email_marketing', homepage: 'getdrip.com',
    src_patterns: ['getdrip.com', 'tag.getdrip.com'] },
  { vendor: 'Constant Contact', category: 'email_marketing', homepage: 'constantcontact.com',
    src_patterns: ['constantcontact.com'] },
  { vendor: 'Brevo (Sendinblue)', category: 'email_marketing', homepage: 'brevo.com',
    src_patterns: ['sibforms.com', 'sendinblue.com', 'brevo.com'] },
  { vendor: 'Pipedrive',   category: 'crm', homepage: 'pipedrive.com',
    src_patterns: ['pipedrive.com', 'pipedriveassets.com'],
    cookies: ['pipe-session-token'] },
  { vendor: 'Zoho',        category: 'crm', homepage: 'zoho.com',
    src_patterns: ['zoho.com', 'zohopublic.com'] },
  { vendor: 'LeadConnector / CRM', category: 'crm', homepage: 'leadconnectorhq.com',
    src_patterns: ['widgets.leadconnectorhq.com', 'msgsndr.com', 'leadconnectorhq.com'],
    inline_patterns: ['lc-widget', 'leadconnector'] },
  { vendor: 'Keap (Infusionsoft)', category: 'crm', homepage: 'keap.com',
    src_patterns: ['infusionsoft.com', 'keap.com'] },

  // ━━━ ANALYTICS ━━━
  { vendor: 'Google Analytics 4', category: 'analytics', homepage: 'analytics.google.com',
    src_patterns: ['googletagmanager.com/gtag/js', 'google-analytics.com/g/collect'],
    inline_patterns: ['gtag(', 'G-'] },
  { vendor: 'Google Tag Manager', category: 'tag_manager', homepage: 'tagmanager.google.com',
    src_patterns: ['googletagmanager.com/gtm.js'],
    inline_patterns: ['dataLayer', 'GTM-'] },
  { vendor: 'Plausible',   category: 'analytics', homepage: 'plausible.io',
    src_patterns: ['plausible.io/js'] },
  { vendor: 'Fathom',      category: 'analytics', homepage: 'usefathom.com',
    src_patterns: ['cdn.usefathom.com'] },
  { vendor: 'Mixpanel',    category: 'analytics', homepage: 'mixpanel.com',
    src_patterns: ['cdn.mxpnl.com'],
    inline_patterns: ['mixpanel.init'] },
  { vendor: 'Amplitude',   category: 'analytics', homepage: 'amplitude.com',
    src_patterns: ['amplitude.com', 'cdn.amplitude.com'],
    inline_patterns: ['amplitude.getInstance'] },
  { vendor: 'Heap',        category: 'analytics', homepage: 'heap.io',
    src_patterns: ['cdn.heapanalytics.com', 'heapanalytics.com'],
    inline_patterns: ['heap.load', 'heap.identify'] },
  { vendor: 'Microsoft Clarity', category: 'session_replay', homepage: 'clarity.microsoft.com',
    src_patterns: ['clarity.ms'] },
  { vendor: 'Hotjar',      category: 'session_replay', homepage: 'hotjar.com',
    src_patterns: ['static.hotjar.com', 'script.hotjar.com'],
    inline_patterns: ['hjid:', '_hjSettings'] },
  { vendor: 'FullStory',   category: 'session_replay', homepage: 'fullstory.com',
    src_patterns: ['edge.fullstory.com', 'fullstory.com/s/fs.js'] },
  { vendor: 'LogRocket',   category: 'session_replay', homepage: 'logrocket.com',
    src_patterns: ['cdn.lr-ingest.io', 'cdn.logrocket.io'] },

  // ━━━ AD PIXELS ━━━
  { vendor: 'Meta Pixel (Facebook)', category: 'ad_pixel', homepage: 'business.facebook.com',
    src_patterns: ['connect.facebook.net/en_US/fbevents.js'],
    inline_patterns: ['fbq(', '_fbp'],
    cookies: ['_fbp', '_fbc'] },
  { vendor: 'Google Ads',  category: 'ad_pixel', homepage: 'ads.google.com',
    src_patterns: ['googleadservices.com', 'googletagmanager.com/gtag/js?id=AW-'],
    inline_patterns: ['AW-'] },
  { vendor: 'TikTok Pixel', category: 'ad_pixel', homepage: 'ads.tiktok.com',
    src_patterns: ['analytics.tiktok.com'],
    inline_patterns: ['ttq.load', 'ttq.identify'] },
  { vendor: 'LinkedIn Insight Tag', category: 'ad_pixel', homepage: 'business.linkedin.com',
    src_patterns: ['snap.licdn.com/li.lms-analytics'],
    inline_patterns: ['_linkedin_partner_id', 'lintrk('] },
  { vendor: 'X (Twitter) Ads Pixel', category: 'ad_pixel', homepage: 'ads.x.com',
    src_patterns: ['static.ads-twitter.com/uwt.js'],
    inline_patterns: ['twq('] },
  { vendor: 'Pinterest Tag', category: 'ad_pixel', homepage: 'ads.pinterest.com',
    src_patterns: ['s.pinimg.com/ct/core.js'],
    inline_patterns: ['pintrk('] },
  { vendor: 'Reddit Pixel', category: 'ad_pixel', homepage: 'ads.reddit.com',
    src_patterns: ['www.redditstatic.com/ads/pixel.js'],
    inline_patterns: ['rdt('] },

  // ━━━ LIVE CHAT ━━━
  { vendor: 'Intercom',    category: 'live_chat', homepage: 'intercom.com',
    src_patterns: ['widget.intercom.io', 'js.intercomcdn.com'],
    inline_patterns: ['Intercom(', 'window.intercomSettings'] },
  { vendor: 'Drift',       category: 'live_chat', homepage: 'drift.com',
    src_patterns: ['js.driftt.com'] },
  { vendor: 'Tidio',       category: 'live_chat', homepage: 'tidio.com',
    src_patterns: ['code.tidio.co'] },
  { vendor: 'Crisp',       category: 'live_chat', homepage: 'crisp.chat',
    src_patterns: ['client.crisp.chat'],
    inline_patterns: ['$crisp'] },
  { vendor: 'Tawk.to',     category: 'live_chat', homepage: 'tawk.to',
    src_patterns: ['embed.tawk.to'] },
  { vendor: 'Olark',       category: 'live_chat', homepage: 'olark.com',
    src_patterns: ['static.olark.com', 'olark.com'] },
  { vendor: 'LiveChat',    category: 'live_chat', homepage: 'livechat.com',
    src_patterns: ['cdn.livechatinc.com'] },
  { vendor: 'Zendesk Chat', category: 'live_chat', homepage: 'zendesk.com',
    src_patterns: ['static.zdassets.com', 'v2.zopim.com'] },

  // ━━━ SUPPORT DESK ━━━
  { vendor: 'Zendesk',     category: 'support_desk', homepage: 'zendesk.com',
    src_patterns: ['zendesk.com', 'zdassets.com'] },
  { vendor: 'Freshdesk / Freshchat', category: 'support_desk', homepage: 'freshworks.com',
    src_patterns: ['wchat.freshchat.com', 'freshdesk.com'] },
  { vendor: 'Help Scout',  category: 'support_desk', homepage: 'helpscout.com',
    src_patterns: ['beacon-v2.helpscout.net'] },

  // ━━━ BOOKING ━━━
  { vendor: 'Calendly',    category: 'booking', homepage: 'calendly.com',
    src_patterns: ['assets.calendly.com', 'calendly.com'] },
  { vendor: 'Cal.com',     category: 'booking', homepage: 'cal.com',
    src_patterns: ['cal.com/embed', 'app.cal.com'] },
  { vendor: 'Acuity',      category: 'booking', homepage: 'acuityscheduling.com',
    src_patterns: ['acuityscheduling.com'] },
  { vendor: 'SavvyCal',    category: 'booking', homepage: 'savvycal.com',
    src_patterns: ['embed.savvycal.com'] },

  // ━━━ PAYMENTS ━━━
  { vendor: 'Stripe',      category: 'payments', homepage: 'stripe.com',
    src_patterns: ['js.stripe.com', 'm.stripe.network'],
    inline_patterns: ['Stripe('] },
  { vendor: 'PayPal',      category: 'payments', homepage: 'paypal.com',
    src_patterns: ['paypalobjects.com', 'paypal.com/sdk'] },
  { vendor: 'Square',      category: 'payments', homepage: 'squareup.com',
    src_patterns: ['squareup.com', 'js.squareup.com'] },
  { vendor: 'Shopify Payments', category: 'payments', homepage: 'shopify.com',
    src_patterns: ['cdn.shopify.com'] },

  // ━━━ FORMS ━━━
  { vendor: 'Typeform',    category: 'forms', homepage: 'typeform.com',
    src_patterns: ['embed.typeform.com', 'typeform.com'] },
  { vendor: 'JotForm',     category: 'forms', homepage: 'jotform.com',
    src_patterns: ['form.jotform.com', 'cdn.jotfor.ms'] },
  { vendor: 'Gravity Forms', category: 'forms', homepage: 'gravityforms.com',
    inline_patterns: ['gform_', 'gravityforms'] },
  { vendor: 'WPForms',     category: 'forms', homepage: 'wpforms.com',
    inline_patterns: ['wpforms-', 'wpforms.com'] },
  { vendor: 'Formstack',   category: 'forms', homepage: 'formstack.com',
    src_patterns: ['formstack.com'] },

  // ━━━ REVIEWS ━━━
  { vendor: 'Trustpilot',  category: 'reviews', homepage: 'trustpilot.com',
    src_patterns: ['widget.trustpilot.com'] },
  { vendor: 'Yotpo',       category: 'reviews', homepage: 'yotpo.com',
    src_patterns: ['staticw2.yotpo.com', 'cdn-loyalty.yotpo.com'] },
  { vendor: 'Birdeye',     category: 'reviews', homepage: 'birdeye.com',
    src_patterns: ['birdeye.com'] },

  // ━━━ A/B TESTING ━━━
  { vendor: 'Optimizely',  category: 'a_b_testing', homepage: 'optimizely.com',
    src_patterns: ['cdn.optimizely.com'] },
  { vendor: 'VWO',         category: 'a_b_testing', homepage: 'vwo.com',
    src_patterns: ['dev.visualwebsiteoptimizer.com', 'dev.vwo.com'] },
  { vendor: 'Google Optimize', category: 'a_b_testing', homepage: 'optimize.google.com',
    src_patterns: ['googleoptimize.com'] },

  // ━━━ CONSENT MANAGEMENT ━━━
  { vendor: 'OneTrust',    category: 'consent_mgmt', homepage: 'onetrust.com',
    src_patterns: ['cdn.cookielaw.org', 'cdn.onetrust.com'] },
  { vendor: 'Cookiebot',   category: 'consent_mgmt', homepage: 'cookiebot.com',
    src_patterns: ['consent.cookiebot.com', 'cookiebot.com'] },
  { vendor: 'Termly',      category: 'consent_mgmt', homepage: 'termly.io',
    src_patterns: ['app.termly.io'] },

  // ━━━ CMS / ECOMMERCE ━━━
  { vendor: 'WordPress',   category: 'cms', homepage: 'wordpress.org',
    generators: ['WordPress'],
    headers: [{ name: 'x-powered-by', valueIncludes: 'WP Engine' }] },
  { vendor: 'Shopify',     category: 'ecommerce', homepage: 'shopify.com',
    src_patterns: ['cdn.shopify.com', 'shopify.com'],
    headers: [{ name: 'x-shopify-stage' }, { name: 'x-shopid' }] },
  { vendor: 'Webflow',     category: 'cms', homepage: 'webflow.com',
    src_patterns: ['assets.website-files.com', 'webflow.com'],
    generators: ['Webflow'] },
  { vendor: 'Squarespace', category: 'cms', homepage: 'squarespace.com',
    src_patterns: ['static1.squarespace.com', 'squarespace.com'],
    generators: ['Squarespace'] },
  { vendor: 'Wix',         category: 'cms', homepage: 'wix.com',
    src_patterns: ['static.wixstatic.com', 'wix.com'],
    generators: ['Wix.com Website Builder'] },
  { vendor: 'BigCommerce', category: 'ecommerce', homepage: 'bigcommerce.com',
    src_patterns: ['cdn11.bigcommerce.com', 'bigcommerce.com'] },

  // ━━━ CDN ━━━
  { vendor: 'Cloudflare',  category: 'cdn', homepage: 'cloudflare.com',
    headers: [{ name: 'server', valueIncludes: 'cloudflare' }, { name: 'cf-ray' }] },
  { vendor: 'Vercel',      category: 'cdn', homepage: 'vercel.com',
    headers: [{ name: 'server', valueIncludes: 'Vercel' }, { name: 'x-vercel-id' }] },
  { vendor: 'Netlify',     category: 'cdn', homepage: 'netlify.com',
    headers: [{ name: 'server', valueIncludes: 'Netlify' }] },
  { vendor: 'WP Engine',   category: 'cdn', homepage: 'wpengine.com',
    headers: [{ name: 'x-powered-by', valueIncludes: 'WP Engine' }] },
]

// ━━━ Runner ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function runCrmStackScan(input: ScanInput): Promise<ScanOutput<CrmStackResult>> {
  const t0 = Date.now()

  let html = input.html
  let headers = input.headers
  if (!html || !headers) {
    try {
      const fetchRes = await fetch(input.url, {
        redirect: 'follow',
        headers: {
          // Some sites cloak CMS metadata from non-browser UAs.
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })
      if (!html) html = await fetchRes.text()
      if (!headers) {
        const h: Record<string, string> = {}
        fetchRes.headers.forEach((v, k) => {
          h[k.toLowerCase()] = v
        })
        headers = h
      }
    } catch (err) {
      return {
        scanner: 'crm_stack',
        ok: false,
        duration_ms: Date.now() - t0,
        error: err instanceof Error ? err.message : 'fetch failed',
      }
    }
  }

  const detections = new Map<string, VendorDetection>()
  const recordSignal = (sig: VendorSignature, signal: VendorSignal) => {
    const existing = detections.get(sig.vendor)
    if (existing) {
      existing.signals.push(signal)
      existing.confidence = Math.max(existing.confidence, signal.confidence)
    } else {
      detections.set(sig.vendor, {
        vendor: sig.vendor,
        category: sig.category,
        confidence: signal.confidence,
        signals: [signal],
        product: sig.product,
        homepage: sig.homepage,
      })
    }
  }

  const lowerHtml = html.toLowerCase()

  // ── Script / link / iframe src patterns
  const srcRegex = /<(?:script|link|iframe|img)[^>]+(?:src|href)=["']([^"']+)["'][^>]*>/gi
  const externalSrcs: string[] = []
  let m: RegExpExecArray | null
  while ((m = srcRegex.exec(html)) !== null) {
    externalSrcs.push(m[1])
  }
  const lowerSrcs = externalSrcs.map((s) => s.toLowerCase())

  for (const sig of SIGNATURES) {
    if (sig.src_patterns) {
      for (const pat of sig.src_patterns) {
        const lp = pat.toLowerCase()
        const found = lowerSrcs.find((s) => s.includes(lp))
        if (found) {
          recordSignal(sig, { pattern: pat, location: 'script', confidence: 95 })
          break
        }
      }
    }
  }

  // ── Inline script content patterns
  const inlineScriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi
  let inlineHaystack = ''
  let scriptMatch: RegExpExecArray | null
  while ((scriptMatch = inlineScriptRegex.exec(html)) !== null) {
    inlineHaystack += '\n' + scriptMatch[1]
  }
  const lowerInline = inlineHaystack.toLowerCase()

  for (const sig of SIGNATURES) {
    if (sig.inline_patterns) {
      for (const pat of sig.inline_patterns) {
        if (lowerInline.includes(pat.toLowerCase())) {
          recordSignal(sig, { pattern: pat, location: 'inline', confidence: 80 })
          break
        }
      }
    }
  }

  // ── Meta generator
  const generatorMatch = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i.exec(html)
  const generator = generatorMatch?.[1] ?? ''
  if (generator) {
    for (const sig of SIGNATURES) {
      if (sig.generators) {
        for (const g of sig.generators) {
          if (generator.toLowerCase().includes(g.toLowerCase())) {
            recordSignal(sig, { pattern: generator, location: 'meta', confidence: 90 })
            break
          }
        }
      }
    }
  }

  // ── HTTP headers
  for (const sig of SIGNATURES) {
    if (!sig.headers) continue
    for (const h of sig.headers) {
      const value = headers[h.name.toLowerCase()]
      if (!value) continue
      if (!h.valueIncludes || value.toLowerCase().includes(h.valueIncludes.toLowerCase())) {
        recordSignal(sig, { pattern: `${h.name}:${h.valueIncludes ?? '*'}`, location: 'header', confidence: 95 })
        break
      }
    }
  }

  // ── Cookies (Set-Cookie header on response)
  const setCookie = headers['set-cookie'] ?? ''
  if (setCookie) {
    const lowered = setCookie.toLowerCase()
    for (const sig of SIGNATURES) {
      if (!sig.cookies) continue
      for (const cookieName of sig.cookies) {
        if (lowered.includes(cookieName.toLowerCase() + '=')) {
          recordSignal(sig, { pattern: cookieName, location: 'cookie', confidence: 85 })
          break
        }
      }
    }
  }

  // ━━━ Aggregate ━━━
  const vendors = Array.from(detections.values()).sort((a, b) => b.confidence - a.confidence)
  const by_category: Record<string, number> = {}
  vendors.forEach((v) => {
    by_category[v.category] = (by_category[v.category] || 0) + 1
  })

  const has_crm = vendors.some(
    (v) => v.category === 'crm' || v.category === 'marketing_automation',
  )
  const has_analytics = vendors.some((v) => v.category === 'analytics')
  const has_tag_manager = vendors.some((v) => v.category === 'tag_manager')

  const gaps: string[] = []
  if (!has_crm) gaps.push('No CRM or marketing-automation tool detected — blind to lead behavior.')
  if (!has_analytics) gaps.push('No analytics platform detected — flying blind on traffic.')
  if (!has_tag_manager && (has_analytics || vendors.some((v) => v.category === 'ad_pixel')))
    gaps.push('Multiple tags/pixels but no tag manager — duplicate fires + bloated page weight likely.')
  const hasChat = vendors.some((v) => v.category === 'live_chat')
  if (!hasChat) gaps.push('No live chat or AI assistant — every visitor question goes unanswered.')
  const hasReviews = vendors.some((v) => v.category === 'reviews')
  if (!hasReviews) gaps.push('No third-party review widget — missing social proof signal.')
  const hasConsent = vendors.some((v) => v.category === 'consent_mgmt')
  const hasPixels = vendors.some((v) => v.category === 'ad_pixel')
  if (hasPixels && !hasConsent)
    gaps.push('Tracking pixels firing without a consent banner — GDPR / CCPA exposure.')

  const takeaway =
    vendors.length === 0
      ? 'No tracked tools detected — likely a static brochure site with zero analytics or CRM.'
      : `${vendors.length} tools detected across ${Object.keys(by_category).length} categories. ${
          has_crm ? 'CRM present.' : 'NO CRM present.'
        } ${has_analytics ? 'Analytics present.' : 'NO analytics.'}`

  const result: CrmStackResult = {
    total_vendors: vendors.length,
    by_category,
    vendors,
    has_crm,
    has_analytics,
    has_tag_manager,
    gaps,
    takeaway,
  }

  return {
    scanner: 'crm_stack',
    ok: true,
    duration_ms: Date.now() - t0,
    data: result,
    summary: takeaway,
    score: vendors.length === 0 ? 10 : Math.min(100, 30 + vendors.length * 8),
  }
}
