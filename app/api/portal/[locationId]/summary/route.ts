/**
 * GET /api/portal/:locationId/summary — the Client Console's Overview.
 *
 * ONE ACCOUNT, AND ONLY EVER ONE. This serves the agency's customer, who has a
 * single location and is not technical. Every number here is scoped to the
 * locationId in the path, and that id is checked against the connected-client
 * list before anything is read — a portal that trusted the path would let anyone
 * enumerate every client an agency has.
 *
 * RECENT ACTIVITY IS RECEIPTS IN PLAIN WORDS. The agency acts inside this
 * person's account; that has to be visible to them, in sentences rather than
 * capability ids. "0n tagged 12 contacts" is accountability. "contact.tag ok"
 * is a log line.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'
import { crmGet } from '@/lib/crm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** capability id → what a non-technical owner would call it. */
const PLAIN: Record<string, (n: number) => string> = {
  'contact.tag': (n) => `tagged ${n} contact${n === 1 ? '' : 's'}`,
  'contact.create': (n) => `added ${n} contact${n === 1 ? '' : 's'}`,
  'contact.update': (n) => `updated ${n} contact${n === 1 ? '' : 's'}`,
  'contact.note': (n) => `left ${n} note${n === 1 ? '' : 's'}`,
  'sms.send': (n) => `sent ${n} text${n === 1 ? '' : 's'}`,
  'email.send': (n) => `sent ${n} email${n === 1 ? '' : 's'}`,
  'task.create': (n) => `created ${n} task${n === 1 ? '' : 's'}`,
  'product.create': (n) => `added ${n} product${n === 1 ? '' : 's'}`,
  'store.provision': (n) => `set up your store (${n} product${n === 1 ? '' : 's'})`,
  'blog.publish': () => 'published a post',
  'conversation.summarize': () => 'summarised a conversation',
  'appointment.book': (n) => `booked ${n} appointment${n === 1 ? '' : 's'}`,
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await ctx.params
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  // The path is a claim, not a permission. 404 rather than 403: confirming an
  // id exists is itself information.
  const { data: conn } = await db
    .from('location_connections')
    .select('location_id, location_name')
    .eq('location_id', locationId)
    .eq('status', 'active')
    .maybeSingle()
  if (!conn) return NextResponse.json({ error: 'No such account.' }, { status: 404 })

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const [contactsRes, oppsRes, { data: receipts }] = await Promise.all([
    crmGet(`/contacts/?locationId=${encodeURIComponent(locationId)}&limit=1`, locationId).catch(() => null),
    crmGet(`/opportunities/search?location_id=${encodeURIComponent(locationId)}&limit=1`, locationId).catch(() => null),
    db.from('burst_receipts')
      .select('capability, detail, targets, status, settled_at')
      .eq('location_id', locationId)
      .eq('status', 'ok')
      .order('settled_at', { ascending: false })
      .limit(12),
  ])

  const contactTotal = contactsRes?.ok
    ? ((await contactsRes.json().catch(() => ({}))) as { meta?: { total?: number } }).meta?.total ?? null
    : null
  const dealTotal = oppsRes?.ok
    ? ((await oppsRes.json().catch(() => ({}))) as { meta?: { total?: number } }).meta?.total ?? null
    : null

  const activity = (receipts ?? []).map((r) => {
    const n = Number(r.targets) || 1
    const say = PLAIN[r.capability as string]
    return {
      // Falls back to the receipt's own sentence, which is already written for
      // a human — never the raw capability id.
      text: say ? `0n ${say(n)}` : (r.detail as string) || 'did some work',
      at: r.settled_at as string,
    }
  })

  return NextResponse.json({
    account: { locationId, name: conn.location_name },
    stats: {
      contacts: contactTotal,
      deals: dealTotal,
      // Work done for them in the last week — the number that answers
      // "what am I paying for".
      workThisWeek: (receipts ?? []).filter((r) => (r.settled_at as string) >= since).length,
    },
    activity,
  })
}
