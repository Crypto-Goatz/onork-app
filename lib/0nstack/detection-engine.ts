/**
 * 0nStack Detection Engine
 * Scans domain HTML for CRM, automation, review, chat, scheduling,
 * email, payment, analytics, and ad platform signatures.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetectedTool {
  category: string
  name: string
  confidence: number // 0-100
  evidence: string[]
}

export interface DetectionResult {
  domain: string
  scannedAt: string
  status: 'success' | 'error'
  error?: string
  tools: DetectedTool[]
  hasCRM: boolean
  hasAutomation: boolean
  hasReviews: boolean
  hasChat: boolean
  hasScheduling: boolean
  hasEmail: boolean
  hasPayments: boolean
  hasAnalytics: boolean
  hasAds: boolean
  rawHTML?: string
}

// ---------------------------------------------------------------------------
// Pattern type
// ---------------------------------------------------------------------------

interface PatternDef {
  name: string
  patterns: RegExp[]
  weight: number // base confidence when matched
}

// ---------------------------------------------------------------------------
// CRM Patterns (16)
// ---------------------------------------------------------------------------

const CRM_PATTERNS: PatternDef[] = [
  {
    name: 'HubSpot',
    weight: 90,
    patterns: [
      /js\.hs-scripts\.com/i,
      /js\.hsforms\.net/i,
      /js\.hs-banner\.com/i,
      /js\.hs-analytics\.net/i,
      /hbspt\.forms\.create/i,
      /hubspot-messages-iframe/i,
      /hs-script-loader/i,
      /forms\.hubspot\.com/i,
      /track\.hubspot\.com/i,
      /api\.hubspot\.com/i,
    ],
  },
  {
    name: 'Salesforce',
    weight: 85,
    patterns: [
      /force\.com/i,
      /salesforce\.com/i,
      /sfdc\.com/i,
      /pardot\.com/i,
      /salesforceiq\.com/i,
      /lightning\.force/i,
      /visualforce\.com/i,
      /my\.salesforce/i,
      /na\d+\.salesforce/i,
      /sfdcstatic\.com/i,
    ],
  },
  {
    name: 'Rocket+',
    weight: 95,
    patterns: [
      /msgsndr\.com/i,
      /leadconnectorhq\.com/i,
      /highlevel\.com/i,
      /gohighlevel\.com/i,
      /app\.msgsndr\.com/i,
      /link\.msgsndr\.com/i,
      /rest\.gohighlevel\.com/i,
      /cdn\.msgsndr\.com/i,
      /widgets\.leadconnectorhq/i,
      /chat-widget\.msgsndr/i,
    ],
  },
  {
    name: 'ActiveCampaign',
    weight: 85,
    patterns: [
      /trackcmp\.net/i,
      /activehosted\.com/i,
      /activecampaign\.com/i,
      /img\.acuityscheduling/i,
      /ac-form/i,
      /\_acForm/i,
      /actcampaign/i,
    ],
  },
  {
    name: 'Pipedrive',
    weight: 80,
    patterns: [
      /pipedrive\.com/i,
      /pipedrivewebforms/i,
      /cdn\.pipedrive/i,
      /leadbooster-chat\.pipedrive/i,
      /app\.pipedrive/i,
    ],
  },
  {
    name: 'Zoho',
    weight: 80,
    patterns: [
      /zoho\.com/i,
      /zohocdn\.com/i,
      /salesiq\.zoho/i,
      /crm\.zoho/i,
      /zcsalesiq/i,
      /zohoSalesIQ/i,
      /zoho\.eu/i,
      /zoho\.in/i,
    ],
  },
  {
    name: 'Keap',
    weight: 85,
    patterns: [
      /keap\.com/i,
      /infusionsoft\.com/i,
      /keap\.app/i,
      /app\.infusionsoft/i,
      /is\.infusionsoft/i,
      /infusionsoft\.app/i,
    ],
  },
  {
    name: 'Copper',
    weight: 75,
    patterns: [
      /copper\.com/i,
      /prosperworks\.com/i,
      /coppercrm\.com/i,
    ],
  },
  {
    name: 'Monday',
    weight: 70,
    patterns: [
      /monday\.com\/crm/i,
      /monday\.com.*crm/i,
      /mondaycrm/i,
    ],
  },
  {
    name: 'Close',
    weight: 80,
    patterns: [
      /close\.com/i,
      /closecrm\.com/i,
      /app\.close\.com/i,
    ],
  },
  {
    name: 'Freshsales',
    weight: 78,
    patterns: [
      /freshsales\.io/i,
      /freshworks\.com/i,
      /freshsales\.com/i,
      /myfreshworks\.com/i,
    ],
  },
  {
    name: 'Dubsado',
    weight: 82,
    patterns: [
      /dubsado\.com/i,
      /app\.dubsado/i,
      /dubsado-form/i,
    ],
  },
  {
    name: 'Ontraport',
    weight: 80,
    patterns: [
      /ontraport\.com/i,
      /optinforms\.ontraport/i,
      /app\.ontraport/i,
      /ontraport\.net/i,
    ],
  },
  {
    name: 'Nimble',
    weight: 72,
    patterns: [
      /nimble\.com/i,
      /app\.nimble\.com/i,
    ],
  },
  {
    name: 'Nutshell',
    weight: 72,
    patterns: [
      /nutshell\.com/i,
      /app\.nutshell\.com/i,
    ],
  },
  {
    name: 'Capsule',
    weight: 72,
    patterns: [
      /capsulecrm\.com/i,
      /app\.capsulecrm/i,
    ],
  },
]

// ---------------------------------------------------------------------------
// Automation / Email Marketing Patterns (14)
// ---------------------------------------------------------------------------

const AUTOMATION_PATTERNS: PatternDef[] = [
  {
    name: 'Klaviyo',
    weight: 88,
    patterns: [
      /static\.klaviyo\.com/i,
      /a\.klaviyo\.com/i,
      /klaviyo\.com/i,
      /klaviyoOnsite/i,
      /\_learnq/i,
    ],
  },
  {
    name: 'Mailchimp',
    weight: 85,
    patterns: [
      /mailchimp\.com/i,
      /list-manage\.com/i,
      /mc\.us\d+\.list-manage/i,
      /chimpstatic\.com/i,
      /mailchimp-form/i,
      /cdn-images\.mailchimp/i,
    ],
  },
  {
    name: 'Drip',
    weight: 82,
    patterns: [
      /getdrip\.com/i,
      /dc\.getdrip/i,
      /d\.drip\.com/i,
      /drip-form/i,
    ],
  },
  {
    name: 'ConvertKit',
    weight: 84,
    patterns: [
      /convertkit\.com/i,
      /app\.convertkit/i,
      /forms\.convertkit/i,
      /f\.convertkit/i,
      /kit\.com/i,
    ],
  },
  {
    name: 'Brevo',
    weight: 82,
    patterns: [
      /brevo\.com/i,
      /sendinblue\.com/i,
      /sibforms\.com/i,
      /sib-form/i,
      /sibautomation/i,
    ],
  },
  {
    name: 'Omnisend',
    weight: 83,
    patterns: [
      /omnisend\.com/i,
      /omnisrc\.com/i,
      /omnisend-forms/i,
    ],
  },
  {
    name: 'Constant Contact',
    weight: 82,
    patterns: [
      /constantcontact\.com/i,
      /r20\.rs6\.net/i,
      /ctctcdn\.com/i,
      /cc\.constantcontact/i,
    ],
  },
  {
    name: 'Marketo',
    weight: 80,
    patterns: [
      /marketo\.com/i,
      /marketo\.net/i,
      /mktoresp\.com/i,
      /munchkin\.marketo/i,
      /mktoForms2/i,
    ],
  },
  {
    name: 'Pardot',
    weight: 80,
    patterns: [
      /pardot\.com/i,
      /pi\.pardot\.com/i,
      /go\.pardot/i,
      /pardot-form/i,
    ],
  },
  {
    name: 'AWeber',
    weight: 78,
    patterns: [
      /aweber\.com/i,
      /forms\.aweber/i,
      /aweber-web-form/i,
    ],
  },
  {
    name: 'GetResponse',
    weight: 78,
    patterns: [
      /getresponse\.com/i,
      /gr-form/i,
      /app\.getresponse/i,
    ],
  },
  {
    name: 'Campaign Monitor',
    weight: 76,
    patterns: [
      /campaignmonitor\.com/i,
      /createsend\.com/i,
      /createsend1\.com/i,
    ],
  },
  {
    name: 'Intercom',
    weight: 85,
    patterns: [
      /intercom\.io/i,
      /intercomcdn\.com/i,
      /widget\.intercom\.io/i,
      /intercom-frame/i,
      /intercom-container/i,
    ],
  },
  {
    name: 'MailerLite',
    weight: 80,
    patterns: [
      /mailerlite\.com/i,
      /ml\.accurelist/i,
      /static\.mailerlite/i,
      /assets\.mailerlite/i,
    ],
  },
]

// ---------------------------------------------------------------------------
// Review Platform Patterns (14)
// ---------------------------------------------------------------------------

const REVIEW_PATTERNS: PatternDef[] = [
  {
    name: 'Birdeye',
    weight: 85,
    patterns: [
      /birdeye\.com/i,
      /bfrnt\.com/i,
      /birdeye-widget/i,
    ],
  },
  {
    name: 'Podium',
    weight: 85,
    patterns: [
      /podium\.com/i,
      /connect\.podium/i,
      /webchat\.podium/i,
    ],
  },
  {
    name: 'Grade.us',
    weight: 78,
    patterns: [
      /grade\.us/i,
      /gradeus-widget/i,
    ],
  },
  {
    name: 'NiceJob',
    weight: 80,
    patterns: [
      /nicejob\.co/i,
      /widget\.nicejob/i,
    ],
  },
  {
    name: 'Trustpilot',
    weight: 88,
    patterns: [
      /trustpilot\.com/i,
      /widget\.trustpilot/i,
      /tp-widget/i,
      /trustpilot-widget/i,
    ],
  },
  {
    name: 'Yotpo',
    weight: 84,
    patterns: [
      /yotpo\.com/i,
      /staticw2\.yotpo/i,
      /yotpo-widget/i,
    ],
  },
  {
    name: 'Stamped',
    weight: 80,
    patterns: [
      /stamped\.io/i,
      /cdn-stamped-io/i,
    ],
  },
  {
    name: 'Reviews.io',
    weight: 80,
    patterns: [
      /reviews\.io/i,
      /widget\.reviews\.io/i,
    ],
  },
  {
    name: 'Widewail',
    weight: 76,
    patterns: [
      /widewail\.com/i,
      /widget\.widewail/i,
    ],
  },
  {
    name: 'Reputation.com',
    weight: 78,
    patterns: [
      /reputation\.com/i,
      /widget\.reputation/i,
    ],
  },
  {
    name: 'Swell',
    weight: 75,
    patterns: [
      /swellcx\.com/i,
      /app\.swellcx/i,
    ],
  },
  {
    name: 'ReviewTrackers',
    weight: 77,
    patterns: [
      /reviewtrackers\.com/i,
      /app\.reviewtrackers/i,
    ],
  },
  {
    name: 'Vendasta',
    weight: 78,
    patterns: [
      /vendasta\.com/i,
      /reputation\.vendasta/i,
      /vendasta-widget/i,
    ],
  },
  {
    name: 'BrightLocal',
    weight: 76,
    patterns: [
      /brightlocal\.com/i,
      /widget\.brightlocal/i,
    ],
  },
]

// ---------------------------------------------------------------------------
// Chat Patterns (10)
// ---------------------------------------------------------------------------

const CHAT_PATTERNS: PatternDef[] = [
  {
    name: 'Drift',
    weight: 85,
    patterns: [
      /drift\.com/i,
      /js\.driftt\.com/i,
      /js\.drift\.com/i,
      /drift-frame/i,
      /drift-widget/i,
    ],
  },
  {
    name: 'Zendesk',
    weight: 85,
    patterns: [
      /zendesk\.com/i,
      /zdassets\.com/i,
      /zopim\.com/i,
      /static\.zdassets/i,
      /zE\(\s*['"]webWidget/i,
    ],
  },
  {
    name: 'Tidio',
    weight: 83,
    patterns: [
      /tidio\.co/i,
      /code\.tidio\.co/i,
      /tidio-chat/i,
    ],
  },
  {
    name: 'Crisp',
    weight: 83,
    patterns: [
      /crisp\.chat/i,
      /client\.crisp\.chat/i,
      /crisp-client/i,
    ],
  },
  {
    name: 'LiveChat',
    weight: 82,
    patterns: [
      /livechatinc\.com/i,
      /cdn\.livechatinc/i,
      /livechat-widget/i,
    ],
  },
  {
    name: 'Tawk.to',
    weight: 84,
    patterns: [
      /tawk\.to/i,
      /embed\.tawk\.to/i,
      /va\.tawk\.to/i,
    ],
  },
  {
    name: 'Olark',
    weight: 78,
    patterns: [
      /olark\.com/i,
      /static\.olark/i,
      /olark-widget/i,
    ],
  },
  {
    name: 'Freshchat',
    weight: 80,
    patterns: [
      /freshchat\.com/i,
      /wchat\.freshchat/i,
      /freshbots\.ai/i,
    ],
  },
  {
    name: 'Front',
    weight: 76,
    patterns: [
      /frontapp\.com/i,
      /chat\.frontapp/i,
      /chat-widget\.frontapp/i,
    ],
  },
  {
    name: 'Gorgias',
    weight: 82,
    patterns: [
      /gorgias\.chat/i,
      /gorgias\.io/i,
      /config\.gorgias\.chat/i,
    ],
  },
]

// ---------------------------------------------------------------------------
// Scheduling Patterns (9)
// ---------------------------------------------------------------------------

const SCHEDULING_PATTERNS: PatternDef[] = [
  {
    name: 'Calendly',
    weight: 88,
    patterns: [
      /calendly\.com/i,
      /assets\.calendly/i,
      /calendly-inline-widget/i,
      /calendly-badge-widget/i,
    ],
  },
  {
    name: 'Acuity Scheduling',
    weight: 85,
    patterns: [
      /acuityscheduling\.com/i,
      /squareup\.com.*acuity/i,
      /app\.acuityscheduling/i,
    ],
  },
  {
    name: 'Appointy',
    weight: 78,
    patterns: [
      /appointy\.com/i,
      /booking\.appointy/i,
    ],
  },
  {
    name: 'Booksy',
    weight: 80,
    patterns: [
      /booksy\.com/i,
      /widget\.booksy/i,
    ],
  },
  {
    name: 'SimplyBook',
    weight: 78,
    patterns: [
      /simplybook\.me/i,
      /simplybook\.it/i,
    ],
  },
  {
    name: 'Setmore',
    weight: 78,
    patterns: [
      /setmore\.com/i,
      /my\.setmore/i,
    ],
  },
  {
    name: 'Square Appointments',
    weight: 80,
    patterns: [
      /squareup\.com.*appointments/i,
      /square\.site.*book/i,
      /book\.squareup/i,
    ],
  },
  {
    name: 'Vagaro',
    weight: 80,
    patterns: [
      /vagaro\.com/i,
      /widget\.vagaro/i,
    ],
  },
  {
    name: 'Mindbody',
    weight: 82,
    patterns: [
      /mindbodyonline\.com/i,
      /mindbody\.io/i,
      /healcode\.com/i,
      /widgets\.mindbodyonline/i,
    ],
  },
]

// ---------------------------------------------------------------------------
// Email Infrastructure Patterns (7)
// ---------------------------------------------------------------------------

const EMAIL_PATTERNS: PatternDef[] = [
  {
    name: 'Google Workspace',
    weight: 75,
    patterns: [
      /google-site-verification/i,
      /googlemail\.l\.google/i,
      /aspmx\.l\.google\.com/i,
      /gstatic\.com.*mail/i,
    ],
  },
  {
    name: 'Microsoft 365',
    weight: 75,
    patterns: [
      /outlook\.com/i,
      /protection\.outlook/i,
      /microsoft365/i,
      /office\.com/i,
    ],
  },
  {
    name: 'SendGrid',
    weight: 80,
    patterns: [
      /sendgrid\.net/i,
      /sendgrid\.com/i,
      /em\d+\.sendgrid/i,
    ],
  },
  {
    name: 'Amazon SES',
    weight: 78,
    patterns: [
      /amazonses\.com/i,
      /email-smtp.*amazonaws/i,
      /ses\.amazonaws/i,
    ],
  },
  {
    name: 'Postmark',
    weight: 80,
    patterns: [
      /postmarkapp\.com/i,
      /pstmrk\.it/i,
    ],
  },
  {
    name: 'Mailgun',
    weight: 80,
    patterns: [
      /mailgun\.org/i,
      /mailgun\.net/i,
      /mailgun\.com/i,
    ],
  },
  {
    name: 'SparkPost',
    weight: 78,
    patterns: [
      /sparkpost\.com/i,
      /sparkpostmail\.com/i,
      /mspmtx\.com/i,
    ],
  },
]

// ---------------------------------------------------------------------------
// Payment Patterns (inline)
// ---------------------------------------------------------------------------

const PAYMENT_PATTERNS: PatternDef[] = [
  {
    name: 'Stripe',
    weight: 90,
    patterns: [
      /js\.stripe\.com/i,
      /stripe\.com/i,
      /checkout\.stripe/i,
      /m\.stripe\.network/i,
    ],
  },
  {
    name: 'Square',
    weight: 85,
    patterns: [
      /squareup\.com/i,
      /square\.site/i,
      /squarecdn\.com/i,
      /js\.squareup/i,
    ],
  },
  {
    name: 'PayPal',
    weight: 88,
    patterns: [
      /paypal\.com/i,
      /paypalobjects\.com/i,
      /paypal-button/i,
    ],
  },
  {
    name: 'Braintree',
    weight: 82,
    patterns: [
      /braintreegateway\.com/i,
      /braintree-api\.com/i,
      /braintreepayments\.com/i,
    ],
  },
]

// ---------------------------------------------------------------------------
// Analytics Patterns (inline)
// ---------------------------------------------------------------------------

const ANALYTICS_PATTERNS: PatternDef[] = [
  {
    name: 'Google Analytics',
    weight: 92,
    patterns: [
      /google-analytics\.com/i,
      /googletagmanager\.com/i,
      /gtag\s*\(/i,
      /analytics\.js/i,
      /ga\.js/i,
      /UA-\d+-\d+/i,
      /G-[A-Z0-9]+/i,
      /GTM-[A-Z0-9]+/i,
    ],
  },
  {
    name: 'Facebook Pixel',
    weight: 88,
    patterns: [
      /connect\.facebook\.net/i,
      /fbevents\.js/i,
      /fbq\s*\(/i,
      /facebook\.com\/tr/i,
    ],
  },
  {
    name: 'Hotjar',
    weight: 85,
    patterns: [
      /hotjar\.com/i,
      /static\.hotjar/i,
      /hj\s*\(\s*['"]init['"]/i,
    ],
  },
  {
    name: 'Mixpanel',
    weight: 83,
    patterns: [
      /mixpanel\.com/i,
      /cdn\.mxpnl\.com/i,
      /mixpanel\.init/i,
    ],
  },
  {
    name: 'Segment',
    weight: 84,
    patterns: [
      /segment\.com/i,
      /cdn\.segment/i,
      /analytics\.load/i,
      /segment\.io/i,
    ],
  },
]

// ---------------------------------------------------------------------------
// Ads Patterns (inline)
// ---------------------------------------------------------------------------

const ADS_PATTERNS: PatternDef[] = [
  {
    name: 'Google Ads',
    weight: 88,
    patterns: [
      /googleads\.g\.doubleclick/i,
      /googlesyndication\.com/i,
      /googleadservices\.com/i,
      /google_conversion_id/i,
      /AW-\d+/i,
    ],
  },
  {
    name: 'LinkedIn Ads',
    weight: 82,
    patterns: [
      /snap\.licdn\.com/i,
      /linkedin\.com\/px/i,
      /linkedin-insight/i,
      /\_linkedin_partner_id/i,
    ],
  },
  {
    name: 'Facebook Ads',
    weight: 86,
    patterns: [
      /facebook\.com.*ads/i,
      /facebook\.net\/signals/i,
      /fbq\s*\(\s*['"]track['"]/i,
    ],
  },
  {
    name: 'TikTok Ads',
    weight: 80,
    patterns: [
      /analytics\.tiktok\.com/i,
      /tiktok\.com\/i18n\/pixel/i,
      /ttq\.load/i,
    ],
  },
]

// ---------------------------------------------------------------------------
// All pattern groups mapped to category
// ---------------------------------------------------------------------------

const ALL_PATTERN_GROUPS: { category: string; patterns: PatternDef[] }[] = [
  { category: 'crm', patterns: CRM_PATTERNS },
  { category: 'automation', patterns: AUTOMATION_PATTERNS },
  { category: 'reviews', patterns: REVIEW_PATTERNS },
  { category: 'chat', patterns: CHAT_PATTERNS },
  { category: 'scheduling', patterns: SCHEDULING_PATTERNS },
  { category: 'email', patterns: EMAIL_PATTERNS },
  { category: 'payments', patterns: PAYMENT_PATTERNS },
  { category: 'analytics', patterns: ANALYTICS_PATTERNS },
  { category: 'ads', patterns: ADS_PATTERNS },
]

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

function scanHTML(html: string): DetectedTool[] {
  const detected: DetectedTool[] = []

  for (const group of ALL_PATTERN_GROUPS) {
    for (const tool of group.patterns) {
      const evidence: string[] = []
      let matchCount = 0

      for (const regex of tool.patterns) {
        const match = html.match(regex)
        if (match) {
          matchCount++
          evidence.push(match[0])
        }
      }

      if (matchCount > 0) {
        // Confidence scales with number of matching patterns
        const patternRatio = matchCount / tool.patterns.length
        const confidence = Math.min(100, Math.round(tool.weight * (0.6 + 0.4 * patternRatio)))

        detected.push({
          category: group.category,
          name: tool.name,
          confidence,
          evidence,
        })
      }
    }
  }

  // Sort by confidence descending
  detected.sort((a, b) => b.confidence - a.confidence)
  return detected
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a domain's HTML and run all detection patterns against it.
 * Uses a 10-second timeout and follows redirects.
 */
export async function detectDomain(domain: string): Promise<DetectionResult> {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const url = `https://${cleanDomain}`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; 0nStack/1.0; +https://0nmcp.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })

    clearTimeout(timer)

    if (!response.ok) {
      return {
        domain: cleanDomain,
        scannedAt: new Date().toISOString(),
        status: 'error',
        error: `HTTP ${response.status} ${response.statusText}`,
        tools: [],
        hasCRM: false,
        hasAutomation: false,
        hasReviews: false,
        hasChat: false,
        hasScheduling: false,
        hasEmail: false,
        hasPayments: false,
        hasAnalytics: false,
        hasAds: false,
      }
    }

    const html = await response.text()
    const tools = scanHTML(html)

    const hasCategory = (cat: string) =>
      tools.some((t) => t.category === cat)

    return {
      domain: cleanDomain,
      scannedAt: new Date().toISOString(),
      status: 'success',
      tools,
      hasCRM: hasCategory('crm'),
      hasAutomation: hasCategory('automation'),
      hasReviews: hasCategory('reviews'),
      hasChat: hasCategory('chat'),
      hasScheduling: hasCategory('scheduling'),
      hasEmail: hasCategory('email'),
      hasPayments: hasCategory('payments'),
      hasAnalytics: hasCategory('analytics'),
      hasAds: hasCategory('ads'),
      rawHTML: html,
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown fetch error'

    return {
      domain: cleanDomain,
      scannedAt: new Date().toISOString(),
      status: 'error',
      error: message,
      tools: [],
      hasCRM: false,
      hasAutomation: false,
      hasReviews: false,
      hasChat: false,
      hasScheduling: false,
      hasEmail: false,
      hasPayments: false,
      hasAnalytics: false,
      hasAds: false,
    }
  }
}
