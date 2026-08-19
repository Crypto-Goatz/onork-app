'use client'

/**
 * /hub — the customer home. What everyone lands on after login or install.
 *
 * THE TEST THIS PAGE HAS TO PASS is Dex's, and it is a good one: a cold visitor
 * from the invite email lands here, clicks everything, and reaches either a
 * working flow or a locked tile — never a maze. So there are exactly two kinds
 * of thing on this page. Something you can use now, or something visibly not
 * yet yours with a sentence saying what it would do. No third category, and in
 * particular nothing that looks live and then dead-ends.
 *
 * LOCKED IS A PROMISE, NOT A WALL. Each locked tile says what the capability
 * does in plain language. A greyed-out box with a padlock and no explanation
 * teaches a visitor nothing except that the product is bigger than what they
 * bought, which is the opposite of the intent.
 *
 * UNVERIFIED IS PRINTED, NOT HIDDEN. Billing and learning are not wired to
 * proven reads yet, and both say so on the page. Showing a confident "Free
 * plan" badge we never checked would be a claim about someone's money.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, BookOpen, CreditCard, Lock, Loader2, Sparkles, ShieldCheck, LayoutGrid,
} from 'lucide-react'

type Home = {
  authed: boolean
  firstName?: string
  isOwner?: boolean
  apps?: { slug: string; name: string; href: string; state: string }[]
  appsNote?: string
  appCount?: number
  billing?: { plan: string | null; status: string; note: string; manageHref: string }
  learning?: { verified: boolean; note: string; href: string }
  locked?: { slug: string; name: string; blurb: string }[]
  whatsNew?: { at: string; text: string }[]
  notes?: string[]
}

export default function HubPage() {
  const [d, setD] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/hub/home', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then(setD)
      .catch(() => setD(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0d1117]">
        <Loader2 className="h-7 w-7 animate-spin text-[#6EE05A]" />
      </div>
    )
  }

  if (!d?.authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0d1117] px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sign in to your 0n account</h1>
          <p className="mt-2 text-sm text-white/50">Your apps, billing and courses live here.</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6EE05A] px-6 py-3 text-sm font-semibold text-[#062312] transition hover:opacity-90"
          >
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const apps = d.apps ?? []

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-white/10 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-[1100px]">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Hi, {d.firstName}.</h1>
          <p className="mt-2 text-sm text-white/55">
            {apps.length
              ? `${apps.length} app ready to use.`
              : 'Your home for apps, billing and courses.'}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-10 px-6 py-8 md:px-10">
        {/* ── Your apps ─────────────────────────────────────────────── */}
        <section>
          <h2 className="flex items-center gap-2 text-sm uppercase tracking-widest text-white/40">
            <LayoutGrid className="h-4 w-4" /> Your apps
          </h2>
          {apps.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((a) => (
                <Link
                  key={a.slug}
                  href={a.href}
                  className="group rounded-xl border border-[#6EE05A]/25 bg-[#6EE05A]/[0.06] p-5 transition hover:border-[#6EE05A]/60"
                >
                  <p className="font-medium">{a.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#6EE05A]">
                    Open <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            /* An empty state that says what to do next, not just that it is empty. */
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <p className="text-sm text-white/70">{d.appsNote || 'No connected app yet.'}</p>
              <Link
                href="/marketplace"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-4 py-2 text-sm font-semibold text-[#062312] transition hover:opacity-90"
              >
                Browse the marketplace <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        {/* ── Billing + learning ────────────────────────────────────── */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4 text-white/40" /> Billing
            </h3>
            {d.billing?.plan ? (
              <p className="mt-2 text-2xl font-semibold">{d.billing.plan}</p>
            ) : (
              /* No invented plan name. See the route for why. */
              <p className="mt-2 text-xs leading-relaxed text-white/45">{d.billing?.note}</p>
            )}
            <a
              href={d.billing?.manageHref || '#'}
              className="mt-4 inline-flex items-center gap-1 text-xs text-[#6EE05A] hover:underline"
            >
              Manage billing <ArrowRight className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <BookOpen className="h-4 w-4 text-white/40" /> Learning
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-white/45">{d.learning?.note}</p>
            <a
              href={d.learning?.href}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-xs text-[#6EE05A] hover:underline"
            >
              Open courses <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </section>

        {/* ── Locked: the promise, never a dead end ─────────────────── */}
        <section>
          <h2 className="flex items-center gap-2 text-sm uppercase tracking-widest text-white/40">
            <Lock className="h-4 w-4" /> Not yours yet
          </h2>
          <p className="mt-2 text-xs text-white/40">
            Each of these turns on the moment it&apos;s added to your account.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(d.locked ?? []).map((t) => (
              <div key={t.slug} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-white/80">{t.name}</p>
                  <Lock className="h-3.5 w-3.5 text-white/25" />
                </div>
                {/* The sentence is the point. A padlock alone teaches nobody anything. */}
                <p className="mt-2 text-xs leading-relaxed text-white/45">{t.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── What's new ────────────────────────────────────────────── */}
        <section>
          <h2 className="flex items-center gap-2 text-sm uppercase tracking-widest text-white/40">
            <Sparkles className="h-4 w-4" /> What&apos;s new
          </h2>
          <ul className="mt-4 space-y-3">
            {(d.whatsNew ?? []).map((n, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <span className="shrink-0 text-xs tabular-nums text-white/35">{n.at}</span>
                <span className="text-sm text-white/70">{n.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* The vault kept its challenge; it just isn't the front door any more. */}
        <section className="border-t border-white/10 pt-6">
          <Link
            href="/account/security"
            className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
          >
            <ShieldCheck className="h-4 w-4" /> Your 0n key and device security
            <ArrowRight className="h-3 w-3" />
          </Link>
        </section>

        {d.notes?.length ? (
          <p className="text-xs text-[#f59e0b]">{d.notes.join(' · ')}</p>
        ) : null}
      </main>
    </div>
  )
}
