import Link from 'next/link'
import { Check, X, ArrowRight, LayoutGrid } from 'lucide-react'

/**
 * The GHL agency dashboard section — the site's primary SEO surface.
 *
 * NOTE ON THE BRAND RULE. Everywhere else in this ecosystem the platform is
 * called "the CRM", and inside the marketplace app that stays absolute — a
 * listing that leans on the platform's trademark gets rejected, and the app UI
 * has its own reasons to stay neutral. Mike has explicitly cleared the name for
 * use in SITE COPY, because the search demand is attached to the name and a
 * page that refuses to say it cannot rank for it.
 *
 * So the split is: the brand appears in prose a human reads, and nowhere else.
 * Not in the filename, not in a variable, not in a class, not in an API
 * response. That keeps the SEO value without putting the name anywhere that
 * ships into a customer account or a marketplace submission.
 *
 * Structured for the SXO checklist: BLUF in the first two sentences, a
 * comparison table inside the first viewport of the section, an H2 that matches
 * the query, and FAQ pairs written as voice-search answers (the JSON-LD is
 * emitted by the page).
 */

export const AGENCY_DASHBOARD_FAQ = [
  {
    q: 'What is a GHL agency dashboard?',
    a: 'It is a single screen for running every sub-account you manage, instead of switching into each one. A native agency view shows you accounts and billing; a command dashboard like 0nCORE also lets you act across them — send, book, move deals, build and provision — from one place.',
  },
  {
    q: 'Can I manage all my GHL sub-accounts from one screen?',
    a: 'Yes. 0nCORE installs into your agency and commands any sub-account you switch on. You can run one instruction across several clients at once, and every action is receipted against the client it belongs to.',
  },
  {
    q: 'Does GHL have a cross-account reporting view?',
    a: 'Not in one combined view. Reporting is per sub-account, so a roll-up across every client is exactly the gap agencies feel first. 0nCORE reads across all activated accounts and answers questions like new leads, open deals and booked calls for the whole book at once.',
  },
  {
    q: 'How do I create a new GHL sub-account automatically?',
    a: 'Describe the client in a sentence and 0nCORE creates the sub-account, applies the snapshot you choose, adds the team and starts onboarding. Sub-account creation requires a plan that includes it; everything else works on any plan.',
  },
  {
    q: 'Is it safe to connect a third-party app to my agency?',
    a: 'Ask three questions of any tool: does it show you the plan before it acts, does it leave a receipt for every action, and does uninstalling actually end its access. 0nCORE answers yes to all three — nothing sends to a whole list without your confirmation, and uninstalling ends access and billing the same day.',
  },
]

const COMPARE: { capability: string; native: boolean | 'partial'; oncore: boolean; note: string }[] = [
  { capability: 'See every sub-account in one list', native: true, oncore: true, note: 'Both do this.' },
  { capability: 'Act on several clients at once', native: false, oncore: true, note: 'One instruction, one leg per client, run in parallel.' },
  { capability: 'Cross-client reporting in one view', native: false, oncore: true, note: 'Leads, deals and booked calls for the whole book.' },
  { capability: 'Create a sub-account from a sentence', native: 'partial', oncore: true, note: 'Native is a form; here it is a paragraph.' },
  { capability: 'Build a client landing page on command', native: false, oncore: true, note: 'Generated and deployed, link returned.' },
  { capability: 'Schedule a week of social per client', native: 'partial', oncore: true, note: 'Written as well as scheduled.' },
  { capability: 'One task list for people and AI', native: false, oncore: true, note: 'Humans and agents share the queue.' },
  { capability: 'Receipt for every action taken', native: 'partial', oncore: true, note: 'Every step, against the right client.' },
]

function Mark({ v }: { v: boolean | 'partial' }) {
  if (v === true) return <Check className="h-4 w-4 text-[#6EE05A]" aria-label="Yes" />
  if (v === 'partial') return <span className="text-xs font-semibold text-[#d29922]" aria-label="Partly">Partly</span>
  return <X className="h-4 w-4 text-[#6e7681]" aria-label="No" />
}

export default function AgencyDashboardSection() {
  return (
    <section id="agency-dashboard" className="space-y-6 py-10">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#6EE05A]/25 bg-[#6EE05A]/10 px-3.5 py-1.5">
        <LayoutGrid className="h-3.5 w-3.5 text-[#6EE05A]" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-wide text-[#6EE05A]">For agencies</span>
      </div>

      <h2 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        The GHL agency dashboard that actually runs your accounts
      </h2>

      {/* BLUF — the answer in the first two sentences. */}
      <p className="max-w-3xl text-lg leading-relaxed text-[#8b949e]">
        A GHL agency dashboard should do more than list your sub-accounts — it should let you{' '}
        <span className="text-[#e6edf3]">act across all of them from one place</span>. 0nCORE installs
        into your agency and turns one sentence into work across every client: send the campaign,
        book the calls, move the stalled deals, build the landing page, provision the new account.
      </p>

      {/* Table trap — inside the first viewport of the section. */}
      <div className="overflow-x-auto rounded-xl border border-[#30363d] bg-[#161b22]">
        <table className="w-full min-w-[680px] text-left text-sm">
          <caption className="sr-only">
            Native agency view compared with the 0nCORE agency dashboard
          </caption>
          <thead>
            <tr className="border-b border-[#30363d] text-xs uppercase tracking-[0.12em] text-[#8b949e]">
              <th scope="col" className="px-5 py-4 font-semibold">Capability</th>
              <th scope="col" className="px-5 py-4 text-center font-semibold">Native agency view</th>
              <th scope="col" className="px-5 py-4 text-center font-semibold">0nCORE</th>
              <th scope="col" className="px-5 py-4 font-semibold">What that means</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((r) => (
              <tr key={r.capability} className="border-b border-[#30363d] last:border-0">
                <th scope="row" className="px-5 py-4 text-left font-medium text-[#e6edf3]">{r.capability}</th>
                <td className="px-5 py-4"><span className="flex justify-center"><Mark v={r.native} /></span></td>
                <td className="px-5 py-4"><span className="flex justify-center"><Mark v={r.oncore} /></span></td>
                <td className="px-5 py-4 text-[#8b949e]">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            h: 'The morning problem',
            p: 'Twenty or thirty logins before you have done anything. Every client is a context switch, and the work that matters gets whatever is left.',
          },
          {
            h: 'What replaces it',
            p: 'One command bar. Name the clients and the outcome in a sentence — it splits the work per account, prices it, and runs it once you approve.',
          },
          {
            h: 'Why it stays honest',
            p: 'You see the plan before anything happens, every action leaves a receipt, and a step that fails is never billed.',
          },
        ].map((c) => (
          <div key={c.h} className="rounded-xl border border-[#30363d] bg-[#161b22] p-6">
            <h3 className="font-semibold text-[#e6edf3]">{c.h}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#8b949e]">{c.p}</p>
          </div>
        ))}
      </div>

      {/* FAQ — the voice-search surface. */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 md:p-8">
        <h3 className="text-xl font-bold tracking-tight">Questions agencies ask</h3>
        <dl className="mt-5 divide-y divide-[#30363d]">
          {AGENCY_DASHBOARD_FAQ.map((f) => (
            <div key={f.q} className="py-5 first:pt-0 last:pb-0">
              <dt className="font-semibold text-[#e6edf3]">{f.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-[#8b949e]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Internal link mesh */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/agencies"
          className="inline-flex items-center gap-2 rounded-xl bg-[#6EE05A] px-5 py-3 font-semibold text-[#0d1117] transition-opacity hover:opacity-90"
        >
          See what it can do
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link href="/0nagent" className="text-sm font-semibold text-[#6EE05A] hover:underline">
          Watch the walkthrough
        </Link>
        <Link href="/pricing" className="text-sm font-semibold text-[#6EE05A] hover:underline">
          What it costs
        </Link>
      </div>
    </section>
  )
}
