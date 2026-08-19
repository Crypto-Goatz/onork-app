/**
 * LeadScout's API — find, then save.
 *
 * ONE ROUTE, TWO STEPS, because they are one conversation: you search, you look
 * at what came back, you keep some of it. Splitting them across files would put
 * the dedupe logic somewhere neither step owns.
 *
 * DEDUPE BEFORE THE PERSON CHOOSES, not after. A lead list that quietly
 * re-adds forty contacts the agency already has is the fastest way to lose
 * trust in a lead tool, and the second-fastest is finding out afterwards.
 *
 * TWO WAYS TO PROVE WHO YOU ARE, ONE OF THEM STRICTER. Inside the CRM iframe
 * there is no 0nCORE account, so a short-lived SSO JWT is the only credential
 * available and the location is named by the caller. Opened from the 0nCORE Hub
 * there IS an account, so the entitlement gate runs instead and the location
 * comes from the profile — the caller does not get to name it. The JWT path is
 * kept because the Custom Page has no alternative, not because it is the better
 * of the two.
 *
 * SAVING IS CAPPED AND IT SAYS SO. Writing into a live CRM is exactly the class
 * of action that should never happen in bulk without a look first — the batch
 * limit is enforced here, not just suggested in the UI, because a UI limit is a
 * suggestion to anyone holding the URL.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { crmGet, crmPost, crmPostRaw } from '@/lib/crm'
import { findLocalLeads, type Lead } from '@/lib/leadscout/search'
import { requireAddonAccess } from '@/lib/addons/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Never write more than this in one press, whatever the caller asks for. */
const BATCH_CAP = 25

/** Existing contacts for this location, as a set of domains and names. */
async function existing(locationId: string): Promise<{ domains: Set<string>; names: Set<string> }> {
  const domains = new Set<string>()
  const names = new Set<string>()
  try {
    // 100 is a page, not the whole book — said plainly in the response rather
    // than implied by a silent slice.
    const res = await crmGet('/contacts/?limit=100', locationId)
    if (!res.ok) return { domains, names }
    const body = (await res.json()) as { contacts?: Record<string, unknown>[] }
    for (const c of body.contacts ?? []) {
      const site = typeof c.website === 'string' ? c.website : ''
      if (site) {
        try { domains.add(new URL(site.startsWith('http') ? site : `https://${site}`).hostname.replace(/^www\./, '').toLowerCase()) } catch { /* not a url */ }
      }
      const n = [c.companyName, c.contactName].filter((x) => typeof x === 'string').join(' ').toLowerCase().trim()
      if (n) names.add(n)
    }
  } catch { /* an unreadable contact list must not block discovery */ }
  return { domains, names }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    step?: 'find' | 'save'
    locationId?: string
    trade?: string
    where?: string
    limit?: number
    leads?: Lead[]
  }

  /**
   * The iframe presents a JWT; the Hub presents a session. Try the JWT first
   * so the Custom Page never pays for an entitlement lookup it cannot satisfy,
   * and fall through rather than 401 — a request with no bearer at all is the
   * Hub's normal shape, not an attack.
   */
  let locationId = ''
  const jwt = verifyAppJwt(bearer(req))
  if (jwt.ok) {
    locationId = String(body.locationId || '').trim()
    if (!locationId) return NextResponse.json({ error: 'No account selected.' }, { status: 400 })
  } else {
    // 401 signed out · 402 not entitled · 503 the check itself failed.
    const access = await requireAddonAccess('lead0n')
    if (!access.ok) return access.response
    // Deliberately NOT body.locationId. The profile behind the session is the
    // only location this caller may write to, and letting a browser name a
    // different one is how a lead tool writes into somebody else's CRM.
    locationId = access.locationId
    if (!locationId) {
      return NextResponse.json(
        { error: 'No CRM location is connected to this account. Connect one in Settings.' },
        { status: 400 },
      )
    }
  }

  // ── FIND ────────────────────────────────────────────────────────────────
  if (body.step === 'find') {
    const found = await findLocalLeads({
      trade: String(body.trade || ''),
      where: String(body.where || ''),
      limit: body.limit,
    })
    if (!found.ok) return NextResponse.json({ error: found.error }, { status: 502 })

    const have = await existing(locationId)
    const leads = found.leads.map((l) => ({
      ...l,
      known:
        (l.domain ? have.domains.has(l.domain) : false) ||
        have.names.has(l.name.toLowerCase().trim()),
    }))

    return NextResponse.json({
      leads,
      fresh: leads.filter((l) => !l.known).length,
      known: leads.filter((l) => l.known).length,
      // Honest about the dedupe's reach rather than implying it was exhaustive.
      dedupeNote: 'Checked against the 100 most recent contacts in this account.',
    })
  }

  // ── SAVE ────────────────────────────────────────────────────────────────
  if (body.step === 'save') {
    const chosen = (body.leads ?? []).filter((l) => l && l.name)
    if (!chosen.length) return NextResponse.json({ error: 'Nothing selected.' }, { status: 400 })
    if (chosen.length > BATCH_CAP) {
      return NextResponse.json(
        { error: `That is ${chosen.length} contacts in one go. Save ${BATCH_CAP} at a time and check the first batch landed the way you expect.` },
        { status: 400 },
      )
    }

    const saved: { name: string; id: string }[] = []
    const failed: { name: string; error: string }[] = []

    // Sequential. A parallel burst into someone's CRM is how a rate limit turns
    // into a half-imported list nobody can tell apart from a complete one.
    for (const l of chosen) {
      try {
        const res = await crmPost('/contacts/', locationId, {
          companyName: l.name,
          name: l.name,
          phone: l.phone || undefined,
          website: l.website || undefined,
          address1: l.address || undefined,
          source: 'LeadScout',
          tags: ['leadscout'],
        })
        const d = (await res.json().catch(() => ({}))) as { contact?: { id?: string }; message?: string | string[] }
        if (!res.ok) {
          const m = Array.isArray(d.message) ? d.message.join(', ') : d.message
          // A duplicate is the CRM protecting the account, not a failure to fix.
          failed.push({ name: l.name, error: res.status === 400 && /duplicat/i.test(String(m)) ? 'Already in this account.' : String(m || `HTTP ${res.status}`) })
          continue
        }
        const id = d.contact?.id
        if (id) saved.push({ name: l.name, id })
      } catch (e) {
        failed.push({ name: l.name, error: (e as Error).message })
      }
    }

    // Receipt, in the same shape the rest of the product uses.
    try {
      await crmPostRaw('/contacts/search', locationId, { locationId, pageLimit: 1 })
    } catch { /* best effort warm-read, never fatal */ }

    return NextResponse.json({ saved: saved.length, failed, savedIds: saved.map((s) => s.id) })
  }

  return NextResponse.json({ error: 'Unknown step.' }, { status: 400 })
}
