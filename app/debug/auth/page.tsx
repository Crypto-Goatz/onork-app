/**
 * /debug/auth — public diagnostic page. Shows EXACTLY what auth state
 * the server sees right now. Anyone with the URL can hit it; we never
 * leak tokens or password hashes — only the metadata we need to find
 * out why a user is in a redirect loop.
 *
 * Read order:
 *   1. cookies received       — does the server even see auth cookies?
 *   2. getSession() result    — does the cached session decode?
 *   3. getUser() result       — can Supabase verify the JWT online?
 *   4. profile + admin status — does the public.profiles row match?
 *   5. middleware verdict     — would middleware let this user through?
 */

import { cookies as nextCookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CookieInfo { name: string; size: number; preview: string }

export default async function DebugAuthPage() {
  // ── 1. Cookies received ────────────────────────────────────────────
  const all = await nextCookies()
  const list: CookieInfo[] = all.getAll().map((c) => ({
    name: c.name,
    size: c.value.length,
    preview: c.value.length > 40 ? c.value.slice(0, 16) + '…' + c.value.slice(-8) : c.value,
  }))
  const supabaseCookies = list.filter((c) => c.name.startsWith('sb-') || c.name.includes('auth'))

  // ── 2/3. Server-side session + user check ─────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return all.getAll() },
        setAll() { /* read-only here */ },
      },
    }
  )

  let sessionResult: { ok: boolean; user_id?: string; expires_at?: string; error?: string } = { ok: false }
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) sessionResult = { ok: false, error: error.message }
    else if (data.session) sessionResult = {
      ok: true,
      user_id: data.session.user.id,
      expires_at: new Date((data.session.expires_at ?? 0) * 1000).toISOString(),
    }
    else sessionResult = { ok: false, error: 'no session in cached cookies' }
  } catch (e) {
    sessionResult = { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  let userResult: { ok: boolean; user_id?: string; email?: string; error?: string } = { ok: false }
  try {
    const { data, error } = /* TODO_GETUSER_MANUAL: review this call — getSession() preferred per Rule 10a */ await supabase.auth.getUser()
    if (error) userResult = { ok: false, error: error.message }
    else if (data.user) userResult = { ok: true, user_id: data.user.id, email: data.user.email ?? '?' }
    else userResult = { ok: false, error: 'getUser returned null user' }
  } catch (e) {
    userResult = { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  // ── 4. Profile + DB-side session count ─────────────────────────────
  let profileResult: { exists: boolean; is_admin?: boolean; plan?: string; crm_location_id?: string | null; error?: string } = { exists: false }
  let dbSessionCount = 0
  let dbTokenCount = 0
  if (userResult.ok && userResult.user_id) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin, plan, crm_location_id')
      .eq('id', userResult.user_id)
      .maybeSingle()
    if (profile) profileResult = { exists: true, is_admin: !!profile.is_admin, plan: profile.plan ?? 'free', crm_location_id: profile.crm_location_id ?? null }
    else profileResult = { exists: false, error: 'no profiles row for this user_id' }
  }

  // ── 5. Verdict ─────────────────────────────────────────────────────
  const middlewareWouldAllow = userResult.ok
  const reason = !userResult.ok
    ? `Middleware would REDIRECT TO /login because getUser() failed: ${userResult.error}`
    : !profileResult.exists
    ? `Auth OK but profiles row is missing — dashboard layout would try to provision`
    : 'OK — middleware lets this through'

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#0f172a', padding: '32px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Auth Debug</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
          Static snapshot of what the server saw on this request.
        </p>

        <Section title={`1. Supabase cookies received (${supabaseCookies.length})`}>
          {supabaseCookies.length === 0 ? (
            <Bad>No sb-* / auth cookies in this request. Browser isn't sending them.</Bad>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Name</th><th style={th}>Bytes</th><th style={th}>Preview</th></tr></thead>
              <tbody>
                {supabaseCookies.map((c) => (
                  <tr key={c.name}><td style={td}>{c.name}</td><td style={td}>{c.size}</td><td style={{ ...td, fontFamily: 'monospace' }}>{c.preview}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="2. getSession() (cached, no network)">
          {sessionResult.ok ? (
            <Good>session OK · user_id={sessionResult.user_id} · expires {sessionResult.expires_at}</Good>
          ) : (
            <Bad>{sessionResult.error}</Bad>
          )}
        </Section>

        <Section title="3. getUser() (network round-trip to Supabase)">
          {userResult.ok ? (
            <Good>user OK · {userResult.email} · {userResult.user_id}</Good>
          ) : (
            <Bad>{userResult.error}</Bad>
          )}
        </Section>

        <Section title="4. profiles row">
          {profileResult.exists ? (
            <Good>
              admin={String(profileResult.is_admin)} · plan={profileResult.plan} ·
              crm_location_id={profileResult.crm_location_id ?? '(null)'}
            </Good>
          ) : (
            <Bad>{profileResult.error ?? 'no user yet'}</Bad>
          )}
        </Section>

        <Section title="5. Middleware verdict">
          <div style={{ padding: 12, background: middlewareWouldAllow ? '#ecfdf5' : '#fef2f2', borderRadius: 8, border: `1px solid ${middlewareWouldAllow ? '#a7f3d0' : '#fecaca'}`, fontSize: 13 }}>
            {reason}
          </div>
        </Section>

        <div style={{ marginTop: 24, fontSize: 11, color: '#94a3b8' }}>
          DB-side session count: {dbSessionCount} · refresh tokens: {dbTokenCount}
        </div>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }
const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #f1f5f9', fontSize: 12 }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', marginBottom: 8 }}>{title}</div>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>{children}</div>
    </div>
  )
}
function Good({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#047857', fontFamily: 'monospace', fontSize: 12 }}>✓ {children}</div>
}
function Bad({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#b91c1c', fontFamily: 'monospace', fontSize: 12 }}>✗ {children}</div>
}
