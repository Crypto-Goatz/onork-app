import { getScanStats, LEAD_VALUE, ROCKETOPP_LOCATION } from '@/lib/scan/stats'

export const dynamic = 'force-dynamic'

/**
 * The daily website-buyer scan, as a board you can put on a wall.
 *
 * WHY IT IS LIVE RATHER THAN A DIAGRAM. A picture of a process stops being true
 * the first day the process changes, and everyone learns to ignore it. The
 * counts here come from the CRM itself — the same contacts and tags the scan
 * writes — so the board is either right or visibly broken, never quietly stale.
 *
 * Rendered server-side with no client JS so it works inside a CRM iframe, where
 * a custom menu link points, without needing SSO or a session.
 *
 * The phase copy is the playbook, kept deliberately concrete: a VA should be
 * able to run the scan from this screen alone.
 */

const PHASES = [
  {
    n: '01',
    title: 'Discovery',
    lead: 'Two hunting modes, rotated daily.',
    detail: [
      'Free-builder dorks — site:wixsite.com, weebly.com, ueni.site crossed with an industry keyword.',
      'Local-news "new business" roundups — these print the Facebook-only ones.',
      'Rotate industries daily (bakery, barbershop, tattoo, detailing, HVAC, roofing, salon, towing…) so each run surfaces a fresh slice.',
    ],
    watch: 'UENI dorks skew UK. Wix dorks skew barbershops unless keywords rotate.',
  },
  {
    n: '02',
    title: 'Verification',
    lead: 'Never load an unverified lead.',
    detail: [
      'One fetch per candidate: name, owner, city/state, phone, email, services, copyright year, any custom domain.',
      'Drop if: not US · redirects to a real domain (already upgraded) · no contact info at all · fetch blocked.',
      'For news candidates, search "<name> <city> website" to negatively confirm.',
    ],
    watch: 'About a third of "no website listed" candidates turn out to have one. This gate is the quality of the whole run.',
  },
  {
    n: '03',
    title: 'Dedupe',
    lead: 'Check every name before creating anything.',
    detail: [
      'Search contacts by business name; skip on any match.',
      'Fallback when search is down: list 100 contacts, grep all candidate names at once.',
      'source = daily-scan-<date> keeps it auditable afterwards.',
    ],
    watch: 'crm_search_contacts returned a server-side 400 on every call in the 2026-08-05 run. The list-and-grep fallback is not optional.',
  },
  {
    n: '04',
    title: 'CRM load',
    lead: 'Three records per lead, contact first.',
    detail: [
      'Contact — business name in the name field, website = their current presence, tagged website-prospect + daily-scan.',
      `Opportunity — "Website — <business>", Marketing Pipeline, New Lead, $${LEAD_VALUE}.`,
      'Note — Source URL on line one, always. Then hook, current presence, city/state, phone/email.',
    ],
    watch: 'Phone-only leads: omit email entirely, never pass an empty string. Social-only: placeholder address, and say so in the note.',
  },
  {
    n: '05',
    title: 'Notify & work',
    lead: 'Totals, split, and anything that broke.',
    detail: [
      'Report emailable / phone-only / social-only separately — they are three different follow-ups.',
      'Leads sit in New Lead until moved to "Email Sent".',
      'That move fires the 7-touch / 7-day workflow.',
    ],
    watch: 'Nothing sends automatically. The stage move is the human gate.',
  },
]

const money = (n: number) => '$' + n.toLocaleString('en-US')

export default async function ScanBoard() {
  const stats = await getScanStats(ROCKETOPP_LOCATION).catch(() => null)
  const peak = Math.max(1, ...(stats?.byDay ?? []).map((d) => d.count))

  return (
    <div className="min-h-screen bg-[#F6F6F7] px-5 py-6 text-[#414A43] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B928C]">
            RocketOpp · daily run
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight text-[#181D19]">
            Website-buyer scan
          </h1>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#414A43]/80">
            Find US small businesses with no website, a free-builder subdomain, or a site last touched in 2021 —
            verify each one, and load it as a working lead.
          </p>
        </header>

        {/* Live counts. The scan's output is the CRM, so these are read from it. */}
        <section className="mb-5 grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Leads in pipeline', value: stats ? String(stats.totalLeads) : '—' },
            { label: 'Added today', value: stats ? String(stats.today) : '—' },
            { label: 'Pipeline value', value: stats ? money(stats.pipelineValue) : '—' },
            { label: 'Per lead', value: money(LEAD_VALUE) },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white p-4"
              style={{ boxShadow: '0 1px 2px rgba(24,29,25,.05), 0 2px 8px rgba(24,29,25,.05)' }}
            >
              <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#8B928C]">{s.label}</p>
              <p className="mt-1 text-[24px] font-bold leading-none text-[#181D19]">{s.value}</p>
            </div>
          ))}
        </section>

        {stats && stats.totalLeads > 0 && (
          <section
            className="mb-5 rounded-2xl bg-white p-5"
            style={{ boxShadow: '0 1px 2px rgba(24,29,25,.05), 0 2px 8px rgba(24,29,25,.05)' }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[14px] font-bold text-[#181D19]">How these leads can be worked</h2>
              <p className="text-[11.5px] text-[#8B928C]">Three different follow-ups, not one list</p>
            </div>
            {/* A single bar rather than three numbers: the shape is the point —
                a run that is all phone-only is a different day's work. */}
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-[#E9E9EB]">
              {([
                ['emailable', stats.split.emailable, '#6EE05A'],
                ['phone-only', stats.split.phoneOnly, '#C98A12'],
                ['social-only', stats.split.socialOnly, '#3E8FC7'],
              ] as const).map(([k, v, c]) =>
                v > 0 ? (
                  <div key={k} style={{ width: `${(v / stats.totalLeads) * 100}%`, background: c }} title={`${k}: ${v}`} />
                ) : null,
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-4">
              {([
                ['Emailable', stats.split.emailable, '#2E9A1F', 'sequence can run'],
                ['Phone-only', stats.split.phoneOnly, '#C98A12', 'call list'],
                ['Social-only', stats.split.socialOnly, '#3E8FC7', 'DM, placeholder email'],
              ] as const).map(([label, v, c, note]) => (
                <span key={label} className="flex items-center gap-1.5 text-[12px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                  <b style={{ color: c }}>{v}</b> {label}
                  <span className="text-[#8B928C]">· {note}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {stats && stats.byDay.length > 1 && (
          <section
            className="mb-5 rounded-2xl bg-white p-5"
            style={{ boxShadow: '0 1px 2px rgba(24,29,25,.05), 0 2px 8px rgba(24,29,25,.05)' }}
          >
            <h2 className="text-[14px] font-bold text-[#181D19]">Leads per run</h2>
            <div className="mt-3 flex items-end gap-1.5" style={{ height: 72 }}>
              {[...stats.byDay].reverse().map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
                  <div
                    className="w-full rounded-t"
                    style={{ height: Math.max(4, (d.count / peak) * 60), background: '#6EE05A' }}
                  />
                  <span className="font-mono text-[8.5px] text-[#8B928C]">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* The process itself. */}
        <section className="space-y-3">
          {PHASES.map((p) => (
            <div
              key={p.n}
              className="rounded-2xl bg-white p-5"
              style={{ boxShadow: '0 1px 2px rgba(24,29,25,.05), 0 2px 8px rgba(24,29,25,.05)' }}
            >
              <div className="flex gap-4">
                <span className="font-mono text-[13px] font-bold text-[#6EE05A]">{p.n}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold leading-tight text-[#181D19]">{p.title}</h3>
                  <p className="mt-0.5 text-[13px] text-[#414A43]">{p.lead}</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {p.detail.map((d) => (
                      <li key={d} className="flex gap-2 text-[12.5px] leading-relaxed text-[#414A43]/85">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#8B928C]" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                  {/* The watch-out is the part that actually saves a run. */}
                  <p className="mt-3 rounded-xl bg-[#C98A12]/[0.08] px-3 py-2 text-[12px] leading-relaxed text-[#414A43]">
                    <b className="text-[#C98A12]">Watch out — </b>
                    {p.watch}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {stats && stats.recent.length > 0 && (
          <section
            className="mt-5 overflow-hidden rounded-2xl bg-white"
            style={{ boxShadow: '0 1px 2px rgba(24,29,25,.05), 0 2px 8px rgba(24,29,25,.05)' }}
          >
            <h2 className="border-b border-[#E9E9EB] px-5 py-3.5 text-[14px] font-bold text-[#181D19]">
              Most recent leads
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <tbody>
                  {stats.recent.slice(0, 12).map((l) => (
                    <tr key={l.id} className="border-b border-[#E9E9EB] last:border-0">
                      <td className="px-5 py-2.5 font-semibold text-[#181D19]">{l.name}</td>
                      <td className="px-3 py-2.5 text-[#8B928C]">{l.email && !/@example\.com$/i.test(l.email) ? l.email : l.phone || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className="rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider"
                          style={
                            l.reach === 'emailable'
                              ? { background: 'rgba(110,224,90,.15)', color: '#2E9A1F' }
                              : l.reach === 'phone-only'
                              ? { background: 'rgba(201,138,18,.13)', color: '#C98A12' }
                              : { background: 'rgba(62,143,199,.13)', color: '#3E8FC7' }
                          }
                        >
                          {l.reach}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 font-mono text-[10.5px] text-[#8B928C]">{l.createdAt?.slice(0, 10) ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Problems are shown, never rendered as a zero. A board that displays 0
            when it actually failed to read is worse than one that says so. */}
        {stats?.problems?.length ? (
          <p className="mt-4 rounded-xl bg-[#D65454]/[0.08] px-4 py-3 text-[12.5px] leading-relaxed text-[#D65454]">
            <b>Could not read everything: </b>
            {stats.problems.join(' ')}
          </p>
        ) : null}

        {!stats && (
          <p className="mt-4 rounded-xl bg-[#D65454]/[0.08] px-4 py-3 text-[12.5px] text-[#D65454]">
            Could not reach the CRM, so the counts above are blank rather than wrong.
          </p>
        )}

        <p className="mt-6 font-mono text-[10px] text-[#8B928C]">
          Live from CRM location {ROCKETOPP_LOCATION} · Marketing Pipeline · New Lead
        </p>
      </div>
    </div>
  )
}
