/**
 * GET /api/connect/status — where this agency is in setup, and what to do next.
 *
 * ONE READER for the sign-in alert and the setup screen, so the banner can
 * never claim a different state from the page it links to.
 *
 * The steps exist because an agency PIT is not enough to do anything. It lists
 * sub-accounts; it cannot act inside one (401, verified in production). Until a
 * sub-account PIT is stored, every feature that writes to a client fails at the
 * final step — which reads as "the product is broken" rather than "setup is not
 * finished". This endpoint makes the difference visible before the failure.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import type { CrmLocation } from '@/lib/connect/pit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type Step = 'agency' | 'pick_free' | 'need_pit' | 'clients_need_key' | 'done'

const COPY: Record<Step, { title: string; detail: string; cta: string }> = {
  agency: {
    title: 'Finish setting up your agency',
    detail:
      'Add your agency token so 0nCORE can see your client list. Nothing in your CRM is changed by this.',
    cta: 'Add agency token',
  },
  pick_free: {
    title: 'Choose your free account',
    detail:
      'One client account is included free. We strongly recommend choosing your own agency sub-account — it becomes the default for every command unless you name a different client. You can only choose once.',
    cta: 'Choose free account',
  },
  need_pit: {
    title: 'One step left — connect your free account',
    detail:
      'We have the account, but not its key yet. Until that key is added, anything that writes to this client will fail at the last step.',
    cta: 'Add the key',
  },
  clients_need_key: {
    title: 'Some clients have no key yet',
    detail:
      'These clients are added and billing, but 0nCORE has no verified key for them — so any command that writes to them will fail at the last step. Add each key to switch them on.',
    cta: 'Add client keys',
  },
  done: { title: 'Setup complete', detail: '', cta: '' },
}

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ authed: false }, { status: 401 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ authed: true, step: 'agency', ...COPY.agency }, { status: 200 })

  const { data: agency } = await db
    .from('agency_connections')
    .select('company_id, locations, free_location_id, free_locked_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

  // No agency token yet → nothing else can be asked of them.
  if (!agency) {
    return NextResponse.json({ authed: true, step: 'agency', complete: false, ...COPY.agency })
  }

  const locations = (agency.locations as CrmLocation[]) ?? []

  // Chose an account but its key never landed. This is the state that looks
  // like a broken product, so it is named explicitly.
  if (agency.free_location_id) {
    const { data: conn } = await db
      .from('location_connections')
      .select('location_id, verified_at')
      .eq('company_id', agency.company_id)
      .eq('location_id', agency.free_location_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!conn?.verified_at) {
      const name = locations.find((l) => l.id === agency.free_location_id)?.name ?? 'your account'
      return NextResponse.json({
        authed: true,
        step: 'need_pit',
        complete: false,
        freeLocationId: agency.free_location_id,
        freeLocationName: name,
        ...COPY.need_pit,
      })
    }

    /**
     * THE FREE ACCOUNT BEING CONNECTED IS NOT THE SAME AS SETUP BEING DONE.
     *
     * Every client added after it needs its own key, and a client sitting there
     * with none is the exact failure this endpoint exists to pre-empt: the
     * agency is billed $5 for it, the command plans against it, and only the
     * final write fails. Previously setup went quiet once the free account was
     * connected, so those clients were invisible until something broke.
     *
     * This stays incomplete — and therefore stays on screen — until every
     * client has a verified key.
     */
    const { data: unverified } = await db
      .from('location_connections')
      .select('location_id, location_name')
      .eq('company_id', agency.company_id)
      .eq('status', 'active')
      .is('verified_at', null)

    if (unverified?.length) {
      const names = unverified.map(
        (c) => c.location_name || locations.find((l) => l.id === c.location_id)?.name || c.location_id,
      )
      return NextResponse.json({
        authed: true,
        step: 'clients_need_key',
        complete: false,
        freeLocationId: agency.free_location_id,
        missingCount: unverified.length,
        missingClients: names.slice(0, 12),
        ...COPY.clients_need_key,
      })
    }

    return NextResponse.json({
      authed: true,
      step: 'done',
      complete: true,
      freeLocationId: agency.free_location_id,
      freeLocationName: locations.find((l) => l.id === agency.free_location_id)?.name ?? null,
      lockedAt: agency.free_locked_at,
      ...COPY.done,
    })
  }

  return NextResponse.json({
    authed: true,
    step: 'pick_free',
    complete: false,
    accountCount: locations.length,
    ...COPY.pick_free,
  })
}
