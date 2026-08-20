/**
 * WHITE-LABEL BRANDING — one function, so every client-facing page looks like
 * the agency's client rather than like us.
 *
 * Mike's idea, 2026-08-20: build CRM pages that render inside a sub-location
 * and take every colour, logo and word from configurable variables — so an
 * agency white-labels by filling in a form, not by asking us for a build.
 *
 * TWO SOURCES, ONE ANSWER, IN A DELIBERATE ORDER.
 *
 *   1. `location_branding` — our table, 35 columns, already exists with rows.
 *      Richer: fonts, socials, email header/footer, chat widget theme.
 *   2. `custom_values` on the CRM location — the agency's own variables, the
 *      ones their workflows and AI already read from.
 *
 * The CRM WINS on any field both can answer. That is not arbitrary: the agency
 * edits custom values to change what their automations say, and if this page
 * disagreed with their own emails the page would be the thing that looks
 * broken. One business, one voice — and the CRM is where they already maintain
 * it.
 *
 * NEVER INVENT A BRAND. Every field falls back to a neutral default, never to
 * 0n's own colours. A client page accidentally wearing our green is worse than
 * a plain one: it un-white-labels the agency in front of their customer, which
 * is the exact thing they are paying to avoid.
 *
 * NEVER BLOCK ON THIS EITHER. Branding failing to load must render a plain page,
 * not an error — the content is the product, the styling is the wrapper.
 */
import { createServiceClient } from '@/lib/connect/service-client'

export interface Branding {
  businessName: string | null
  tagline: string | null
  logoUrl: string | null
  faviconUrl: string | null
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  headingFont: string
  bodyFont: string
  website: string | null
  socials: { label: string; url: string }[]
  emailFromName: string | null
  emailSignature: string | null
  /** Which source answered — so a "why does this look wrong" question is answerable. */
  source: 'crm+db' | 'db' | 'crm' | 'default'
  /** True when nothing was found; the page should render unbranded, not broken. */
  isDefault: boolean
}

/**
 * Neutral, deliberately. Greys and near-black — legible, unremarkable, and
 * unmistakably NOT a brand. If an agency sees this they know configuration is
 * missing, rather than seeing our identity on their client's screen.
 */
const NEUTRAL: Branding = {
  businessName: null, tagline: null, logoUrl: null, faviconUrl: null,
  primary: '#1f2937', secondary: '#374151', accent: '#4b5563',
  background: '#ffffff', text: '#111827',
  headingFont: 'system-ui, sans-serif', bodyFont: 'system-ui, sans-serif',
  website: null, socials: [], emailFromName: null, emailSignature: null,
  source: 'default', isDefault: true,
}

/** A hex we are willing to put on a customer's screen. */
function hex(v: unknown): string | null {
  const s = String(v ?? '').trim()
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : null
}

const clean = (v: unknown): string | null => {
  const s = String(v ?? '').trim()
  return s.length ? s : null
}

/**
 * Resolve branding for one CRM location.
 *
 * @param locationId  the workspace whose client this page is for
 * @param customValues optional map already fetched by the caller — passing it
 *                     avoids a second CRM round trip on a page that has one.
 */
export async function resolveBranding(
  locationId: string,
  customValues?: Record<string, string>,
): Promise<Branding> {
  if (!locationId) return NEUTRAL

  let row: Record<string, unknown> | null = null
  const db = createServiceClient()
  if (db) {
    try {
      const { data } = await db
        .from('location_branding')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle()
      row = data ?? null
    } catch {
      // Styling must never take a page down. Fall through to neutral.
    }
  }

  const cv = customValues ?? {}
  const hasCv = Object.keys(cv).length > 0
  if (!row && !hasCv) return NEUTRAL

  // CRM custom values win where both answer — see the note at the top.
  const pick = (cvKey: string, dbKey: string): string | null =>
    clean(cv[cvKey]) ?? clean(row?.[dbKey])

  const pickHex = (cvKey: string, dbKey: string, fallback: string): string =>
    hex(cv[cvKey]) ?? hex(row?.[dbKey]) ?? fallback

  const socials: { label: string; url: string }[] = []
  for (const [label, key] of [
    ['Facebook', 'facebook_url'], ['Instagram', 'instagram_url'],
    ['LinkedIn', 'linkedin_url'], ['X', 'twitter_url'],
    ['YouTube', 'youtube_url'], ['TikTok', 'tiktok_url'],
  ] as [string, string][]) {
    const url = clean(row?.[key])
    if (url) socials.push({ label, url })
  }

  return {
    businessName: pick('business_name', 'business_name'),
    tagline: clean(row?.tagline),
    logoUrl: pick('logo_url', 'logo_url'),
    faviconUrl: clean(row?.favicon_url),
    primary: pickHex('brand_color', 'primary_color', NEUTRAL.primary),
    secondary: pickHex('brand_secondary', 'secondary_color', NEUTRAL.secondary),
    accent: pickHex('brand_accent', 'accent_color', NEUTRAL.accent),
    background: pickHex('brand_background', 'background_color', NEUTRAL.background),
    text: pickHex('brand_text', 'text_color', NEUTRAL.text),
    headingFont: clean(row?.heading_font) ?? NEUTRAL.headingFont,
    bodyFont: clean(row?.body_font) ?? NEUTRAL.bodyFont,
    website: pick('website_url', 'website_url'),
    socials,
    emailFromName: clean(row?.email_from_name) ?? pick('business_name', 'business_name'),
    emailSignature: clean(row?.email_signature),
    source: row && hasCv ? 'crm+db' : row ? 'db' : 'crm',
    isDefault: false,
  }
}

/**
 * Branding as CSS custom properties, for a page to spread onto its root.
 *
 * Variables rather than inline styles on every element: one declaration, and
 * every child inherits — so a page cannot half-apply a brand and end up wearing
 * two identities at once.
 */
export function brandingVars(b: Branding): Record<string, string> {
  return {
    '--brand-primary': b.primary,
    '--brand-secondary': b.secondary,
    '--brand-accent': b.accent,
    '--brand-bg': b.background,
    '--brand-text': b.text,
    '--brand-heading-font': b.headingFont,
    '--brand-body-font': b.bodyFont,
  }
}
