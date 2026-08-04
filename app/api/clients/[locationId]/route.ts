import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { listAgencyLocations } from '@/lib/crm/locations'
import { crmGet } from '@/lib/crm'

/**
 * GET /api/clients/:locationId — one client, in depth.
 *
 * OWNERSHIP FIRST. The id is checked against the agency's own sub-accounts
 * before a single CRM call goes out; without that this route reads any client on
 * the platform by guessing an id. Same 404 whether it belongs to someone else or
 * does not exist — a distinct "not yours" would confirm the id is real.
 *
 * EVERY READ IS INDEPENDENT. One failing lookup returns null for that field
 * rather than failing the page: a contact count we could not fetch should not
 * hide the automations we could.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ locationId: string }> }) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { locationId } = await ctx.params
  const { locations } = await listAgencyLocations(session.claims.companyId)
  const owned = locations.find((l) => l.id === locationId)
  if (!owned) return NextResponse.json({ error: 'No such client on this agency.' }, { status: 404 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  const [contacts, workflows, detail, receipts] = await Promise.all([
    crmGet('/contacts/?limit=1', locationId).then(async (r) => {
      if (!r.ok) return null
      const j = await r.json().catch(() => ({})) as { meta?: { total?: number } }
      return j.meta?.total ?? null
    }).catch(() => null),
    crmGet('/workflows/', locationId).then(async (r) => {
      if (!r.ok) return null
      const j = await r.json().catch(() => ({})) as { workflows?: { name?: string; status?: string }[] }
      return (j.workflows ?? []).map((w) => ({ name: w.name, status: w.status }))
    }).catch(() => null),
    crmGet(`/locations/${locationId}`, locationId).then(async (r) => {
      if (!r.ok) return null
      const j = await r.json().catch(() => ({})) as { location?: Record<string, unknown> }
      const l = j.location ?? {}
      return {
        email: (l.email as string) ?? null,
        phone: (l.phone as string) ?? null,
        city: (l.city as string) ?? null,
        state: (l.state as string) ?? null,
        website: (l.website as string) ?? null,
        timezone: (l.timezone as string) ?? null,
      }
    }).catch(() => null),
    sb.from('burst_receipts')
      .select('capability, status, detail, created_at')
      .eq('company_id', session.claims.companyId)
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => data ?? []),
  ])

  return NextResponse.json({
    ok: true,
    client: { id: owned.id, name: owned.name, ...(detail ?? {}) },
    contacts,
    workflows,
    // Named so the UI can say "could not read" rather than showing a confident 0.
    unreadable: [contacts === null && 'contacts', workflows === null && 'automations'].filter(Boolean),
    receipts,
  })
}
