/**
 * GET /api/portal/:locationId/summary — the Client Console's Overview.
 *
 * ONE ACCOUNT, AND ONLY EVER ONE. This serves the agency's customer, who has a
 * single location and is not technical. Every number is scoped to the
 * locationId in the path, and that id is checked against the connected-client
 * list before anything is read — a portal that trusted the path would let
 * anyone enumerate every client an agency has.
 *
 * RECENT ACTIVITY IS RECEIPTS IN PLAIN WORDS. The agency acts inside this
 * person's account; that has to be visible to them, in sentences rather than
 * capability ids. "0n tagged 12 contacts" is accountability. "contact.tag ok"
 * is a log line.
 *
 * EVERY STAT FAILS ALONE. Four independent CRM reads, each in its own try — a
 * calendar the agency never connected must cost that one card, not the page.
 * A stat that could not be read comes back null and the UI shows a dash; it
 * never comes back 0, because "nothing happened" and "we could not look" are
 * different facts and only one of them should worry someone.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'
import { crmGet, crmPostRaw } from '@/lib/crm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** capability id → what a non-technical owner would call it, + its glyph. */
const PLAIN: Record<string, { say: (n: number) => string; icon: string }> = {
  'contact.tag':    { say: (n) => `tagged ${n} contact${n === 1 ? '' : 's'}`,     icon: 'tag' },
  'contact.create': { say: (n) => `added ${n} contact${n === 1 ? '' : 's'}`,      icon: 'user-plus' },
  'contact.update': { say: (n) => `updated ${n} contact${n === 1 ? '' : 's'}`,    icon: 'user-pen' },
  'contact.note':   { say: (n) => `left ${n} note${n === 1 ? '' : 's'}`,          icon: 'sticky-note' },
  'sms.send':       { say: (n) => `sent ${n} text${n === 1 ? '' : 's'}`,          icon: 'message-square' },
  'email.send':     { say: (n) => `sent ${n} email${n === 1 ? '' : 's'}`,         icon: 'mail' },
  'task.create':    { say: (n) => `created ${n} task${n === 1 ? '' : 's'}`,       icon: 'list-checks' },
  'product.create': { say: (n) => `added ${n} product${n === 1 ? '' : 's'}`,      icon: 'package' },
  'store.provision':{ say: (n) => `set up your store (${n} product${n === 1 ? '' : 's'})`, icon: 'store' },
  'blog.publish':   { say: () => 'published a post to your site',                 icon: 'book-open' },
  'course.publish': { say: () => 'published a course to your site',               icon: 'graduation-cap' },
  'conversation.summarize': { say: () => 'summarised a conversation',             icon: 'sparkles' },
  'appointment.book':{ say: (n) => `booked ${n} appointment${n === 1 ? '' : 's'}`, icon: 'calendar-check' },
  'opportunity.move':{ say: (n) => `moved ${n} deal${n === 1 ? '' : 's'} forward`, icon: 'git-branch' },
}

const ISO = (ms: number) => new Date(ms).toISOString()
const DAY = 86_400_000

/**
 * Why a stat is missing, collected per request.
 *
 * A stat that silently returns null is a stat nobody ever fixes — the card
 * shows a dash and the reason dies in the function that knew it. These notes
 * ride along in the response so a missing number can be diagnosed from the
 * response itself rather than by re-deriving it from scratch. Not rendered.
 */
type Notes = string[]

async function json(res: Response | null, notes: Notes, what: string): Promise<Record<string, unknown> | null> {
  if (!res) { notes.push(`${what}: request threw`); return null }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    notes.push(`${what}: HTTP ${res.status} ${body.slice(0, 160)}`)
    return null
  }
  return (await res.json().catch(() => null)) as Record<string, unknown> | null
}

/** Contacts added inside a window. `total` is the whole point — page size 1. */
async function contactsSince(locationId: string, gte: string, lt: string | undefined, notes: Notes, what: string): Promise<number | null> {
  try {
    const value: Record<string, string> = { gte, ...(lt ? { lt } : {}) }
    const body = await json(await crmPostRaw('/contacts/search', locationId, {
      locationId, pageLimit: 1,
      filters: [{ field: 'dateAdded', operator: 'range', value }],
    }), notes, what)
    return typeof body?.total === 'number' ? body.total : null
  } catch (e) { notes.push(`${what}: ${(e as Error).message}`); return null }
}

/**
 * Conversations waiting on a human.
 *
 * `status=unread` is the parameter that filters. `unreadOnly=true` reads like
 * the obvious one and is silently IGNORED — it returns the unfiltered page,
 * capped at 200, whose first row has unreadCount 0. A plausible-looking 200 on
 * this card would have been wrong on every account in the product.
 */
async function needsReply(locationId: string, notes: Notes): Promise<number | null> {
  try {
    const body = await json(await crmGet(
      `/conversations/search?locationId=${encodeURIComponent(locationId)}&status=unread&limit=1`, locationId),
      notes, 'needsReply')
    if (body && typeof body.total !== 'number') notes.push('needsReply: no total in body')
    return typeof body?.total === 'number' ? body.total : null
  } catch (e) { notes.push(`needsReply: ${(e as Error).message}`); return null }
}

/** Today's appointments across every calendar the account has. */
async function appointmentsToday(locationId: string, notes: Notes): Promise<{ count: number; nextAt: string | null } | null> {
  try {
    const cals = await json(await crmGet(`/calendars/?locationId=${encodeURIComponent(locationId)}`, locationId), notes, 'calendars')
    const list = (cals?.calendars as { id?: string }[] | undefined) ?? []
    if (!list.length) return { count: 0, nextAt: null }

    const start = new Date(); start.setHours(0, 0, 0, 0)
    const from = start.getTime(), to = from + DAY

    // One calendar that errors must not empty the card — each read resolves to
    // null on its own and the others still count.
    const pages = await Promise.all(list.slice(0, 12).map(async (c) => {
      if (!c.id) return null
      const res = await crmGet(
        `/calendars/events?locationId=${encodeURIComponent(locationId)}&calendarId=${c.id}&startTime=${from}&endTime=${to}`,
        locationId).catch(() => null)
      return json(res, notes, `events:${c.id}`)
    }))

    const events = pages.flatMap((p) => (p?.events as { startTime?: string }[] | undefined) ?? [])
    const now = Date.now()
    const upcoming = events
      .map((e) => e.startTime).filter((t): t is string => Boolean(t))
      .filter((t) => new Date(t).getTime() >= now)
      .sort()
    return { count: events.length, nextAt: upcoming[0] ?? null }
  } catch (e) { notes.push(`appointments: ${(e as Error).message}`); return null }
}

/**
 * Open deals and what they are worth.
 *
 * The value is summed over ONE page of 100. When there are more open deals than
 * that, the response says so and the UI stops claiming a total — a number
 * labelled "deals in play" that quietly means "the first hundred" is the kind
 * of thing someone builds a forecast on.
 */
async function dealsInPlay(locationId: string, notes: Notes): Promise<{ count: number | null; value: number | null; partial: boolean }> {
  try {
    const body = await json(await crmGet(
      `/opportunities/search?location_id=${encodeURIComponent(locationId)}&status=open&limit=100`, locationId),
      notes, 'deals')
    if (!body) return { count: null, value: null, partial: false }
    const rows = (body.opportunities as { monetaryValue?: number | string }[] | undefined) ?? []
    const total = typeof (body.meta as { total?: number })?.total === 'number'
      ? (body.meta as { total: number }).total : rows.length
    const value = rows.reduce((s, o) => s + (Number(o.monetaryValue) || 0), 0)
    return { count: total, value, partial: total > rows.length }
  } catch (e) { notes.push(`deals: ${(e as Error).message}`); return { count: null, value: null, partial: false } }
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

  const now = Date.now()
  const notes: Notes = []
  const [new7, prev7, unread, appts, deals, receiptsRes] = await Promise.all([
    contactsSince(locationId, ISO(now - 7 * DAY), undefined, notes, 'newContacts'),
    contactsSince(locationId, ISO(now - 14 * DAY), ISO(now - 7 * DAY), notes, 'prevContacts'),
    needsReply(locationId, notes),
    appointmentsToday(locationId, notes),
    dealsInPlay(locationId, notes),
    db.from('burst_receipts')
      .select('capability, detail, targets, settled_at')
      .eq('location_id', locationId).eq('status', 'ok')
      .order('settled_at', { ascending: false }).limit(8),
  ])

  // A percentage against a zero baseline is not a percentage — first week of
  // data shows no trend rather than an invented +100%.
  const trend = new7 !== null && prev7 !== null && prev7 > 0
    ? Math.round(((new7 - prev7) / prev7) * 100) : null

  const receipts = receiptsRes.data ?? []
  const activity = receipts.map((r) => {
    const n = Number(r.targets) || 1
    const entry = PLAIN[r.capability as string]
    return {
      // Falls back to the receipt's own sentence, which is already written for
      // a human — never the raw capability id.
      text: entry ? `0n ${entry.say(n)}` : (r.detail as string) || 'did some work in your account',
      icon: entry?.icon ?? 'circle-check',
      at: r.settled_at as string,
    }
  })

  return NextResponse.json({
    account: { locationId, name: conn.location_name },
    stats: {
      newContacts: { value: new7, trendPct: trend },
      needsReply:  { value: unread },
      appointments:{ value: appts?.count ?? null, nextAt: appts?.nextAt ?? null },
      deals:       { value: deals.count, amount: deals.value, partial: deals.partial },
    },
    activity,
    // Diagnostics, not copy. Present only when something could not be read.
    ...(notes.length ? { notes } : {}),
  })
}
