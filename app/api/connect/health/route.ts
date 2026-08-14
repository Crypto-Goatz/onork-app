/**
 * GET /api/connect/health — is every connection actually working, right now?
 *
 * NOT A STATUS FIELD. `location_connections.status = 'active'` records what was
 * true when the row was written; this calls the CRM with each key and reports
 * what is true now. Those are different questions, and every credential failure
 * this week was the gap between them — a row saying connected while the key
 * behind it had stopped answering.
 *
 * SEQUENTIAL, AND CAPPED. Ten locations firing at once against keys that share a
 * rate limit produce 429s that read as auth failures, which is the exact
 * confusion this endpoint exists to remove.
 *
 * ONE CHEAP CALL PER CONNECTION. `/contacts/?limit=1` is the lightest read that
 * still proves the key is accepted and scoped. A heavier probe would be slower
 * and prove nothing more.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'
import { crmGet } from '@/lib/crm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_CHECKED = 12

type Verdict = 'ok' | 'unauthorized' | 'scope' | 'unreachable' | 'no-key'

interface Row {
  locationId: string
  name: string
  isFree: boolean
  verdict: Verdict
  status: number
  /** Plain words. The agency reads this, not a stack trace. */
  message: string
}

function explain(status: number, body: string): { verdict: Verdict; message: string } {
  if (status === 0) return { verdict: 'unreachable', message: 'No response from the CRM.' }
  if (status === 401 && /scope/i.test(body)) {
    return { verdict: 'scope', message: 'The key works but is missing a permission this needs.' }
  }
  if (status === 401 || status === 403) {
    return { verdict: 'unauthorized', message: 'The key was rejected — it was probably rotated or revoked.' }
  }
  if (status >= 500) return { verdict: 'unreachable', message: 'The CRM returned a server error.' }
  return { verdict: 'ok', message: 'Answering normally.' }
}

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  const { data: conns } = await db
    .from('location_connections')
    .select('location_id, location_name, is_free, location_pit')
    .eq('company_id', session.claims.companyId)
    .eq('status', 'active')
    .limit(MAX_CHECKED)

  const rows: Row[] = []

  for (const c of conns ?? []) {
    const base = {
      locationId: c.location_id as string,
      name: (c.location_name as string) || (c.location_id as string),
      isFree: Boolean(c.is_free),
    }

    if (!c.location_pit) {
      rows.push({ ...base, verdict: 'no-key', status: 0, message: 'No key saved for this client yet.' })
      continue
    }

    try {
      const res = await crmGet(`/contacts/?locationId=${encodeURIComponent(base.locationId)}&limit=1`, base.locationId)
      const body = res.ok ? '' : await res.text().catch(() => '')
      const { verdict, message } = explain(res.status, body)
      rows.push({ ...base, verdict, status: res.status, message })
    } catch {
      rows.push({ ...base, verdict: 'unreachable', status: 0, message: 'Could not reach the CRM.' })
    }

    await new Promise((r) => setTimeout(r, 200))
  }

  const broken = rows.filter((r) => r.verdict !== 'ok')

  return NextResponse.json({
    healthy: broken.length === 0,
    checked: rows.length,
    brokenCount: broken.length,
    // The headline the modal shows. Singular/plural handled here so the UI
    // never assembles a sentence badly.
    headline: broken.length === 0
      ? 'All connections healthy'
      : `${broken.length} connection${broken.length === 1 ? '' : 's'} need${broken.length === 1 ? 's' : ''} attention`,
    connections: rows,
  })
}
