/**
 * /api/admin/crm — generic CRM proxy for the /admin surface.
 *
 * Body: { action: string, locationId: string, params?: Record<string, unknown> }
 *
 * Resolves the PIT server-side via lib/admin-locations.getAdminPit() so the
 * raw token never ships to the browser.
 */

import { NextResponse } from 'next/server'
import { getAdminPit } from '@/lib/admin-locations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

type Action =
  | 'ping'
  | 'getLocation'
  | 'getTags'
  | 'createTag'
  | 'searchContacts'
  | 'createContact'
  | 'getCustomFields'
  | 'createCustomField'
  | 'getWorkflows'
  | 'createTriggerLink'
  | 'createEmailTemplate'

interface Body {
  action: Action
  locationId: string
  params?: Record<string, unknown>
}

async function crmFetch(
  path: string,
  init: RequestInit,
  pit: string,
): Promise<Response> {
  return fetch(`${CRM_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${pit}`,
      Version: CRM_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
  })
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const { action, locationId, params = {} } = body
  if (!action || !locationId) {
    return NextResponse.json({ ok: false, error: 'missing_action_or_location' }, { status: 400 })
  }

  const pit = getAdminPit(locationId)
  if (!pit) {
    return NextResponse.json({ ok: false, error: 'unknown_location' }, { status: 400 })
  }

  try {
    let res: Response
    let data: unknown

    switch (action) {
      case 'ping':
      case 'getLocation': {
        res = await crmFetch(`/locations/${locationId}`, { method: 'GET' }, pit)
        data = await safeJson(res)
        return NextResponse.json({ ok: res.ok, status: res.status, data })
      }

      case 'getTags': {
        res = await crmFetch(`/locations/${locationId}/tags`, { method: 'GET' }, pit)
        data = await safeJson(res)
        return NextResponse.json({ ok: res.ok, status: res.status, data })
      }

      case 'createTag': {
        const name = String(params.name || '').trim()
        if (!name) return NextResponse.json({ ok: false, error: 'missing_name' }, { status: 400 })
        res = await crmFetch(`/locations/${locationId}/tags`, {
          method: 'POST',
          body: JSON.stringify({ name }),
        }, pit)
        data = await safeJson(res)
        return NextResponse.json({ ok: res.ok, status: res.status, data })
      }

      case 'searchContacts': {
        const query = String(params.query || '')
        const limit = Number(params.limit ?? 25)
        const url = `/contacts/search/duplicate?locationId=${encodeURIComponent(locationId)}&query=${encodeURIComponent(query)}&limit=${limit}`
        // The duplicate endpoint is broad; if it 404s for empty queries fall back to /contacts
        res = await crmFetch(url, { method: 'GET' }, pit)
        if (!res.ok) {
          // Fallback: list contacts paged by query
          const listUrl = `/contacts?locationId=${encodeURIComponent(locationId)}&query=${encodeURIComponent(query)}&limit=${limit}`
          res = await crmFetch(listUrl, { method: 'GET' }, pit)
        }
        data = await safeJson(res)
        return NextResponse.json({ ok: res.ok, status: res.status, data })
      }

      case 'createContact': {
        res = await crmFetch(`/contacts/`, {
          method: 'POST',
          body: JSON.stringify({ ...params, locationId }),
        }, pit)
        data = await safeJson(res)
        return NextResponse.json({ ok: res.ok, status: res.status, data })
      }

      case 'getCustomFields': {
        res = await crmFetch(`/locations/${locationId}/customFields`, { method: 'GET' }, pit)
        data = await safeJson(res)
        return NextResponse.json({ ok: res.ok, status: res.status, data })
      }

      case 'createCustomField': {
        res = await crmFetch(`/locations/${locationId}/customFields`, {
          method: 'POST',
          body: JSON.stringify(params),
        }, pit)
        data = await safeJson(res)
        return NextResponse.json({ ok: res.ok, status: res.status, data })
      }

      case 'getWorkflows': {
        res = await crmFetch(`/workflows/?locationId=${encodeURIComponent(locationId)}`, { method: 'GET' }, pit)
        data = await safeJson(res)
        return NextResponse.json({ ok: res.ok, status: res.status, data })
      }

      case 'createTriggerLink': {
        res = await crmFetch(`/links/`, {
          method: 'POST',
          body: JSON.stringify({ ...params, locationId }),
        }, pit)
        data = await safeJson(res)
        return NextResponse.json({ ok: res.ok, status: res.status, data })
      }

      case 'createEmailTemplate': {
        res = await crmFetch(`/emails/builder`, {
          method: 'POST',
          body: JSON.stringify({ ...params, locationId }),
        }, pit)
        data = await safeJson(res)
        return NextResponse.json({ ok: res.ok, status: res.status, data })
      }

      default:
        return NextResponse.json({ ok: false, error: `unknown_action:${action}` }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown_error' },
      { status: 500 },
    )
  }
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return { raw: text } }
}
