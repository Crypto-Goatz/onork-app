/**
 * Admin → Signups. Every signup, whether it synced to the CRM, whether it was
 * tagged "signed-up", and whether the conversion was tracked. Service-role read.
 */

import { createClient } from '@supabase/supabase-js'
import { looksLikeTestAccount } from '@/lib/test-accounts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Was an inline copy of this regex. It is the BROAD, display-only predicate —
// see lib/test-accounts.ts for why the narrow one exists separately and why
// this one must never gate a side effect.
const isTest = looksLikeTestAccount

// PostgrestError puts the CAUSE in `details`/`hint`, never in `.cause` — a
// repair that prints only `.message` throws away the half that names the table.
function why(e: { message?: string; details?: string; hint?: string; code?: string } | null) {
  return [e?.code, e?.message, e?.details, e?.hint].filter(Boolean).join(' · ') || 'unknown error'
}

export default async function SignupsPage() {
  const sb = admin()
  const { data: profiles, error: profilesError } = await sb
    .from('profiles')
    .select('id, email, full_name, created_at, crm_contact_id, crm_location_id, provisioned_at, provisioning_error')
    .order('created_at', { ascending: false })
    .limit(200)

  // A dropped `error` here is not a missing log line, it is a PUBLISHED
  // FALSEHOOD: `profiles || []` renders "0 real signups · 0 synced to CRM" —
  // the exact page that exists to prove signups reached the CRM would be at its
  // most alarming at the moment it can see nothing at all. Read failure and
  // "nobody signed up" must never render as the same screen.
  if (profilesError) {
    return (
      <div style={{ padding: 32, color: '#f0f4f8', background: '#0d1117', minHeight: '100vh' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Signups</h1>
        <p style={{ color: '#ef4444', fontSize: 14 }}>
          Could not read signups — this is a READ FAILURE, not zero signups.
        </p>
        <pre style={{ color: '#fbbf24', fontSize: 12, whiteSpace: 'pre-wrap', marginTop: 12 }}>{why(profilesError)}</pre>
      </div>
    )
  }

  const ids = (profiles || []).map((p) => p.id)
  const sessionIds = ids.map((id) => `signup:${id}`)
  const { data: conversions, error: conversionsError } = sessionIds.length
    ? await sb.from('cro9_events').select('session_id').eq('event_type', 'conversion').in('session_id', sessionIds)
    : { data: [] as { session_id: string }[], error: null }
  // Same defect, smaller blast radius: a failed conversions read must not be
  // rendered as "0 conversions tracked". The signup rows are still true, so the
  // page stays up and the conversion column says it could not be measured.
  const converted = new Set((conversions || []).map((c) => (c.session_id || '').replace('signup:', '')))

  const rows = (profiles || []).map((p) => ({ ...p, real: !isTest(p.email || ''), tracked: converted.has(p.id) }))
  const real = rows.filter((r) => r.real)
  const synced = real.filter((r) => r.crm_contact_id).length
  const trackedCount = real.filter((r) => r.tracked).length

  const cell = 'px-3 py-2 text-sm'
  const Pill = ({ ok, t, f }: { ok: boolean; t: string; f: string }) => (
    <span style={{ color: ok ? '#6EE05A' : '#ef4444' }}>{ok ? t : f}</span>
  )

  return (
    <div style={{ padding: 32, color: '#f0f4f8', background: '#0d1117', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Signups</h1>
      <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>
        {real.length} real signups · {synced} synced to CRM ·{' '}
        {conversionsError ? 'conversions UNMEASURED' : `${trackedCount} conversions tracked`} · (test accounts hidden from totals)
      </p>
      {conversionsError && (
        <p style={{ color: '#fbbf24', fontSize: 12, marginTop: -12, marginBottom: 20 }}>
          conversion read failed — the Conversion column below is unknown, not &ldquo;none&rdquo;: {why(conversionsError)}
        </p>
      )}
      <div style={{ overflowX: 'auto', border: '1px solid #1f2937', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#161b22', textAlign: 'left', color: '#9ca3af', fontSize: 12 }}>
              <th className={cell}>Email</th><th className={cell}>Joined</th>
              <th className={cell}>CRM contact</th><th className={cell}>Location</th>
              <th className={cell}>Provisioned</th><th className={cell}>Conversion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #1f2937', opacity: r.real ? 1 : 0.4 }}>
                <td className={cell}>
                  {r.email}{!r.real && <span style={{ color: '#6b7280', fontSize: 11 }}> · test</span>}
                </td>
                <td className={cell} style={{ color: '#9ca3af' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                <td className={cell}><Pill ok={!!r.crm_contact_id} t="synced" f="missing" /></td>
                <td className={cell} style={{ color: '#9ca3af' }}>{r.crm_location_id ? 'yes' : '—'}</td>
                <td className={cell}>{r.provisioning_error ? <span style={{ color: '#fbbf24' }}>error</span> : (r.provisioned_at ? <span style={{ color: '#6EE05A' }}>yes</span> : <span style={{ color: '#6b7280' }}>pending</span>)}</td>
                <td className={cell}>
                  {conversionsError
                    ? <span style={{ color: '#fbbf24' }}>unknown</span>
                    : <Pill ok={r.tracked} t="tracked" f="—" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
