import { createClient } from '@supabase/supabase-js'

/**
 * One log for everything 0nCORE did, across every subsystem.
 *
 * WHY UNIFIED. Debugging currently means knowing that a failed command lives in
 * burst_receipts, an unbilled charge in usage_events, a lost form in
 * widget_leads and a broken collection in idea_runs. Nobody holds that map, so
 * problems get found by accident. One feed, ordered by time, is what turns
 * "something is wrong" into "that, there, at 14:02".
 *
 * EVERY ENTRY ANSWERS THREE THINGS IN PLAIN ENGLISH:
 *   what   — what was attempted, as a person would say it
 *   result — worked / failed / refused / waiting
 *   why    — the reason, if it did not work
 *
 * `why` carries the RAW error alongside the readable one. The readable line is
 * for scanning; the raw line is what actually identifies a bug, and stripping it
 * to keep the UI tidy is how you end up unable to diagnose the thing the log
 * exists for.
 */

export type Result = 'ok' | 'failed' | 'refused' | 'waiting'

export interface LogEntry {
  at: string
  source: 'command' | 'workflow action' | 'billing' | 'form' | 'radar' | 'connection'
  what: string
  result: Result
  why?: string
  raw?: string
  client?: string | null
  ref?: string
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

/** Capability ids are ours; this is how a person would describe them. */
const PLAIN: Record<string, string> = {
  'contact.create': 'Create a contact',
  'contact.update': 'Update a contact',
  'contact.search': 'Search contacts',
  'contact.tag': 'Tag contacts',
  'contact.note': 'Add a note to a contact',
  'sms.send': 'Send an SMS',
  'email.send': 'Send an email',
  'appointment.book': 'Book an appointment',
  'opportunity.move': 'Move a deal',
  'workflow.list': 'List automations',
  'workflow.trigger': 'Start an automation',
  'snapshot.list': 'List snapshots',
  'site.build': 'Build a site',
  'social.schedule': 'Schedule a social post',
  'location.create': 'Create a client account',
  oncore_run_command: 'Workflow step: run a command',
  oncore_ai_draft: 'Workflow step: draft a message',
  oncore_score_route: 'Workflow step: score and route',
  oncore_build_site: 'Workflow step: build a site',
  oncore_schedule_social: 'Workflow step: schedule a post',
}
const plain = (k: string) => PLAIN[k] ?? k.replace(/[._]/g, ' ')

export async function collectLog(companyId: string, limit = 120): Promise<LogEntry[]> {
  const sb = admin()
  const out: LogEntry[] = []

  const [receipts, usage, leads, runs, installs] = await Promise.all([
    sb.from('burst_receipts')
      .select('created_at, capability, status, detail, error, location_name, source, id')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(limit),
    sb.from('usage_events')
      .select('created_at, meter_key, status, error, price_cents, location_id')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(40),
    sb.from('widget_leads')
      .select('created_at, widget_key, status, error, location_id, payload')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(40),
    sb.from('idea_runs')
      .select('started_at, finished_at, boards_ok, boards_failed, posts_new, error')
      .order('started_at', { ascending: false }).limit(6),
    sb.from('crm_installations')
      .select('updated_at, app_id, location_id, status, health_status, last_error')
      .eq('company_id', companyId).order('updated_at', { ascending: false }).limit(15),
  ])

  for (const r of receipts.data ?? []) {
    const result: Result = r.status === 'ok' ? 'ok'
      : r.status === 'failed' ? 'failed'
      : r.status === 'pending' ? 'waiting' : 'refused'
    out.push({
      at: r.created_at,
      source: r.source === 'workflow_action' ? 'workflow action' : 'command',
      what: plain(r.capability),
      result,
      // A 'pending' receipt is the interesting one: the call went out and we
      // never learned the outcome.
      why: result === 'waiting'
        ? 'The call went out and no answer came back — it may or may not have happened.'
        : (r.detail ?? undefined),
      raw: r.error ?? undefined,
      client: r.location_name,
      ref: r.id,
    })
  }

  for (const u of usage.data ?? []) {
    if (u.status === 'posted') continue // charged and fine; not worth log noise
    out.push({
      at: u.created_at,
      source: 'billing',
      what: `Charge for ${plain(u.meter_key)} (${((u.price_cents ?? 0) / 100).toFixed(2)})`,
      result: u.status === 'failed' ? 'failed' : 'waiting',
      why: u.status === 'failed' ? 'The work happened but the charge did not go through.' : 'Charge not settled yet.',
      raw: u.error ?? undefined,
      client: u.location_id,
    })
  }

  for (const l of leads.data ?? []) {
    const p = (l.payload ?? {}) as Record<string, string>
    out.push({
      at: l.created_at,
      source: 'form',
      what: `Form submission from ${p.name || p.email || 'someone'}`,
      result: l.status === 'delivered' ? 'ok' : l.status === 'failed' ? 'failed' : 'waiting',
      why: l.status === 'failed'
        ? 'We captured the lead but could not create the contact — it is saved and can be retried.'
        : undefined,
      raw: l.error ?? undefined,
      client: l.location_id,
    })
  }

  for (const r of runs.data ?? []) {
    const broken = Boolean(r.error) || r.boards_ok === 0
    out.push({
      at: r.started_at,
      source: 'radar',
      what: `Checked ${(r.boards_ok ?? 0) + (r.boards_failed ?? 0)} idea boards`,
      result: broken ? 'failed' : 'ok',
      why: broken
        ? 'The collection returned nothing — treat this as broken, not as no demand.'
        : `${r.boards_ok} read, ${r.posts_new ?? 0} new requests${r.boards_failed ? `, ${r.boards_failed} unreadable` : ''}.`,
      raw: r.error ?? undefined,
    })
  }

  for (const i of installs.data ?? []) {
    if (i.status === 'active' && i.health_status !== 'unhealthy') continue
    out.push({
      at: i.updated_at,
      source: 'connection',
      what: i.location_id ? `Connection to a client account` : 'Agency connection',
      result: 'failed',
      why: i.status === 'expired'
        ? 'The connection expired and could not renew itself — it needs reinstalling.'
        : 'This connection is unhealthy; calls through it are likely failing.',
      raw: i.last_error ?? undefined,
      client: i.location_id || null,
    })
  }

  return out
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}
