/**
 * /embed/dr/[siteId] — iframe-friendly D&R live traffic dashboard.
 *
 * frame-ancestors * is set in next.config.ts — designed to be embedded
 * inside customers' wp-admin, GHL pages, agency portals, Notion docs.
 * ?compact=1 = smaller WP dashboard widget version.
 *
 * Global chrome (PublicNav, LaunchBanner, GroqBanner, VoiceAI) all
 * exclude /embed paths so the iframe renders clean.
 */

import { drAdmin } from '@/lib/dr/admin'
import { Activity, ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 30

export const metadata = {
  robots: { index: false, follow: false, nocache: true },
}

interface DailyRow {
  date: string
  total_sessions: number
  grade_a: number
  grade_b: number
  grade_c: number
  grade_d: number
  grade_f: number
  grade_x: number
  avg_score: number | null
}

interface DomainRow {
  site_id: string
  domain: string
  display_name: string | null
  status: string | null
  installed_at: string | null
  trial_ends_at: string | null
}

async function loadDashboard(siteId: string) {
  const sb = drAdmin()
  const [domainRes, statsRes, todayRes] = await Promise.all([
    sb.from('dr_domains').select('*').eq('site_id', siteId).maybeSingle(),
    sb
      .from('dr_daily_stats')
      .select('*')
      .eq('site_id', siteId)
      .gte(
        'date',
        new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
      )
      .order('date', { ascending: false })
      .limit(7),
    sb
      .from('dr_daily_stats')
      .select('*')
      .eq('site_id', siteId)
      .eq('date', new Date().toISOString().slice(0, 10))
      .maybeSingle(),
  ])

  const days = (statsRes.data as DailyRow[]) || []
  const today = (todayRes.data as DailyRow | null) || null
  const domain = (domainRes.data as DomainRow | null) || null

  const totals = days.reduce(
    (acc, d) => ({
      sessions: acc.sessions + (d.total_sessions || 0),
      a: acc.a + (d.grade_a || 0),
      b: acc.b + (d.grade_b || 0),
      c: acc.c + (d.grade_c || 0),
      d: acc.d + (d.grade_d || 0),
      f: acc.f + (d.grade_f || 0),
      x: acc.x + (d.grade_x || 0),
    }),
    { sessions: 0, a: 0, b: 0, c: 0, d: 0, f: 0, x: 0 },
  )

  const realPct =
    totals.sessions > 0
      ? Math.round(((totals.a + totals.b + totals.c) / totals.sessions) * 100)
      : 0
  const botPct =
    totals.sessions > 0 ? Math.round((totals.x / totals.sessions) * 100) : 0
  const lowQualityPct =
    totals.sessions > 0
      ? Math.round(((totals.d + totals.f) / totals.sessions) * 100)
      : 0

  return { domain, days, today, totals, realPct, botPct, lowQualityPct }
}

function pct(n: number, total: number): string {
  if (!total) return '0%'
  return `${Math.max(0, (n / total) * 100)}%`
}

export default async function EmbedDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>
  searchParams: Promise<{ compact?: string }>
}) {
  const { siteId } = await params
  const { compact: compactParam } = await searchParams
  const compact = compactParam === '1'

  const data = await loadDashboard(siteId)

  if (compact) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: COMPACT_CSS }} />
        <div className="dr-compact">
          <div className="dr-compact-grid">
            <div className="dr-stat dr-stat-good">
              <div className="dr-stat-num">{data.realPct}%</div>
              <div className="dr-stat-label">Real traffic</div>
            </div>
            <div className="dr-stat">
              <div className="dr-stat-num">{data.totals.sessions.toLocaleString()}</div>
              <div className="dr-stat-label">Sessions (7d)</div>
            </div>
            <div className="dr-stat dr-stat-bad">
              <div className="dr-stat-num">{data.botPct}%</div>
              <div className="dr-stat-label">Bots</div>
            </div>
          </div>
          <div className="dr-bar">
            <span className="dr-bar-a" style={{ width: pct(data.totals.a, data.totals.sessions) }} />
            <span className="dr-bar-b" style={{ width: pct(data.totals.b, data.totals.sessions) }} />
            <span className="dr-bar-c" style={{ width: pct(data.totals.c, data.totals.sessions) }} />
            <span className="dr-bar-d" style={{ width: pct(data.totals.d, data.totals.sessions) }} />
            <span className="dr-bar-f" style={{ width: pct(data.totals.f, data.totals.sessions) }} />
            <span className="dr-bar-x" style={{ width: pct(data.totals.x, data.totals.sessions) }} />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FULL_CSS }} />
      <div className="dr-full">
        <header className="dr-header">
          <div>
            <span className="dr-eyebrow">Detect &amp; Refine</span>
            <h1 className="dr-h1">Live traffic quality</h1>
            {data.domain && (
              <p className="dr-meta">
                {data.domain.display_name || data.domain.domain}
                {data.domain.status && (
                  <span className={`dr-badge dr-badge-${data.domain.status}`}>
                    {data.domain.status}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="dr-updated">
            Updated · {new Date().toLocaleTimeString()}
          </div>
        </header>

        <div className="dr-kpis">
          <div className="dr-kpi dr-kpi-good">
            <ShieldCheck className="dr-kpi-icon" />
            <div className="dr-kpi-label">Real traffic (7d)</div>
            <div className="dr-kpi-value">{data.realPct}%</div>
            <div className="dr-kpi-sub">
              {(data.totals.a + data.totals.b + data.totals.c).toLocaleString()} A/B/C
            </div>
          </div>
          <div className="dr-kpi">
            <Activity className="dr-kpi-icon" />
            <div className="dr-kpi-label">Sessions (7d)</div>
            <div className="dr-kpi-value">{data.totals.sessions.toLocaleString()}</div>
            <div className="dr-kpi-sub">
              {data.today ? `${data.today.total_sessions || 0} today` : '0 today'}
            </div>
          </div>
          <div className="dr-kpi dr-kpi-bad">
            <AlertTriangle className="dr-kpi-icon" />
            <div className="dr-kpi-label">Bots blocked</div>
            <div className="dr-kpi-value">{data.botPct}%</div>
            <div className="dr-kpi-sub">{data.totals.x.toLocaleString()} X-grade</div>
          </div>
          <div className="dr-kpi dr-kpi-warn">
            <TrendingUp className="dr-kpi-icon" />
            <div className="dr-kpi-label">Low quality</div>
            <div className="dr-kpi-value">{data.lowQualityPct}%</div>
            <div className="dr-kpi-sub">D + F grades</div>
          </div>
        </div>

        <section className="dr-distribution">
          <h2 className="dr-h2">Grade distribution · 7-day</h2>
          <div className="dr-bar dr-bar-large">
            <span className="dr-bar-a" style={{ width: pct(data.totals.a, data.totals.sessions) }} />
            <span className="dr-bar-b" style={{ width: pct(data.totals.b, data.totals.sessions) }} />
            <span className="dr-bar-c" style={{ width: pct(data.totals.c, data.totals.sessions) }} />
            <span className="dr-bar-d" style={{ width: pct(data.totals.d, data.totals.sessions) }} />
            <span className="dr-bar-f" style={{ width: pct(data.totals.f, data.totals.sessions) }} />
            <span className="dr-bar-x" style={{ width: pct(data.totals.x, data.totals.sessions) }} />
          </div>
          <div className="dr-legend">
            {(
              [
                ['a', 'A — premium', data.totals.a],
                ['b', 'B — solid', data.totals.b],
                ['c', 'C — average', data.totals.c],
                ['d', 'D — weak', data.totals.d],
                ['f', 'F — junk', data.totals.f],
                ['x', 'X — bot', data.totals.x],
              ] as const
            ).map(([color, label, count]) => {
              const p = data.totals.sessions
                ? Math.round((count / data.totals.sessions) * 100)
                : 0
              return (
                <div key={color as string} className="dr-legend-item">
                  <span className={`dr-legend-dot dr-legend-${color as string}`} />
                  <span className="dr-legend-label">{label}</span>
                  <span className="dr-legend-count">
                    {(count as number).toLocaleString()} · {p}%
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="dr-daily">
          <h2 className="dr-h2">Daily breakdown</h2>
          {data.days.length === 0 ? (
            <p className="dr-empty">No traffic in the last 7 days.</p>
          ) : (
            <table className="dr-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sessions</th>
                  <th>A</th>
                  <th>B</th>
                  <th>C</th>
                  <th>D</th>
                  <th>F</th>
                  <th>X</th>
                </tr>
              </thead>
              <tbody>
                {data.days.map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td>{d.total_sessions.toLocaleString()}</td>
                    <td className="g-a">{d.grade_a}</td>
                    <td className="g-b">{d.grade_b}</td>
                    <td className="g-c">{d.grade_c}</td>
                    <td className="g-d">{d.grade_d}</td>
                    <td className="g-f">{d.grade_f}</td>
                    <td className="g-x">{d.grade_x}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <footer className="dr-footer">
          Powered by{' '}
          <a href="https://wpsxo.com/products/detect-and-refine" target="_blank" rel="noopener noreferrer">
            Detect &amp; Refine
          </a>
          {' '}· refreshes every 30s
        </footer>
      </div>
    </>
  )
}

const COMPACT_CSS = `
  .dr-compact{margin:0;padding:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#f0f4f8;min-height:100vh}
  .dr-compact-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px}
  .dr-stat{padding:10px;border-radius:8px;background:#161b22;border:1px solid #30363d;text-align:center}
  .dr-stat-good{border-color:rgba(16,185,129,0.4)}
  .dr-stat-bad{border-color:rgba(239,68,68,0.4)}
  .dr-stat-num{font-size:24px;font-weight:800}
  .dr-stat-good .dr-stat-num{color:#10b981}
  .dr-stat-bad .dr-stat-num{color:#ef4444}
  .dr-stat-label{font-size:11px;color:#8b95a5;margin-top:2px;text-transform:uppercase;letter-spacing:.05em}
  .dr-bar{display:flex;height:10px;border-radius:5px;overflow:hidden;background:#161b22}
  .dr-bar span{display:block;height:100%}
  .dr-bar-a{background:#10b981}
  .dr-bar-b{background:#84cc16}
  .dr-bar-c{background:#facc15}
  .dr-bar-d{background:#fb923c}
  .dr-bar-f{background:#ef4444}
  .dr-bar-x{background:#71717a}
`

const FULL_CSS = `
  .dr-full{margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#f0f4f8;font-size:14px;line-height:1.5;min-height:100vh}
  .dr-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;gap:24px;flex-wrap:wrap}
  .dr-h1{margin:4px 0 6px;font-size:24px;font-weight:800}
  .dr-h2{margin:0 0 12px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#8b95a5}
  .dr-eyebrow{font-size:11px;font-weight:700;color:#6EE05A;text-transform:uppercase;letter-spacing:.1em}
  .dr-meta{margin:0;color:#8b95a5;font-size:13px}
  .dr-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;margin-left:6px;background:#1c2333;border:1px solid #30363d;color:#8b95a5;text-transform:lowercase}
  .dr-badge-active,.dr-badge-verified{color:#10b981;border-color:rgba(16,185,129,0.4)}
  .dr-badge-trial{color:#facc15;border-color:rgba(250,204,21,0.4)}
  .dr-updated{font-size:12px;color:#8b95a5;font-family:ui-monospace,Menlo,monospace}
  .dr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
  @media (max-width:720px){.dr-kpis{grid-template-columns:repeat(2,1fr)}}
  .dr-kpi{padding:14px;border-radius:10px;background:#161b22;border:1px solid #30363d;position:relative}
  .dr-kpi-good{border-color:rgba(16,185,129,0.4)}
  .dr-kpi-bad{border-color:rgba(239,68,68,0.4)}
  .dr-kpi-warn{border-color:rgba(250,204,21,0.4)}
  .dr-kpi-icon{position:absolute;right:12px;top:12px;color:#8b95a5;width:16px;height:16px}
  .dr-kpi-good .dr-kpi-icon{color:#10b981}
  .dr-kpi-bad .dr-kpi-icon{color:#ef4444}
  .dr-kpi-warn .dr-kpi-icon{color:#facc15}
  .dr-kpi-label{font-size:11px;color:#8b95a5;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
  .dr-kpi-value{font-size:28px;font-weight:800;line-height:1}
  .dr-kpi-good .dr-kpi-value{color:#10b981}
  .dr-kpi-bad .dr-kpi-value{color:#ef4444}
  .dr-kpi-warn .dr-kpi-value{color:#facc15}
  .dr-kpi-sub{font-size:11px;color:#8b95a5;margin-top:4px}
  .dr-distribution{margin-bottom:24px}
  .dr-bar{display:flex;border-radius:6px;overflow:hidden;background:#161b22;border:1px solid #30363d}
  .dr-bar-large{height:14px;margin-bottom:14px}
  .dr-bar span{display:block;height:100%}
  .dr-bar-a{background:#10b981}
  .dr-bar-b{background:#84cc16}
  .dr-bar-c{background:#facc15}
  .dr-bar-d{background:#fb923c}
  .dr-bar-f{background:#ef4444}
  .dr-bar-x{background:#71717a}
  .dr-legend{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px}
  @media (max-width:720px){.dr-legend{grid-template-columns:repeat(2,1fr)}}
  .dr-legend-item{display:flex;align-items:center;gap:6px}
  .dr-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .dr-legend-a{background:#10b981}
  .dr-legend-b{background:#84cc16}
  .dr-legend-c{background:#facc15}
  .dr-legend-d{background:#fb923c}
  .dr-legend-f{background:#ef4444}
  .dr-legend-x{background:#71717a}
  .dr-legend-label{flex:1;color:#f0f4f8}
  .dr-legend-count{color:#8b95a5;font-family:ui-monospace,Menlo,monospace;font-size:11px}
  .dr-table{width:100%;border-collapse:collapse;font-size:12px}
  .dr-table th,.dr-table td{padding:8px 6px;text-align:right;border-bottom:1px solid #30363d}
  .dr-table th{color:#8b95a5;text-transform:uppercase;font-size:10px;letter-spacing:.05em;font-weight:700}
  .dr-table th:first-child,.dr-table td:first-child{text-align:left}
  .dr-table .g-a{color:#10b981}
  .dr-table .g-b{color:#84cc16}
  .dr-table .g-c{color:#facc15}
  .dr-table .g-d{color:#fb923c}
  .dr-table .g-f{color:#ef4444}
  .dr-table .g-x{color:#71717a}
  .dr-empty{color:#8b95a5;font-style:italic}
  .dr-footer{margin-top:24px;padding-top:14px;border-top:1px solid #30363d;color:#8b95a5;font-size:11px;text-align:center}
  .dr-footer a{color:#6EE05A;text-decoration:none}
  .dr-footer a:hover{text-decoration:underline}
`
