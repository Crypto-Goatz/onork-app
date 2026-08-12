/**
 * GET /api/extension/contact?q=…&locationId=… — look a person up, fast.
 *
 * READS GO DIRECT. WRITES DO NOT. That split is deliberate and it is the rule
 * this whole system runs on: anything that CHANGES a client goes through
 * plan → approve → run so it is costed, signed and receipted. A lookup changes
 * nothing, and putting an approval step in front of "who is this person" would
 * make the feature useless — nobody approves a plan to read a phone number.
 *
 * SEARCHES EVERY CONNECTED CLIENT WHEN NONE IS NAMED. From a LinkedIn profile
 * or a right-click, the extension has a name and no idea which of twelve client
 * accounts that person sits in — which is exactly the question being asked. The
 * answer says which account each match came from, because "Tom Reilly" existing
 * in two clients is information, not a collision.
 *
 * Bearer app token only, same as every other extension call. A revoked device
 * key stops this on the next request.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'
import { crmGet } from '@/lib/crm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Cap the fan-out. An agency with 80 clients must not fire 80 CRM calls on a keystroke. */
const MAX_ACCOUNTS = 12
const PER_ACCOUNT = 5

interface Hit {
  id: string
  name: string
  email: string | null
  phone: string | null
  locationId: string
  locationName: string
}

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) {
    return NextResponse.json({ error: 'Connect this browser to 0nCORE first.' }, { status: 401 })
  }
  const companyId = session.claims.companyId

  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  const only = (req.nextUrl.searchParams.get('locationId') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({ error: 'Type at least two characters.' }, { status: 400 })
  }

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Lookup is unavailable.' }, { status: 503 })

  // Only VERIFIED clients. An unverified key produces a 401 per account and a
  // wall of noise that reads as "the search is broken".
  let query = db
    .from('location_connections')
    .select('location_id, location_name')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .not('verified_at', 'is', null)
  if (only) query = query.eq('location_id', only)

  const { data: accounts } = await query.limit(MAX_ACCOUNTS)
  if (!accounts?.length) {
    return NextResponse.json({ hits: [], searched: 0, note: 'No connected clients with a verified key.' })
  }

  const results = await Promise.all(
    accounts.map(async (acct) => {
      try {
        const res = await crmGet(
          `/contacts/?locationId=${encodeURIComponent(acct.location_id)}&query=${encodeURIComponent(q)}&limit=${PER_ACCOUNT}`,
          acct.location_id,
        )
        if (!res.ok) return [] as Hit[]
        const json = (await res.json().catch(() => ({}))) as {
          contacts?: { id?: string; contactName?: string; firstName?: string; lastName?: string; email?: string; phone?: string }[]
        }
        return (json.contacts ?? []).map<Hit>((c) => ({
          id: String(c.id ?? ''),
          name: c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Unnamed',
          email: c.email ?? null,
          phone: c.phone ?? null,
          locationId: acct.location_id,
          locationName: acct.location_name || acct.location_id,
        }))
      } catch {
        // One unreachable account must not blank the whole result.
        return [] as Hit[]
      }
    }),
  )

  const hits = results.flat()
  return NextResponse.json({ hits, searched: accounts.length, query: q })
}
