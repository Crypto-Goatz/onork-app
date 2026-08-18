/**
 * GET /api/hub/ecosystem — the live overlay for the Ecosystem map.
 *
 * The map's STRUCTURE is written down (lib/ecosystem/graph.ts) because this app
 * cannot read the machine where the repos live. Everything that can be measured
 * at request time is measured here instead and drawn on top, so the page
 * corrects itself instead of drifting.
 *
 * WHY THAT DISTINCTION IS THE WHOLE POINT. `/api/dispatch/ecosystem` is the
 * existing inventory and it still serves entries last written 2026-06-17 — a
 * snapshot that looks current, names 28 things against a codebase of roughly
 * twice that, and carries no indication it is stale. A diagram that cannot tell
 * you when it was last true is worse than no diagram, because it gets shown to
 * people. Every number returned below is either measured in this request or
 * absent, and every measurement carries its own failure mode.
 *
 * OWNER ONLY. This exposes internal architecture, health and row counts.
 *
 * NOTHING HERE THROWS. A probe that cannot answer returns `null` with a reason,
 * never 0 — reporting "0 live installs" because a query failed would be the
 * same class of lie as the appointments card that told someone their day was
 * clear on the strength of a failed request.
 */
import { NextResponse } from 'next/server'
import { isOwner } from '@/lib/owner'
import { NODES } from '@/lib/ecosystem/graph'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Probe budget. A map that hangs is a map nobody opens twice. */
const TIMEOUT_MS = 6000

async function probe(url: string): Promise<{ ok: boolean; status: number | null; ms: number; note?: string }> {
  const started = Date.now()
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    // GET, not HEAD: several of these hosts answer HEAD with 405 while serving
    // GET perfectly well, which would paint a healthy surface as broken.
    // `redirect: manual` so an apex→www 308 is reported as the redirect it is
    // rather than silently following — that redirect has already cost this
    // project an entire broken sign-in flow.
    const res = await fetch(url, { signal: ctl.signal, redirect: 'manual', headers: { 'user-agent': '0n-ecosystem-probe' } })
    return {
      ok: res.status < 400 || (res.status >= 300 && res.status < 400),
      status: res.status,
      ms: Date.now() - started,
      note: res.status >= 300 && res.status < 400 ? `redirects → ${res.headers.get('location') || 'elsewhere'}` : undefined,
    }
  } catch (e) {
    return { ok: false, status: null, ms: Date.now() - started, note: (e as Error).name === 'AbortError' ? `no answer in ${TIMEOUT_MS / 1000}s` : 'unreachable' }
  } finally {
    clearTimeout(timer)
  }
}

export async function GET() {
  if (!(await isOwner())) {
    // Deliberately indistinguishable from a route that does not exist.
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const targets = NODES.filter((n) => n.healthUrl)
  const health: Record<string, Awaited<ReturnType<typeof probe>>> = {}
  const results = await Promise.all(targets.map((n) => probe(n.healthUrl!)))
  targets.forEach((n, i) => { health[n.id] = results[i] })

  // ── Live counts, each with its own honest failure ────────────────────
  const db = createServiceClient()
  const metrics: Record<string, { value: number | null; label: string; note?: string }> = {}

  if (!db) {
    metrics.storage = { value: null, label: 'Database', note: 'Storage client unavailable — every count below is unknown, not zero.' }
  } else {
    try {
      // coalesce, not `is not null`: 27 of these rows hold an EMPTY STRING
      // refresh token. Counting them as present is how this table was
      // misread once already.
      const { data: installs } = await db
        .from('crm_installations')
        .select('expires_at, refresh_token, health_status')
        .limit(1000)
      if (installs) {
        const now = Date.now()
        const live = installs.filter((r) => r.expires_at && new Date(r.expires_at).getTime() > now).length
        const recoverable = installs.filter((r) => (r.refresh_token || '') !== '' && r.health_status !== 'revoked').length
        metrics.installsTotal = { value: installs.length, label: 'CRM installs on file' }
        metrics.installsLive = { value: live, label: 'Holding a live token' }
        metrics.installsRecoverable = { value: recoverable, label: 'Recoverable by refresh' }
        metrics.installsNeedReinstall = {
          value: installs.length - recoverable,
          label: 'Need a reinstall',
          note: 'No refresh token, or an authorization the CRM has revoked. Retrying cannot move this number.',
        }
      }
    } catch (e) {
      metrics.installsTotal = { value: null, label: 'CRM installs on file', note: `Query failed: ${(e as Error).message}` }
    }

    try {
      const { count } = await db.from('profiles').select('id', { count: 'exact', head: true })
      metrics.profiles = { value: count ?? null, label: 'Accounts' }
    } catch {
      metrics.profiles = { value: null, label: 'Accounts', note: 'Query failed.' }
    }

    try {
      const { count } = await db.from('api_tokens').select('id', { count: 'exact', head: true }).eq('revoked', false)
      metrics.tokens = { value: count ?? null, label: 'Live 0n keys' }
    } catch {
      metrics.tokens = { value: null, label: 'Live 0n keys', note: 'Query failed.' }
    }
  }

  const reachable = Object.values(health).filter((h) => h.ok).length

  return NextResponse.json({
    measuredAt: new Date().toISOString(),
    health,
    metrics,
    summary: {
      surfacesProbed: targets.length,
      surfacesReachable: reachable,
      // Said out loud rather than left to be inferred by comparing two numbers.
      allReachable: reachable === targets.length,
    },
    // The bridge runs on Mike's machine and this app is on Vercel, so its state
    // genuinely cannot be probed from here. Saying so beats rendering a stale
    // "connected" badge that nothing checks.
    notProbed: [
      { id: 'bridge', why: 'Runs on the local machine. This server has no access to it — status shown is structural, not measured.' },
    ],
  })
}
