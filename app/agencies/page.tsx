import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Users, MessageSquare, CalendarCheck, GitBranch, Building2, Workflow,
  Globe, Share2, Bot, Layers, UserCog, ListChecks, Receipt, BarChart3,
  ShieldCheck, ArrowRight, Zap,
} from 'lucide-react'
import { METERS, formatPrice, resale } from '@/lib/meters'
import SiteFooter from '@/components/SiteFooter'
import RequestAccessButton from '@/components/RequestAccessButton'
import CapabilityMatrix from '@/components/agencies/CapabilityMatrix'
import { SITE, orgRef, siteNodes, faqPage, graph, jsonLdScript } from '@/lib/seo/jsonld'

/**
 * /agencies — the money page.
 *
 * Written from the capability catalog, and it keeps the catalog's honesty
 * system rather than flattening it into marketing. Each capability carries how
 * it is really delivered: native write API, cloned from a snapshot, or done by
 * our own products. Anything the catalog marks as not-yet-possible does not
 * appear here at all.
 *
 * That is a commercial decision as much as an ethical one. Agencies hand over
 * their clients' accounts; the first over-claim that fails live costs the
 * account and the referral. A page that says "cloned from your template" beats
 * one that says "AI-generated" and then cannot do it.
 */


/**
 * The questions agencies actually ask before handing over client accounts.
 *
 * These are the objections, answered straight — including the ones with an
 * uncomfortable answer. A FAQ that only asks itself easy questions reads as
 * marketing and converts like it.
 *
 * VISIBLE ON THE PAGE, not schema-only. FAQ markup that has no on-page
 * counterpart is a structured-data violation, and it is also just dishonest:
 * the point is to answer the reader, not the crawler.
 */
const AGENCY_FAQ: { q: string; a: string }[] = [
  {
    q: 'Can it change a client account without me approving it?',
    a: 'No. There is no automatic path to a live write. 0nCORE produces a plan with a price, and only your approval runs it. The plan you approve is cryptographically signed, so what executes is exactly what you saw — not a version edited in between.',
  },
  {
    q: 'What does it cost, and how do I make money on it?',
    a: 'Free to install. Standard actions are free; premium ones are metered — a site build is $10, provisioning a client is $5, a social post is 15¢. Most agencies mark those up and rebill their clients, which turns usage into margin rather than an expense.',
  },
  {
    q: 'Will you push your own automations into my accounts?',
    a: 'Never. 0nCORE deploys YOUR snapshots and YOUR templates. We do not ship our own workflows into your clients, and we do not need to see your build to run it.',
  },
  {
    q: 'Can it build a workflow from scratch in my CRM?',
    a: 'No, and neither can anything else — your CRM exposes no write API for native workflows. What 0nCORE does is deploy your existing templates into a client where they land natively and stay editable by you, or build the automation as a 0nCORE flow that drives your CRM. We say which one you are getting.',
  },
  {
    q: 'What happens if a step fails halfway through?',
    a: 'Each step is recorded before it runs and settled afterwards, so a failure is visible rather than silent. A step that fails is never billed, and the steps that succeeded are reported as what they are.',
  },
  {
    q: 'Is it safe to run a bulk action across every client?',
    a: 'Within limits it enforces. Tags trigger automations in your CRM, so a wide tag is a wide send — above a safe threshold 0nCORE refuses and tells you how many contacts matched, instead of guessing on your behalf.',
  },
  {
    q: 'Do my clients see 0nCORE?',
    a: 'Only if you want them to. It runs inside the CRM you already white-label, under your brand.',
  },
]

const listingUrl = process.env.NEXT_PUBLIC_MARKETPLACE_LISTING_URL || '/contact?ref=agencies-waitlist'
const listingIsLive = Boolean(process.env.NEXT_PUBLIC_MARKETPLACE_LISTING_URL)

export const metadata: Metadata = {
  title: 'One command bar for every client account — 0nCORE for agencies',
  description:
    'Run every client account from one chat inside the CRM you already use. Provision clients, launch onboarding, build sites, post social. Free to install, pay per use, mark it up and resell.',
  openGraph: {
    title: 'One command bar for every client account — 0nCORE for agencies',
    description: 'Thirty logins in the morning becomes one sentence. Free to install, pay only for what runs.',
    url: 'https://www.0ncore.com/agencies',
    type: 'website',
  },
  alternates: { canonical: 'https://www.0ncore.com/agencies' },
}

/** How a capability is actually delivered. The catalog's tier key, kept intact. */
type How = 'native' | 'template' | 'ours'

const HOW_LABEL: Record<How, string> = {
  native: 'Direct',
  template: 'From your template',
  ours: 'Built by 0nCORE',
}
const HOW_STYLE: Record<How, string> = {
  native: 'border-[#6EE05A]/30 bg-[#6EE05A]/10 text-[#6EE05A]',
  template: 'border-[#d29922]/30 bg-[#d29922]/10 text-[#d29922]',
  ours: 'border-[#58a6ff]/30 bg-[#58a6ff]/10 text-[#58a6ff]',
}

const GROUPS: { group: string; items: { icon: typeof Users; name: string; what: string; how: How }[] }[] = [
  {
    group: 'Command',
    items: [
      { icon: Users, name: 'Contacts & leads', what: 'Create, find, tag, segment and update custom fields across any client.', how: 'native' },
      { icon: MessageSquare, name: 'Messaging', what: 'Send SMS and email, read conversation history, draft replies for approval.', how: 'native' },
      { icon: CalendarCheck, name: 'Calendar', what: 'Book, reschedule and assign appointments on any client calendar.', how: 'native' },
      { icon: GitBranch, name: 'Pipeline', what: 'Move deals, update values, bulk-advance anything that has gone stale.', how: 'native' },
    ],
  },
  {
    group: 'Provision',
    items: [
      { icon: Building2, name: 'New client accounts', what: 'Describe the client in a paragraph — the account, snapshot and team are assembled.', how: 'native' },
      { icon: Layers, name: 'Snapshots', what: 'Push an updated snapshot to one client or every client of that type at once.', how: 'native' },
      { icon: Workflow, name: 'Automations', what: 'Give a client your standard automation by cloning the template you built once.', how: 'template' },
      { icon: Bot, name: 'Agent teams', what: 'Deploy your onboarding, service and upsell agents into a new account.', how: 'template' },
      { icon: UserCog, name: 'Users & roles', what: 'Add team members to sub-accounts and set what they can reach.', how: 'native' },
    ],
  },
  {
    group: 'Build',
    items: [
      { icon: Globe, name: 'Websites & landers', what: 'A real site generated and deployed from one sentence, link returned to you.', how: 'ours' },
      { icon: Share2, name: 'Social', what: 'Write and schedule a week of posts per client across connected channels.', how: 'ours' },
      { icon: ListChecks, name: 'Tasks', what: 'One list shared by your people, your automations and your agents.', how: 'ours' },
    ],
  },
  {
    group: 'Grow',
    items: [
      { icon: Receipt, name: 'Invoices & payments', what: 'Create invoices and products, take payment, read transaction history.', how: 'native' },
      { icon: BarChart3, name: 'Cross-client reporting', what: 'Leads, deals and booked calls across every client in one view.', how: 'ours' },
    ],
  },
]

export default function AgenciesPage() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-12 pt-16 sm:px-8 sm:pt-24">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#6EE05A]/25 bg-[#6EE05A]/10 px-3.5 py-1.5">
          <Zap className="h-3.5 w-3.5 text-[#6EE05A]" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-wide text-[#6EE05A]">For agencies</span>
        </div>

        <h1 className="max-w-4xl text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
          Thirty logins in the morning. Or one sentence.
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#8b949e] sm:text-xl">
          0nCORE installs into the CRM you already use and commands every client account from one
          chat. Say what you want across as many clients as you like — it plans the work, prices it,
          and runs it once you approve.{' '}
          <span className="text-[#e6edf3]">Free to install. You pay only for what runs.</span>
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          {listingIsLive ? (
            <a
              href={listingUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6EE05A] px-6 py-3.5 font-semibold text-[#0d1117] transition-opacity hover:opacity-90"
            >
              Install in your CRM
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <RequestAccessButton label="Join the early group" source="agencies-hero" />
          )}
          <Link
            href="/signup?ref=agencies"
            className="inline-flex items-center gap-2 rounded-xl border border-[#30363d] px-6 py-3.5 font-semibold transition-colors hover:border-[#6EE05A]/40"
          >
            Not on that CRM? Start free
          </Link>
        </div>
      </section>

      {/* The burst — the one paragraph that is the whole product */}
      <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-7 sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b949e]">One command</div>
          <p className="mt-4 text-lg leading-relaxed sm:text-xl">
            <span className="font-mono text-[#6EE05A]">&gt;</span>{' '}
            <span className="text-[#e6edf3]">
              Send Client A&apos;s new leads the promo email, build Client B a landing page for their
              new service, schedule Client C&apos;s social for the week, move all of Client D&apos;s
              stalled deals to follow-up, and assign Client E&apos;s onboarding to Dana — add it all
              to my task list.
            </span>
          </p>
          <p className="mt-5 max-w-3xl leading-relaxed text-[#8b949e]">
            That splits into one leg per client, runs them at the same time, shows you the cost
            before anything happens, and leaves a receipt for every step. If a leg fails it retries
            another way rather than dropping it — and a failed step is never billed.
          </p>
        </div>
      </section>

      {/* Capabilities — honesty preserved */}
      <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">What it can actually do</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#8b949e]">
          Each item says how it is delivered — run directly against your CRM, cloned from a template
          you built once, or built by 0nCORE&apos;s own products. Nothing is listed that we cannot do
          today.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(HOW_LABEL) as How[]).map((h) => (
            <span key={h} className={`rounded-full border px-3 py-1 text-xs font-semibold ${HOW_STYLE[h]}`}>
              {HOW_LABEL[h]}
            </span>
          ))}
        </div>

        <div className="mt-8 space-y-10">
          {GROUPS.map((g) => (
            <div key={g.group}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#8b949e]">{g.group}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((it) => {
                  const Icon = it.icon
                  return (
                    <div key={it.name} className="rounded-2xl border border-[#30363d] bg-[#161b22] p-6">
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#6EE05A]/20 bg-[#6EE05A]/10">
                          <Icon className="h-5 w-5 text-[#6EE05A]" aria-hidden="true" />
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${HOW_STYLE[it.how]}`}>
                          {HOW_LABEL[it.how]}
                        </span>
                      </div>
                      <h4 className="mt-4 font-semibold">{it.name}</h4>
                      <p className="mt-1.5 text-sm leading-relaxed text-[#8b949e]">{it.what}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The matrix — the sceptic's section. */}
      <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Where the walls actually are
        </h2>
        <p className="mb-7 mt-3 max-w-3xl leading-relaxed text-[#8b949e]">
          Three setups on the same agency plan. Search it, filter it, or press
          <span className="text-[#e6edf3]"> Only the gaps</span> — the point is the middle column,
          and you should be able to check it rather than take our word.
        </p>
        <CapabilityMatrix />
      </section>

      {/* Pricing + the resale angle */}
      <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Free to install. Priced per thing done.</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#8b949e]">
          No seat fee, no monthly minimum. Set your own markup and bill your clients through the
          platform you already use — the right-hand column is yours to keep.
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-[#30363d] bg-[#161b22]">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-[#30363d] text-xs uppercase tracking-[0.12em] text-[#8b949e]">
                <th className="px-6 py-4 font-semibold">What runs</th>
                <th className="px-6 py-4 font-semibold">When it counts</th>
                <th className="px-6 py-4 font-semibold">You pay</th>
                <th className="px-6 py-4 font-semibold">At 3× markup</th>
              </tr>
            </thead>
            <tbody>
              {METERS.map((m) => (
                <tr key={m.key} className="border-b border-[#30363d] last:border-0">
                  <td className="px-6 py-5">
                    <div className="font-semibold">{m.label}</div>
                    <div className="text-xs text-[#8b949e]">{m.unit}</div>
                  </td>
                  <td className="px-6 py-5 text-sm leading-relaxed text-[#8b949e]">{m.when}</td>
                  <td className="px-6 py-5">
                    <span className="font-mono font-semibold text-[#6EE05A]">{formatPrice(m.priceCents, m.pending)}</span>
                    {m.launchFree && <div className="text-xs text-[#8b949e]">free while we launch</div>}
                  </td>
                  <td className="px-6 py-5 font-mono text-[#8b949e]">
                    {m.pending ? '—' : m.priceCents ? resale(m.priceCents) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-[#8b949e]">
          Creating client sub-accounts by command requires your CRM plan to include sub-account
          creation. Everything else works on any plan.
        </p>
      </section>

      {/* Trust */}
      <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-7 sm:p-10">
          <div className="flex items-start gap-4">
            <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#6EE05A]/20 bg-[#6EE05A]/10">
              <ShieldCheck className="h-5 w-5 text-[#6EE05A]" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">It asks before it acts</h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-[#8b949e]">
                You see the plan and the price before anything runs. Nothing sends to a whole list
                without you confirming that is what you meant. Every action leaves a receipt against
                the client it belongs to, and uninstalling ends access and billing the same day.
              </p>
              <Link
                href="/security"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#6EE05A] hover:underline"
              >
                How we handle your clients&apos; data
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Close */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <div className="rounded-2xl border border-[#6EE05A]/25 bg-gradient-to-br from-[#6EE05A]/10 to-transparent p-8 sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Run your agency from one line.</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-[#8b949e]">
            We run it on our own agency every day. Watch the walkthrough, then tell us about yours.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/0nagent"
              className="inline-flex items-center gap-2 rounded-xl bg-[#6EE05A] px-6 py-3.5 font-semibold text-[#0d1117] transition-opacity hover:opacity-90"
            >
              Watch the walkthrough
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {listingIsLive ? (
              <a
                href={listingUrl}
                className="inline-flex items-center gap-2 rounded-xl border border-[#30363d] px-6 py-3.5 font-semibold transition-colors hover:border-[#6EE05A]/40"
              >
                Install in your CRM
              </a>
            ) : (
              <RequestAccessButton label="Join the early group" source="agencies-footer" variant="outline" />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-16 sm:px-8" aria-labelledby="agency-faq">
        <h2 id="agency-faq" className="text-2xl font-bold tracking-tight text-neutral-900">
          Before you hand over a client account
        </h2>
        <div className="mt-5 space-y-3">
          {AGENCY_FAQ.map((f) => (
            <details key={f.q} className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-cascade-sm">
              <summary className="cursor-pointer list-none text-[15px] font-semibold text-neutral-900 marker:hidden">
                {f.q}
              </summary>
              <p className="mt-2.5 text-[15px] leading-relaxed text-neutral-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter />

      {/* BreadcrumbList comes from the root layout (SiteBreadcrumbJsonLd). */}
      <script
        {...jsonLdScript(
          graph(
            ...siteNodes,
            {
              '@type': 'Product',
              name: '0nCORE for agencies',
              description:
                'Command every client account from one chat inside your CRM. Free to install, usage-based pricing, resellable by agencies.',
              brand: { '@type': 'Brand', name: '0nCORE' },
              url: `${SITE}/agencies`,
              // Same publisher node as every other page, by @id — two spellings
              // of one company read as two companies.
              manufacturer: orgRef,
              offers: METERS.filter((m) => m.priceCents > 0).map((m) => ({
                '@type': 'Offer',
                name: m.label,
                price: (m.priceCents / 100).toFixed(2),
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url: `${SITE}/agencies`,
                description: m.when,
              })),
            },
            faqPage(AGENCY_FAQ),
          ),
        )}
      />
    </main>
  )
}
