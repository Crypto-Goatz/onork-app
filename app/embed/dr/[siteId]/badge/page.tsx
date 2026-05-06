/**
 * /embed/dr/[siteId]/badge — small social-proof badge.
 * "94% real traffic — graded by Detect & Refine"
 */

import { drAdmin } from '@/lib/dr/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export const metadata = {
  robots: { index: false, follow: false, nocache: true },
}

interface Stats {
  total_sessions: number
  grade_a: number
  grade_b: number
  grade_c: number
  grade_d: number
  grade_f: number
  grade_x: number
}

async function loadRealPct(siteId: string): Promise<number> {
  const sb = drAdmin()
  const { data } = await sb
    .from('dr_daily_stats')
    .select('total_sessions, grade_a, grade_b, grade_c, grade_d, grade_f, grade_x')
    .eq('site_id', siteId)
    .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
  const rows = (data as Stats[]) || []
  const totals = rows.reduce(
    (acc, r) => ({
      sessions: acc.sessions + (r.total_sessions || 0),
      good: acc.good + (r.grade_a || 0) + (r.grade_b || 0) + (r.grade_c || 0),
    }),
    { sessions: 0, good: 0 },
  )
  return totals.sessions > 0
    ? Math.round((totals.good / totals.sessions) * 100)
    : 0
}

export default async function BadgePage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>
  searchParams: Promise<{ theme?: string }>
}) {
  const { siteId } = await params
  const { theme } = await searchParams
  const isLight = theme === 'light'
  const realPct = await loadRealPct(siteId)

  const bg = isLight ? '#ffffff' : '#0d1117'
  const fg = isLight ? '#0d1117' : '#f0f4f8'
  const accent = '#10b981'
  const border = isLight ? '#e5e7eb' : '#30363d'

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .dr-badge-wrap{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:${bg};color:${fg};display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid ${border};border-radius:18px;font-size:12px;width:max-content;line-height:1}
            .dr-badge-pct{font-weight:800;color:${accent};font-size:13px}
            .dr-badge-link{color:${fg};text-decoration:none}
            .dr-badge-link:hover{text-decoration:underline}
            .dr-badge-dot{width:6px;height:6px;border-radius:50%;background:${accent};display:inline-block}
          `,
        }}
      />
      <div className="dr-badge-wrap">
        <span className="dr-badge-dot" />
        <span>
          <span className="dr-badge-pct">{realPct}%</span> real traffic
        </span>
        <span style={{ opacity: 0.5 }}>·</span>
        <a
          className="dr-badge-link"
          href="https://wpsxo.com/products/detect-and-refine"
          target="_blank"
          rel="noopener noreferrer"
        >
          Detect &amp; Refine
        </a>
      </div>
    </>
  )
}
