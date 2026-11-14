/**
 * 0n3 Pages, from inside the CRM (2026-11-14).
 *
 * The marketplace app's "Build a site" screen keeps every client's pages in 0n3 Pages (the drag-and-drop builder web0n
 * made, hosted by 0n3): one 0n3 project per CRM sub-account, under 0nCore's own 0n3 key (ON3_TOKEN). Clients never need a
 * 0n3 login; the project can be handed to them later by email (Rule 0-SSO).
 *
 * THE SUB-ACCOUNT COMES FROM THE SIGNED SESSION, NEVER FROM THE BROWSER ALONE. A session opened inside a sub-account is
 * pinned to it. An agency-level session may name a sub-account, and it is accepted only when the agency's own location
 * list (read with its agency token, scoped to the session's companyId) contains it.
 *
 * SERVER ONLY: ON3_TOKEN acts as the 0n3 account.
 */
import { getValidAgencyToken } from '@/lib/crm/agency-token'
import type { AppClaims } from '@/lib/auth/app-jwt'

if (typeof window !== 'undefined') throw new Error('lib/crm/on3-pages is server-only.')

const BASE = (process.env.ON3_URL || 'https://0n3.app').replace(/\/$/, '')
const CRM_API = 'https://services.leadconnectorhq.com'

export interface On3Page {
  id: string
  name: string
  title: string
  pages: { id: string; title: string; slug: string }[]
  updatedAt: number | null
  hasScreenshot: boolean
  previewUrl: string
  editUrl: string
  thumbUrl: string
  editExpires: string
}

async function on3<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = String(process.env.ON3_TOKEN || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new Error('0n3 is not connected here (ON3_TOKEN is not set).')
  const r = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers || {}) },
    cache: 'no-store',
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j.error || `0n3 answered ${r.status}`), { status: r.status })
  return j as T
}

/** Which sub-account this request may work on, or a reason it may not. */
export async function resolveLocation(session: AppClaims, requested?: string | null): Promise<{ ok: true; locationId: string; name: string | null } | { ok: false; status: number; error: string }> {
  const want = String(requested || '').trim()
  if (session.activeLocationId) {
    if (want && want !== session.activeLocationId) return { ok: false, status: 403, error: 'You are signed in to a different sub-account.' }
    return { ok: true, locationId: session.activeLocationId, name: null }
  }
  if (!want) return { ok: false, status: 400, error: 'Pick the client this page is for.' }
  const agency = await getValidAgencyToken(session.companyId)
  if (!agency.token) return { ok: false, status: 502, error: 'The agency connection is not available right now. Reconnect the app and try again.' }
  const r = await fetch(`${CRM_API}/locations/search?companyId=${encodeURIComponent(session.companyId)}&limit=500`, {
    headers: { Authorization: `Bearer ${agency.token}`, Version: '2021-07-28', Accept: 'application/json' },
    cache: 'no-store',
  })
  const j = await r.json().catch(() => ({}))
  const hit = ((j.locations ?? []) as { id?: string; _id?: string; name?: string }[]).find((l) => (l.id || l._id) === want)
  if (!hit) return { ok: false, status: 403, error: 'That client is not one of your sub-accounts.' }
  return { ok: true, locationId: want, name: hit.name ?? null }
}

/** The 0n3 project that holds a sub-account's pages, made the first time it is needed. */
export async function projectFor(locationId: string, locationName: string | null): Promise<string> {
  const tag = `CRM · ${locationId}`
  const list = await on3<{ workspaces: { id: string; name: string }[] }>('/api/workspaces')
  const hit = (list.workspaces || []).find((w) => w.name === tag || w.name.startsWith(`${tag} · `))
  if (hit) return hit.id
  const made = await on3<{ workspace: { id: string } }>('/api/workspaces', { method: 'POST', body: JSON.stringify({ name: locationName ? `${tag} · ${locationName}` : tag }) })
  return made.workspace.id
}

export const listPages = (project: string) => on3<{ pages: On3Page[] }>(`/api/workspaces/${project}/pages`).then((j) => j.pages || [])
export const createPage = (project: string, name: string, site: unknown) => on3<{ page: On3Page }>(`/api/workspaces/${project}/pages`, { method: 'POST', body: JSON.stringify({ name, site }) }).then((j) => j.page)
export const getPage = (project: string, id: string) => on3<{ page: On3Page & { site: unknown } }>(`/api/workspaces/${project}/pages/${encodeURIComponent(id)}`).then((j) => j.page)
export const updatePage = (project: string, id: string, site: unknown) => on3<{ page: On3Page }>(`/api/workspaces/${project}/pages/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ site }) }).then((j) => j.page)
export const pageLinks = (project: string, id: string) => on3<{ previewUrl: string; editUrl: string; thumbUrl: string; editExpires: string }>(`/api/workspaces/${project}/pages/${encodeURIComponent(id)}/links`, { method: 'POST' })
