import { NextRequest, NextResponse } from 'next/server'
import { buildProspectSite, type Prospect } from '@/lib/prospect/site'
import { generateJson } from '@/lib/ai-client'

/**
 * Scraped LinkedIn profile in, a real hosted homepage out.
 *
 * Called from the extension, so it carries the same shared-token auth and CORS
 * as the lead capture it sits beside — this writes a row and spends a model
 * call, and an open endpoint that does either is an endpoint someone else runs
 * up a bill on.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  // Scoped rather than '*': the only legitimate caller is the extension.
  'Access-Control-Allow-Origin': process.env.EXTENSION_ORIGIN || 'https://www.linkedin.com',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(req: NextRequest) {
  const secret = process.env.LEAD_ENGINE_TOKEN
  const given = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!secret || given !== secret) {
    return NextResponse.json({ ok: false, error: 'Not authorised.' }, { status: 401, headers: CORS })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Body must be JSON.' }, { status: 400, headers: CORS })
  }

  const p: Prospect = {
    business: str(body.business || body.company, 120),
    contactName: str(body.contactName || body.name, 80),
    title: str(body.title, 120),
    industry: str(body.industry, 80),
    location: str(body.location, 80),
    linkedinUrl: str(body.linkedinUrl || body.profileUrl, 300),
    context: str(body.context || body.headline || body.about, 800),
  }

  if (!p.business) {
    return NextResponse.json(
      { ok: false, error: 'No company name on that profile — nothing to build a page about.' },
      { status: 400, headers: CORS },
    )
  }

  try {
    const copy = await generateJson<{
      headline: string; sub: string; cta: string
      featuresTitle: string; featuresBody: string; ctaHeadline: string
    }>({
      job: 'json',
      temperature: 0.6,
      system:
        'You write homepage copy for small businesses. You write only what you can know from the brief. ' +
        'You never invent prices, hours, phone numbers, addresses, clients, reviews, statistics or awards. Output JSON only.',
      prompt: `Write homepage copy for this business.

Business: ${p.business}
${p.industry ? `Industry: ${p.industry}` : ''}
${p.title ? `Contact's role: ${p.title}` : ''}
${p.location ? `Location: ${p.location}` : ''}
${p.context ? `From their profile: ${p.context}` : ''}

RULES
- Write about what they do, not about what we do.
- Invent NOTHING: no prices, hours, phone numbers, addresses, client names,
  testimonials, review scores, statistics, awards or years in business. If you
  do not know it, do not say it — a wrong fact on someone's own homepage is
  worse than a plain one.
- Plain, confident English. No "unlock", "supercharge", "elevate", no exclamation marks.

Return JSON only:
{"headline":"<= 70 chars, one clear promise",
 "sub":"<= 140 chars, makes it believable",
 "cta":"<= 24 chars, the action",
 "featuresTitle":"<= 60 chars",
 "featuresBody":"<= 220 chars, two sentences on what they do for their customers",
 "ctaHeadline":"<= 70 chars"}`,
    })

    const site = await buildProspectSite(p, copy, {
      createdBy: str(body.createdBy, 80) || 'extension',
      locationId: str(body.locationId, 60) || undefined,
    })

    return NextResponse.json({ ok: true, ...site, business: p.business }, { headers: CORS })
  } catch (err) {
    console.error('[prospect/site]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not build the page.' },
      { status: 502, headers: CORS },
    )
  }
}
