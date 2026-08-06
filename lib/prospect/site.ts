import { createClient } from '@supabase/supabase-js'
import { renderPage } from '@/lib/render'
import type { Block, PageSpec } from '@/lib/builder/blocks'

/**
 * Build a real homepage for a prospect, before they have asked for one.
 *
 * THE OUTREACH THIS ENABLES. "Can I show you a website?" gets ignored. "I built
 * your homepage, here it is" does not. The extension already scrapes name,
 * title, company and industry from LinkedIn — that is enough to write a page
 * that is specifically about them.
 *
 * WHAT MAKES IT SAFE TO SEND. Everything the model could get wrong about
 * someone else's business is frozen: no prices, no hours, no phone numbers, no
 * claims about clients or results. The page says what they do and invites a
 * conversation. A generated page that invents a price list is not a warm
 * opener, it is a correction the prospect has to make on your behalf.
 */

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export interface Prospect {
  business: string
  contactName?: string
  title?: string
  industry?: string
  location?: string
  linkedinUrl?: string
  /** Anything else scraped — headline, about, skills. Used as context only. */
  context?: string
}

/** Unguessable. These pages name a business that never asked for one. */
function slugFor(business: string): string {
  const base = business.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 40) || 'site'
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(36)).join('').slice(0, 8)
  return `${base}-${rand}`
}

const F = (key: string, label: string, intent: string, max: number) => ({ key, label, intent, max })

/**
 * Turn a scraped prospect into a PageSpec.
 *
 * Copy is deliberately generic-but-specific: it names their business and what
 * they do, and says nothing we cannot know. The blanks are the pitch — "this is
 * yours to finish" is a better call to action than a fabricated one.
 */
export function specForProspect(p: Prospect, copy: {
  headline: string; sub: string; cta: string
  featuresTitle: string; featuresBody: string
  ctaHeadline: string
}): PageSpec {
  const blocks: Block[] = [
    {
      id: 'hero',
      kind: 'hero',
      fallback: { headline: copy.headline, sub: copy.sub, cta: copy.cta },
      editable: [
        F('headline', 'Headline', 'One clear promise.', 70),
        F('sub', 'Sub-headline', 'One believable sentence.', 140),
        F('cta', 'Button', 'What happens next.', 24),
      ],
      live: true,
      style: {
        backgroundColor: '#0F172A', textColor: '#F8FAFC', accentColor: '#FF6B35',
        buttonTextColor: '#ffffff', paddingTop: 'py-24', paddingBottom: 'py-24',
        borderRadius: 'rounded-full', align: 'center',
      },
    },
    {
      id: 'features',
      kind: 'features',
      fallback: { title: copy.featuresTitle, body: copy.featuresBody },
      editable: [
        F('title', 'Title', 'Name the outcome.', 60),
        F('body', 'Body', 'Two sentences on what it does for them.', 220),
      ],
      live: true,
      style: {
        backgroundColor: '#ffffff', textColor: '#1A1A1A',
        paddingTop: 'py-20', paddingBottom: 'py-20', align: 'left',
      },
    },
    {
      id: 'cta',
      kind: 'cta',
      fallback: { headline: copy.ctaHeadline, cta: 'Start the conversation' },
      editable: [F('headline', 'Headline', 'Answer the hesitation.', 70)],
      live: true,
      style: {
        backgroundColor: '#FF6B35', textColor: '#ffffff', accentColor: '#0F172A',
        buttonTextColor: '#ffffff', paddingTop: 'py-20', paddingBottom: 'py-20',
        borderRadius: 'rounded-full', align: 'center',
      },
    },
  ]

  return {
    id: 'prospect',
    name: p.business,
    blocks,
    brand: {
      business: p.business,
      sells: p.industry,
      // The guardrail that makes this sendable. Everything here is something we
      // would be guessing about a stranger's business, and a wrong guess on
      // someone's own homepage is worse than a blank one.
      neverSay: [
        'never state a price, rate, package or discount',
        'never state opening hours, a phone number or an address',
        'never name a client, testimonial, review or rating',
        'never claim a result, statistic, award or years in business',
        'never imply they are already a customer of ours',
      ],
    },
  }
}

export interface BuiltSite {
  slug: string
  url: string
  bytes: number
  warnings: string[]
}

export async function buildProspectSite(
  p: Prospect,
  copy: Parameters<typeof specForProspect>[1],
  opts: { createdBy?: string; locationId?: string; host?: string } = {}
): Promise<BuiltSite> {
  const spec = specForProspect(p, copy)
  // `document` target: this is hosted by us, so it can carry a stylesheet and
  // the personaliser. Not the blog target — nothing is being sanitised here.
  const rendered = renderPage(spec, { target: 'document' })

  const slug = slugFor(p.business)
  const { error } = await admin().from('prospect_sites').insert({
    slug,
    business: p.business,
    contact_name: p.contactName ?? null,
    linkedin_url: p.linkedinUrl ?? null,
    industry: p.industry ?? null,
    html: rendered.html,
    spec: spec as unknown as Record<string, unknown>,
    created_by: opts.createdBy ?? null,
    location_id: opts.locationId ?? null,
    source: 'linkedin',
  })
  if (error) throw new Error(`Could not save the page: ${error.message}`)

  const host = opts.host || process.env.NEXT_PUBLIC_APP_HOST || 'https://app.0ncore.com'
  return { slug, url: `${host}/p/${slug}`, bytes: rendered.stats.bytes, warnings: rendered.warnings }
}

/** Fetch for the public page. Counts the view — that is the signal that matters. */
export async function readProspectSite(slug: string): Promise<{ html: string; business: string } | null> {
  const sb = admin()
  const { data } = await sb
    .from('prospect_sites')
    .select('id, html, business, views, expires_at')
    .eq('slug', slug)
    .maybeSingle()

  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  // Fire and forget: a failed counter must never stop the page rendering.
  void sb
    .from('prospect_sites')
    .update({
      views: (data.views ?? 0) + 1,
      last_viewed: new Date().toISOString(),
      ...(data.views ? {} : { first_viewed: new Date().toISOString() }),
    })
    .eq('id', data.id)

  return { html: data.html, business: data.business }
}
