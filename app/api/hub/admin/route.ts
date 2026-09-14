/**
 * /api/hub/admin — the ecosystem in cards, measured at request time.
 *
 * GET  → one payload, one card per system. Every number is counted in this
 *        request or returned as null with the reason. Nothing here is cached
 *        and nothing is remembered from a previous run, so the page cannot
 *        show a confident stale figure (the dispatch failure, law #6).
 * POST → { action } runs an operator action through the route that already
 *        owns it (the cron, the CRO9 endpoint, the sheet helper). No second
 *        implementation of anything.
 *
 * Owner-only. Anyone else gets the same 404 a missing route would give.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOwner } from '@/lib/owner'
import { probe } from '@/lib/hub/probe'
import { NODES } from '@/lib/ecosystem/graph'
import vercelConfig from '@/vercel.json'
import { issueAppJwt } from '@/lib/auth/app-jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Status = 'ok' | 'warn' | 'crit' | 'unmeasured'
type Metric = { label: string; value: number | string | null; note?: string; kind?: 'crit' | 'warn' | 'ok' | 'muted' }
type Action = { id: string; label: string; danger?: boolean; needs?: 'locationId' }
export type Card = { id: string; title: string; subtitle: string; status: Status; headline: string | null; metrics: Metric[]; notes: string[]; actions: Action[]; href?: string }

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()
const DAY = 86_400_000
const fmtUsd = (cents: number, cur = 'usd') => `${cur.toUpperCase() === 'USD' ? '$' : cur.toUpperCase() + ' '}${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const ago = (isoStr: string | null | undefined) => {
  if (!isoStr) return null
  const m = Math.round((Date.now() - new Date(isoStr).getTime()) / 60_000)
  if (m < 60) return `${m} min ago`
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`
  return `${Math.round(m / (60 * 24))} d ago`
}

async function jsonFetch(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<{ ok: boolean; status: number; body: Record<string, unknown> | null; text: string }> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal, cache: 'no-store' })
    const text = await r.text()
    let body: Record<string, unknown> | null = null
    try { body = JSON.parse(text) } catch { /* not JSON */ }
    return { ok: r.ok, status: r.status, body, text }
  } finally {
    clearTimeout(timer)
  }
}

/** Exact count with the database's own words on failure. */
async function count(client: NonNullable<ReturnType<typeof db>>, table: string, build?: (q: any) => any): Promise<number | null> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let q = client.from(table).select('id', { count: 'exact', head: true })
  if (build) q = build(q)
  const { count: c, error } = await q
  if (error) throw new Error(`${table}: ${error.message}`)
  return c ?? null
}

// ── cards ──────────────────────────────────────────────────────────────────

async function surfacesCard(): Promise<Card> {
  const targets = NODES.filter((n) => n.healthUrl)
  const results = await Promise.all(targets.map((n) => probe(n.healthUrl!)))
  const metrics: Metric[] = targets.map((n, i) => {
    const r = results[i]
    const host = n.healthUrl!.replace(/^https?:\/\//, '')
    return { label: host, value: r.status === null ? 'no answer' : `${r.status} · ${r.ms} ms`, kind: r.ok ? 'ok' : 'crit', note: r.note }
  })
  const down = results.filter((r) => !r.ok).length
  return {
    id: 'surfaces', title: 'Surfaces', subtitle: 'Every public host, probed now',
    status: down === 0 ? 'ok' : down < results.length ? 'warn' : 'crit',
    headline: `${results.length - down} of ${results.length} answering`, metrics, notes: [], actions: [{ id: 'refresh', label: 'Probe again' }],
    href: '/hub/ecosystem',
  }
}

async function on3Card(): Promise<Card> {
  const notes: string[] = []
  const metrics: Metric[] = []
  let status: Status = 'ok'
  let headline: string | null = null
  try {
    const r = await jsonFetch('https://0n3.app/api/handler')
    const j = (r.body || {}) as { version?: string; tools?: number; crmTools?: number; services?: number; status?: string }
    if (!r.ok || typeof j.tools !== 'number') { status = 'crit'; notes.push(`0n3 answered ${r.status} without a tool count.`) }
    headline = j.version ? `v${j.version} · ${j.tools ?? '?'} tools` : null
    metrics.push({ label: 'Catalog services', value: j.services ?? null }, { label: 'CRM tools', value: j.crmTools ?? null })
  } catch (e) { status = 'crit'; notes.push(`0n3 did not answer: ${e instanceof Error ? e.message : String(e)}`) }

  try {
    const r = await jsonFetch('https://registry.npmjs.org/0nmcp', { headers: { accept: 'application/json' } })
    const latest = ((r.body?.['dist-tags'] as Record<string, string> | undefined) || {}).latest
    const live = headline?.match(/v([\d.]+)/)?.[1]
    metrics.push({ label: 'npm 0nmcp latest', value: latest ?? null, kind: latest && live && latest !== live ? 'warn' : 'ok', note: latest && live && latest !== live ? `0n3.app runs ${live}; publish is pending (npm login).` : undefined })
    if (latest && live && latest !== live && status === 'ok') status = 'warn'
  } catch (e) { notes.push(`npm registry: ${e instanceof Error ? e.message : String(e)}`) }

  const client = db()
  if (!client) notes.push('Database client unavailable — vault counts unknown, not zero.')
  else {
    try {
      const [records, uses, scoped, accts] = await Promise.all([
        count(client, 'vault_records', (q) => q.neq('status', 'revoked')),
        count(client, 'vault_audit', (q) => q.gte('at', iso(DAY)).neq('action', 'put')),
        count(client, 'access_tokens', (q) => q.eq('is_active', true)),
        client.from('vault_records').select('account_id').neq('status', 'revoked').limit(5000),
      ])
      const accounts = new Set((accts.data || []).map((r: { account_id: string }) => r.account_id)).size
      metrics.push({ label: 'Vault records', value: records }, { label: 'Accounts with a vault', value: accounts }, { label: 'Vault uses · 24 h', value: uses }, { label: 'Scoped tokens active', value: scoped })
    } catch (e) { notes.push(e instanceof Error ? e.message : String(e)) }
  }
  return { id: 'on3', title: '0n3 runtime', subtitle: 'The core: identity, vault, tools', status, headline, metrics, notes, actions: [{ id: 'refresh', label: 'Re-measure' }], href: 'https://0n3.app' }
}

async function identityCard(): Promise<Card> {
  const client = db()
  const notes: string[] = []
  const metrics: Metric[] = []
  let status: Status = 'ok'
  if (!client) return { id: 'identity', title: 'Accounts & contacts', subtitle: '0nCore accounts and their CRM contacts', status: 'unmeasured', headline: null, metrics, notes: ['Database client unavailable.'], actions: [] }
  try {
    const skipTests = (q: any) => q.not('email', 'ilike', '%+test%').not('email', 'ilike', '%e2e%').not('email', 'ilike', '%@example.%') // eslint-disable-line @typescript-eslint/no-explicit-any
    const [total, synced, canary, new24, new7, provisioned, provErr, pipelineFailed] = await Promise.all([
      count(client, 'profiles'),
      count(client, 'profiles', (q) => q.not('crm_contact_id', 'is', null)),
      count(client, 'profiles', (q) => skipTests(q).is('crm_contact_id', null).lt('created_at', iso(3_600_000))),
      count(client, 'profiles', (q) => q.gte('created_at', iso(DAY))),
      count(client, 'profiles', (q) => q.gte('created_at', iso(7 * DAY))),
      count(client, 'profiles', (q) => q.not('crm_location_id', 'is', null)),
      count(client, 'profiles', (q) => q.not('provisioning_error', 'is', null).is('provisioned_at', null)),
      count(client, 'provision_pipeline', (q) => q.eq('status', 'failed')),
    ])
    const unsynced = total !== null && synced !== null ? total - synced : null
    metrics.push(
      { label: 'Accounts', value: total },
      { label: 'With a CRM contact', value: synced },
      { label: 'Still to sync', value: unsynced, kind: unsynced ? 'warn' : 'ok', note: unsynced ? 'The drain runs every 10 minutes, 25 at a time, untagged.' : undefined },
      { label: 'Unsynced > 1 h (canary)', value: canary, kind: canary ? 'warn' : 'ok' },
      { label: 'Signups · 24 h / 7 d', value: `${new24 ?? '?'} / ${new7 ?? '?'}` },
      { label: 'With a sub-location', value: provisioned },
      { label: 'Provisioning errors', value: provErr, kind: provErr ? 'crit' : 'ok' },
      { label: 'Pipeline rows failed', value: pipelineFailed, kind: pipelineFailed ? 'warn' : 'ok' },
    )
    if (provErr) status = 'crit'
    else if (canary) status = 'warn'
    return { id: 'identity', title: 'Accounts & contacts', subtitle: '0nCore accounts and their CRM contacts', status, headline: total !== null && synced !== null ? `${synced} of ${total} in the CRM` : null, metrics, notes, actions: [{ id: 'sync_contacts', label: 'Run the drain now' }, { id: 'provision_repair', label: 'Run provisioning repair' }] }
  } catch (e) {
    return { id: 'identity', title: 'Accounts & contacts', subtitle: '0nCore accounts and their CRM contacts', status: 'unmeasured', headline: null, metrics, notes: [e instanceof Error ? e.message : String(e)], actions: [] }
  }
}

async function crmCard(): Promise<Card> {
  const client = db()
  const notes: string[] = []
  const metrics: Metric[] = []
  let status: Status = 'ok'
  let headline: string | null = null
  const pit = process.env.CRM_AGENCY_PIT_NEW || process.env.CRM_AGENCY_PIT || ''
  const companyId = process.env.CRM_COMPANY_ID || ''
  if (pit && companyId) {
    try {
      const r = await jsonFetch(`https://services.leadconnectorhq.com/locations/search?companyId=${encodeURIComponent(companyId)}&limit=200`, { headers: { Authorization: `Bearer ${pit}`, Version: '2021-07-28', accept: 'application/json' } })
      const locs = (r.body?.locations as unknown[] | undefined) || []
      if (!r.ok) { status = 'crit'; notes.push(`Agency token rejected: ${r.status} ${r.text.slice(0, 120)}`) }
      else { headline = `${locs.length}${locs.length >= 200 ? '+' : ''} sub-accounts`; if (locs.length >= 200) notes.push('Search capped at 200 — the true count is higher.') }
    } catch (e) { status = 'warn'; notes.push(`CRM did not answer: ${e instanceof Error ? e.message : String(e)}`) }
  } else notes.push('No agency token on this project — sub-account count not measured.')

  if (client) {
    try {
      const [installs, healthy, unhealthy, expiring] = await Promise.all([
        count(client, 'crm_installations'),
        count(client, 'crm_installations', (q) => q.eq('health_status', 'healthy')),
        count(client, 'crm_installations', (q) => q.gt('consecutive_failures', 0)),
        count(client, 'crm_installations', (q) => q.lt('expires_at', iso(-DAY)).eq('status', 'active')),
      ])
      metrics.push({ label: 'Installs recorded', value: installs }, { label: 'Healthy', value: healthy }, { label: 'Failing', value: unhealthy, kind: unhealthy ? 'warn' : 'ok' }, { label: 'Tokens expiring < 24 h', value: expiring, kind: expiring ? 'warn' : 'ok', note: 'refresh-tokens runs every 6 h' })
      if (unhealthy && status === 'ok') status = 'warn'
    } catch (e) { notes.push(e instanceof Error ? e.message : String(e)) }
  }
  return { id: 'crm', title: 'CRM', subtitle: 'Agency, sub-accounts, installs, tokens', status, headline, metrics, notes, actions: [{ id: 'refresh', label: 'Re-measure' }], href: '/admin' }
}

async function cro9Card(): Promise<Card> {
  const key = process.env.CRO9_ADMIN_KEY
  const base = (process.env.CRO9_URL || 'https://www.cro9.com').replace(/\/$/, '')
  if (!key) return { id: 'cro9', title: 'CRO9', subtitle: 'Sites, sheets, briefs, copy', status: 'unmeasured', headline: null, metrics: [], notes: ['CRO9_ADMIN_KEY is not set here, so CRO9 cannot be asked.'], actions: [] }
  try {
    const r = await jsonFetch(`${base}/api/admin/overview`, { headers: { 'x-cro9-admin': key } }, 12_000)
    if (!r.ok || !r.body) return { id: 'cro9', title: 'CRO9', subtitle: 'Sites, sheets, briefs, copy', status: 'unmeasured', headline: null, metrics: [], notes: [`CRO9 answered ${r.status}: ${r.text.slice(0, 160)}`], actions: [] }
    const j = r.body as { sites?: number | null; users?: number | null; sheets?: Record<string, number | string | null>; briefs?: Record<string, number | string | null>; scans24h?: number | null; notes?: string[] }
    const s = j.sheets || {}; const b = j.briefs || {}
    const metrics: Metric[] = [
      { label: 'Sites', value: j.sites ?? null }, { label: 'Accounts', value: j.users ?? null },
      { label: 'Sheets', value: s.total ?? null }, { label: 'Sheets linked to a location', value: s.linkedToLocation ?? null, kind: (s.total ?? 0) && s.linkedToLocation !== s.total ? 'warn' : 'ok', note: 'Only locations provisioned since 2026-09-14 are linked.' },
      { label: 'Sheets with the engine bound', value: s.engineBound ?? null, kind: s.engineBound !== s.total ? 'warn' : 'ok' },
      { label: 'Last sheet push', value: ago(s.lastPushAt as string | null) ?? 'never', kind: s.lastPushAt ? 'ok' : 'warn' },
      { label: 'Briefs pending', value: b.pending ?? null }, { label: 'Pending with no copy', value: b.pendingWithoutCopy ?? null, kind: b.pendingWithoutCopy ? 'warn' : 'ok', note: 'The writer is the missing piece: the sheet holds the directive, the copy cell is empty.' },
      { label: 'Copy written · 24 h', value: b.generated24h ?? null }, { label: 'Published · 7 d', value: b.published7d ?? null }, { label: 'Last publish', value: ago(b.lastPublishedAt as string | null) ?? 'never' },
      { label: 'Scans · 24 h', value: j.scans24h ?? null },
    ]
    const status: Status = Number(b.pendingWithoutCopy ?? 0) > 0 ? 'warn' : 'ok'
    return { id: 'cro9', title: 'CRO9', subtitle: 'Sites, sheets, briefs, copy', status, headline: `${j.sites ?? '?'} sites · ${s.total ?? '?'} sheets`, metrics, notes: j.notes || [], actions: [{ id: 'cro9_generate', label: 'Run the copy generator' }, { id: 'cro9_sheet', label: 'Create sheet for a location', needs: 'locationId' }], href: 'https://www.cro9.com' }
  } catch (e) {
    return { id: 'cro9', title: 'CRO9', subtitle: 'Sites, sheets, briefs, copy', status: 'unmeasured', headline: null, metrics: [], notes: [`CRO9 did not answer: ${e instanceof Error ? e.message : String(e)}`], actions: [] }
  }
}

async function ontaskCard(): Promise<Card> {
  const client = db()
  const [health] = await Promise.all([probe('https://app.0ntask.com/api/health')])
  const metrics: Metric[] = [{ label: 'app.0ntask.com', value: health.status === null ? 'no answer' : `${health.status} · ${health.ms} ms`, kind: health.ok ? 'ok' : 'crit' }]
  const notes: string[] = []
  let status: Status = health.ok ? 'ok' : 'crit'
  let headline: string | null = null
  if (client) {
    try {
      const [ents, active, founders, tasksPending, tasksDone7, tasksFailed7, leads7] = await Promise.all([
        count(client, 'ontask_entitlements', (q) => q.select('email', { count: 'exact', head: true })),
        count(client, 'ontask_entitlements', (q) => q.select('email', { count: 'exact', head: true }).in('status', ['active', 'lifetime', 'trialing'])),
        count(client, 'ontask_entitlements', (q) => q.select('email', { count: 'exact', head: true }).eq('founder', true)),
        count(client, 'ontask_agent_tasks', (q) => q.in('status', ['pending', 'queued', 'running'])),
        count(client, 'ontask_agent_tasks', (q) => q.eq('status', 'done').gte('updated_at', iso(7 * DAY))),
        count(client, 'ontask_agent_tasks', (q) => q.eq('status', 'failed').gte('updated_at', iso(7 * DAY))),
        count(client, 'ontask_leads', (q) => q.gte('created_at', iso(7 * DAY))),
      ])
      headline = `${active ?? '?'} entitled · ${founders ?? '?'} founder${founders === 1 ? '' : 's'}`
      metrics.push({ label: 'Entitlements', value: ents }, { label: 'Active or lifetime', value: active }, { label: 'Founders', value: founders }, { label: 'AI tasks in flight', value: tasksPending, kind: tasksPending ? 'warn' : 'ok' }, { label: 'AI tasks done · 7 d', value: tasksDone7 }, { label: 'AI tasks failed · 7 d', value: tasksFailed7, kind: tasksFailed7 ? 'warn' : 'ok' }, { label: 'Leads · 7 d', value: leads7 })
      if (tasksFailed7 && status === 'ok') status = 'warn'
    } catch (e) { notes.push(e instanceof Error ? e.message : String(e)) }
  }
  return { id: 'ontask', title: '0nTask', subtitle: 'The first app on 0n3', status, headline, metrics, notes, actions: [{ id: 'refresh', label: 'Re-measure' }], href: 'https://app.0ntask.com' }
}

async function stripeCard(): Promise<Card> {
  const key = process.env.STRIPE_SECRET_KEY
  const metrics: Metric[] = []
  const notes: string[] = []
  if (!key) return { id: 'stripe', title: 'Stripe', subtitle: 'RocketOpp LLC, one account, every brand', status: 'unmeasured', headline: null, metrics, notes: ['STRIPE_SECRET_KEY is not set here.'], actions: [] }
  const h = { Authorization: `Bearer ${key}` }
  let status: Status = 'ok'
  let headline: string | null = null
  try {
    const since = Math.floor((Date.now() - 7 * DAY) / 1000)
    const [bal, charges, subs] = await Promise.all([
      jsonFetch('https://api.stripe.com/v1/balance', { headers: h }),
      jsonFetch(`https://api.stripe.com/v1/charges?limit=100&created[gte]=${since}`, { headers: h }),
      jsonFetch('https://api.stripe.com/v1/subscriptions?status=active&limit=100', { headers: h }),
    ])
    if (!bal.ok) { status = 'crit'; notes.push(`Stripe rejected the key: ${bal.status}`) }
    else {
      const avail = ((bal.body?.available as Array<{ amount: number; currency: string }>) || [])
      const pend = ((bal.body?.pending as Array<{ amount: number; currency: string }>) || [])
      const a = avail[0]; const p = pend[0]
      headline = a ? `${fmtUsd(a.amount, a.currency)} available` : null
      if (p) metrics.push({ label: 'Pending', value: fmtUsd(p.amount, p.currency) })
      metrics.push({ label: 'Live mode', value: bal.body?.livemode === true ? 'yes' : 'no', kind: bal.body?.livemode === true ? 'ok' : 'warn' })
    }
    if (charges.ok) {
      const list = (charges.body?.data as Array<{ amount: number; currency: string; status: string; refunded: boolean }>) || []
      const okList = list.filter((c) => c.status === 'succeeded' && !c.refunded)
      const sum = okList.reduce((s, c) => s + c.amount, 0)
      metrics.push({ label: 'Charges succeeded · 7 d', value: okList.length }, { label: 'Volume · 7 d', value: fmtUsd(sum, okList[0]?.currency || 'usd'), note: charges.body?.has_more ? 'More than 100 charges this week; total is a floor.' : undefined })
    } else notes.push(`charges: ${charges.status}`)
    if (subs.ok) {
      const list = (subs.body?.data as unknown[]) || []
      metrics.push({ label: 'Active subscriptions', value: `${list.length}${subs.body?.has_more ? '+' : ''}` })
    } else notes.push(`subscriptions: ${subs.status}`)
    const client = db()
    if (client) {
      const { data } = await client.from('stripe_webhook_logs').select('event_type, created_at').order('created_at', { ascending: false }).limit(1)
      const last = data?.[0]
      metrics.push({ label: 'Last webhook', value: last ? `${last.event_type} · ${ago(last.created_at)}` : 'none logged', kind: last ? 'ok' : 'warn' })
    }
  } catch (e) { status = 'warn'; notes.push(e instanceof Error ? e.message : String(e)) }
  return { id: 'stripe', title: 'Stripe', subtitle: 'RocketOpp LLC, one account, every brand', status, headline, metrics, notes, actions: [{ id: 'refresh', label: 'Re-measure' }], href: 'https://dashboard.stripe.com' }
}

async function dataCard(): Promise<Card> {
  const hosts: Array<[string, string]> = [
    ['pwu · 0nCore + 0nmcp.com', 'https://pwujhhmlrtxjmjzyttwn.supabase.co/auth/v1/health'],
    ['rtw · Rocket+ / CRO9', 'https://rtwtaisjtvdajrdyivkn.supabase.co/auth/v1/health'],
    ['grf · 0nTask studio', 'https://grfjpophcwfsfnwculiu.supabase.co/auth/v1/health'],
    ['wsu · SXO website', 'https://wsuifaedzwyorhjqzlot.supabase.co/auth/v1/health'],
  ]
  const results = await Promise.all(hosts.map(([, u]) => probe(u)))
  const metrics: Metric[] = hosts.map(([label], i) => ({ label, value: results[i].status === null ? 'no answer' : `${results[i].status} · ${results[i].ms} ms`, kind: results[i].ok ? 'ok' : 'crit' }))
  const down = results.filter((r) => !r.ok).length
  return { id: 'data', title: 'Databases', subtitle: 'Every Supabase project the estate binds to', status: down ? 'crit' : 'ok', headline: `${results.length - down} of ${results.length} up`, metrics, notes: ['RLS: 39 pwu tables locked on 2026-09-14; advisor shows 0 errors, 7 warnings (auth-config items).'], actions: [{ id: 'refresh', label: 'Probe again' }] }
}

function jobsCard(): Card {
  const crons = ((vercelConfig as { crons?: Array<{ path: string; schedule: string }> }).crons || [])
  const metrics: Metric[] = crons.map((c) => ({ label: c.path.replace('/api/cron/', '').replace('/api/', ''), value: c.schedule, kind: 'muted' }))
  return { id: 'jobs', title: 'Scheduled jobs', subtitle: `${crons.length} crons on 0nCore, from vercel.json`, status: 'unmeasured', headline: `${crons.length} scheduled`, metrics, notes: ['Last-run times are not recorded anywhere yet, so this card shows the schedule, not proof of execution. Run one from here to see its receipt.'], actions: [{ id: 'sync_contacts', label: 'sync-contacts now' }, { id: 'provision_repair', label: 'provision-repair now' }] }
}

function deploysCard(): Card {
  return { id: 'deploys', title: 'Deploys', subtitle: 'Latest production build per project', status: 'unmeasured', headline: null, metrics: [
    { label: 'onork-app · 0nmcp-website · 0n-marketplace', value: 'GitHub Action on push to main', kind: 'muted' },
    { label: '0ntask · 0ntask-studio · cro9', value: 'Vercel git integration', kind: 'muted' },
    { label: '0n3', value: 'API deploy by SHA (git author unlinked)', kind: 'muted' },
  ], notes: ['Not measured: this project holds no Vercel API token. Add VERCEL_API_TOKEN (read-only) as a plain env var and this card lights up with the latest SHA and state per project.'], actions: [] }
}


/**
 * The two audits that already exist behind the in-app JWT (env-audit,
 * deprecation-check). The owner holds a Supabase session, not an app JWT, so a
 * 60-second owner JWT is minted here and the routes are read as they are —
 * no second implementation of either audit.
 */
async function auditCards(origin: string): Promise<Card[]> {
  const out: Card[] = []
  let token = ''
  try { token = issueAppJwt({ sub: 'owner', companyId: process.env.CRM_COMPANY_ID || '', role: 'owner', email: 'owner' }, 60) }
  catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    return [
      { id: 'env', title: 'Credentials', subtitle: 'Is every secret the shape it should be', status: 'unmeasured', headline: null, metrics: [], notes: [why], actions: [] },
      { id: 'deprecation', title: 'CRM deprecation exposure', subtitle: 'Anything still leaning on a removed endpoint', status: 'unmeasured', headline: null, metrics: [], notes: [why], actions: [] },
    ]
  }
  const h = { Authorization: `Bearer ${token}` }
  try {
    const r = await jsonFetch(`${origin}/api/admin/env-audit`, { headers: h }, 15_000)
    const j = (r.body || {}) as { checked?: number; healthy?: boolean; envelopes?: string[]; wrongShape?: Array<{ key: string }>; consistency?: unknown[] }
    const env = j.envelopes || []; const wrong = j.wrongShape || []; const cons = j.consistency || []
    out.push(r.ok ? {
      id: 'env', title: 'Credentials', subtitle: 'Is every secret the shape it should be', status: j.healthy ? 'ok' : 'crit', headline: `${j.checked ?? '?'} checked`,
      metrics: [
        { label: 'Stored as an encryption envelope', value: env.length, kind: env.length ? 'crit' : 'ok', note: env.join(', ') || undefined },
        { label: 'Wrong shape', value: wrong.length, kind: wrong.length ? 'crit' : 'ok', note: wrong.map((w) => w.key).join(', ') || undefined },
        { label: 'Consistency issues', value: cons.length, kind: cons.length ? 'warn' : 'ok' },
      ],
      notes: [...env.map((k) => `${k} is a Vercel envelope, not a secret — re-save it as plain.`), ...wrong.map((w) => `${w.key} has the wrong shape.`)], actions: [],
    } : { id: 'env', title: 'Credentials', subtitle: 'Is every secret the shape it should be', status: 'unmeasured', headline: null, metrics: [], notes: [`env-audit answered ${r.status}: ${r.text.slice(0, 120)}`], actions: [] })
  } catch (e) { out.push({ id: 'env', title: 'Credentials', subtitle: '', status: 'unmeasured', headline: null, metrics: [], notes: [e instanceof Error ? e.message : String(e)], actions: [] }) }
  try {
    const r = await jsonFetch(`${origin}/api/admin/deprecation-check`, { headers: h }, 20_000)
    const j = (r.body || {}) as { healthy?: boolean; fallback?: { armed?: boolean; mintDisposition?: string | { allowed?: boolean; reason?: string; detail?: string }; locationsKnown?: number; onPastedKey?: number; onInstall?: number; connectedOnMint?: unknown[] } }
    const f = j.fallback || {}
    // mintDisposition is an object {allowed, reason, detail}; a metric value must be text.
    const mint = typeof f.mintDisposition === 'object' && f.mintDisposition ? `${f.mintDisposition.allowed ? 'allowed' : 'blocked'}${f.mintDisposition.reason ? ' · ' + f.mintDisposition.reason : ''}` : (f.mintDisposition ?? null)
    const onMint = Array.isArray(f.connectedOnMint) ? f.connectedOnMint.length : null
    out.push(r.ok ? {
      id: 'deprecation', title: 'CRM deprecation exposure', subtitle: 'Anything still leaning on a removed endpoint', status: j.healthy ? 'ok' : 'warn', headline: onMint === null ? null : `${onMint} connected on the mint`,
      metrics: [{ label: 'Fallback armed', value: f.armed ? 'yes' : 'no' }, { label: 'Mint disposition', value: mint }, { label: 'Locations known', value: f.locationsKnown ?? null }, { label: 'On a pasted key', value: f.onPastedKey ?? null }, { label: 'On an install', value: f.onInstall ?? null }, { label: 'Connected on the mint', value: onMint, kind: onMint ? 'warn' : 'ok' }],
      notes: [], actions: [],
    } : { id: 'deprecation', title: 'CRM deprecation exposure', subtitle: 'Anything still leaning on a removed endpoint', status: 'unmeasured', headline: null, metrics: [], notes: [`deprecation-check answered ${r.status}: ${r.text.slice(0, 120)}`], actions: [] })
  } catch (e) { out.push({ id: 'deprecation', title: 'CRM deprecation exposure', subtitle: '', status: 'unmeasured', headline: null, metrics: [], notes: [e instanceof Error ? e.message : String(e)], actions: [] }) }
  return out
}

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await isOwner())) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const started = Date.now()
  const origin = new URL(req.url).origin
  const settled = await Promise.allSettled([surfacesCard(), on3Card(), identityCard(), crmCard(), cro9Card(), ontaskCard(), stripeCard(), dataCard(), auditCards(origin)])
  const cards: Card[] = settled.flatMap((s, i) => s.status === 'fulfilled' ? s.value : [{ id: `card${i}`, title: 'Card failed', subtitle: '', status: 'unmeasured' as Status, headline: null, metrics: [], notes: [String((s as PromiseRejectedResult).reason)], actions: [] }])
  cards.push(jobsCard(), deploysCard())
  return NextResponse.json({ measuredAt: new Date().toISOString(), tookMs: Date.now() - started, cards })
}

// ── POST: operator actions, each through the route that already owns it ────

export async function POST(req: NextRequest) {
  if (!(await isOwner())) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = (await req.json().catch(() => ({}))) as { action?: string; locationId?: string; email?: string; domain?: string }
  // The host this request arrived on — never the apex, which 308s and drops a bearer.
  const self = new URL(req.url).origin
  const cron = process.env.CRON_SECRET || ''
  try {
    switch (body.action) {
      case 'sync_contacts': {
        const r = await jsonFetch(`${self}/api/cron/sync-contacts?limit=25`, { headers: { Authorization: `Bearer ${cron}` } }, 55_000)
        return NextResponse.json({ ok: r.ok, receipt: r.body ?? r.text.slice(0, 500) }, { status: r.ok ? 200 : 502 })
      }
      case 'provision_repair': {
        const r = await jsonFetch(`${self}/api/cron/provision-repair`, { headers: { Authorization: `Bearer ${cron}` } }, 55_000)
        return NextResponse.json({ ok: r.ok, receipt: r.body ?? r.text.slice(0, 500) }, { status: r.ok ? 200 : 502 })
      }
      case 'cro9_generate': {
        const key = process.env.CRO9_ADMIN_KEY || ''
        const base = (process.env.CRO9_URL || 'https://www.cro9.com').replace(/\/$/, '')
        const r = await jsonFetch(`${base}/api/cron/cro9-content?limit=3`, { headers: { 'x-cro9-admin': key } }, 55_000)
        return NextResponse.json({ ok: r.ok, receipt: r.body ?? r.text.slice(0, 500) }, { status: r.ok ? 200 : 502 })
      }
      case 'cro9_sheet': {
        const locationId = String(body.locationId || '').trim()
        if (!locationId) return NextResponse.json({ ok: false, error: 'locationId is required' }, { status: 400 })
        const client = db()
        const { data: prof } = client ? await client.from('profiles').select('id, email, full_name, website').eq('crm_location_id', locationId).order('created_at', { ascending: true }).limit(1).maybeSingle() : { data: null }
        const email = String(body.email || prof?.email || '').trim().toLowerCase()
        const website = String(body.domain || prof?.website || '').trim()
        if (!email) return NextResponse.json({ ok: false, error: `No 0nCore account owns location ${locationId}; pass email and domain.` }, { status: 400 })
        const { ensureCro9Sheet } = await import('@/lib/cro9/sheet')
        const o = await ensureCro9Sheet({ userId: prof?.id || null, email, fullName: prof?.full_name || null, locationId, website, source: 'admin-panel' })
        return NextResponse.json({ ok: o.status !== 'failed', receipt: o }, { status: o.status === 'failed' ? 502 : 200 })
      }
      case 'refresh':
        return NextResponse.json({ ok: true })
      default:
        return NextResponse.json({ ok: false, error: `Unknown action ${body.action}` }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
