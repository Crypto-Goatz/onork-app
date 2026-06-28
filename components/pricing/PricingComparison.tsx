import { Fragment } from 'react'
import { Check, Minus } from 'lucide-react'
import { TIERS } from '@/lib/pricing'

// Detailed feature matrix — grouped rows × 5 tiers. Cell = true (✓) | false (—) | string.
// Column order matches TIERS: free, starter, pro, agency, enterprise.
type Cell = boolean | string
type Row = { feat: string; cells: [Cell, Cell, Cell, Cell, Cell] }
type Group = { label: string; rows: Row[] }

const GROUPS: Group[] = [
  {
    label: 'Usage & limits',
    rows: [
      { feat: 'Tool executions / month', cells: ['100', '2,000', '15,000', 'Unlimited', 'Unlimited'] },
      { feat: 'Connected services', cells: ['1', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
      { feat: 'Active automations', cells: [false, '10', 'Unlimited', 'Unlimited', 'Unlimited'] },
      { feat: 'Sub-accounts', cells: [false, false, false, '10', 'Unlimited'] },
    ],
  },
  {
    label: 'Build & automate',
    rows: [
      { feat: 'Full tool catalog — 1,640+ tools, 109 services', cells: [true, true, true, true, true] },
      { feat: 'Visual workflow builder', cells: [false, true, true, true, true] },
      { feat: 'Switches — save & replay any run', cells: [false, true, true, true, true] },
      { feat: 'Agentic Automation Generator', cells: [false, false, true, true, true] },
      { feat: 'CRO9 conversion engine', cells: [false, false, true, true, true] },
    ],
  },
  {
    label: 'AI',
    rows: [
      { feat: 'Jaxx AI assistant', cells: ['Read-only', 'Executes', 'Executes', 'Executes', 'Executes'] },
      { feat: 'CrewAI agent crews', cells: [false, false, true, true, true] },
      { feat: 'Commerce + Stripe checkout in chat', cells: [false, false, true, true, true] },
    ],
  },
  {
    label: 'Growth tools',
    rows: [
      { feat: 'Course Builder', cells: [false, false, true, true, true] },
      { feat: 'Lead Magnet Loop', cells: [false, false, true, true, true] },
      { feat: 'App Factory + Website Factory', cells: [false, false, false, true, true] },
      { feat: 'SaaS Factory', cells: [false, false, false, true, true] },
    ],
  },
  {
    label: 'Agency & scale',
    rows: [
      { feat: 'White-label dashboard', cells: [false, false, false, true, true] },
      { feat: 'Bulk snapshot deploy', cells: [false, false, false, true, true] },
      { feat: 'Client course management + revenue share', cells: [false, false, false, true, true] },
      { feat: 'Custom MCP servers + private registry', cells: [false, false, false, false, true] },
      { feat: 'SSO / SAML', cells: [false, false, false, false, true] },
      { feat: 'Dedicated infra (single-tenant)', cells: [false, false, false, false, true] },
      { feat: 'Audit log export + SOC 2 path', cells: [false, false, false, false, true] },
      { feat: '99.9% uptime SLA', cells: [false, false, false, false, true] },
    ],
  },
  {
    label: 'Support',
    rows: [
      { feat: 'Support', cells: ['Community', 'Email', 'Priority', 'Dedicated Slack', 'Named CSM'] },
    ],
  },
]

function CellValue({ value, accent }: { value: Cell; accent: boolean }) {
  if (value === true)
    return <Check className="mx-auto h-4 w-4" style={{ color: accent ? '#7ed957' : '#9ca3af' }} />
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-white/20" />
  return <span className="text-xs font-medium text-white/80">{value}</span>
}

export default function PricingComparison() {
  const cols = TIERS // free, starter, pro, agency, enterprise
  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-[#020810]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.05] blur-[140px]"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-4 inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/65">
            Full comparison
          </span>
          <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              Every feature, every tier.
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.015] backdrop-blur">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="sticky left-0 z-10 bg-[#020810] px-5 py-5 align-bottom">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">Feature</span>
                </th>
                {cols.map((t) => (
                  <th
                    key={t.slug}
                    className={`px-4 py-5 text-center align-bottom ${t.highlight ? 'bg-[#7ed957]/[0.06]' : ''}`}
                  >
                    <div className="text-sm font-black tracking-tight text-white">{t.name}</div>
                    <div className="mt-0.5 flex items-baseline justify-center gap-0.5">
                      <span
                        className={
                          t.highlight
                            ? 'bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-lg font-black text-transparent'
                            : 'text-lg font-black text-white/85'
                        }
                      >
                        {t.price}
                      </span>
                      {t.cadence && t.cadence.startsWith('/') && (
                        <span className="text-[10px] text-white/45">/mo</span>
                      )}
                    </div>
                    {t.highlight && (
                      <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#7ed957]">
                        Popular
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g) => (
                <Fragment key={g.label}>
                  <tr className="bg-white/[0.02]">
                    <td
                      colSpan={6}
                      className="sticky left-0 px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]/80"
                    >
                      {g.label}
                    </td>
                  </tr>
                  {g.rows.map((row) => (
                    <tr key={row.feat} className="border-t border-white/[0.06] transition-colors hover:bg-white/[0.02]">
                      <td className="sticky left-0 z-10 bg-[#020810] px-5 py-3 text-sm text-white/70">{row.feat}</td>
                      {row.cells.map((c, i) => (
                        <td
                          key={i}
                          className={`px-4 py-3 text-center ${cols[i]?.highlight ? 'bg-[#7ed957]/[0.04]' : ''}`}
                        >
                          <CellValue value={c} accent={!!cols[i]?.highlight} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
