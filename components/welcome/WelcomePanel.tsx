'use client'

/**
 * WelcomePanel — the 6-card control panel for signed-in users.
 * Light theme, soft layered shadows, lock overlay for unentitled cards.
 */

import Link from 'next/link'
import {
  Workflow, Sparkles, Package, GraduationCap, Shield, Mic, Lock,
  ArrowRight, Settings, LogOut, type LucideIcon, ShieldCheck,
  Building2, Crown, CheckCircle2,
} from 'lucide-react'

export type CardAccess = 'unlocked' | 'locked'

export interface WelcomeCard {
  id: string
  title: string
  subtitle: string
  description: string
  href: string
  access: CardAccess
  tag: string                 // 'Free' | 'Starter' | 'Builder' | 'Enterprise'
  required_plan: string | null
  icon: keyof typeof ICONS
}

const ICONS: Record<string, LucideIcon> = {
  Workflow, Sparkles, Package, GraduationCap, Shield, Mic, Building2,
}

interface FamilyLocationProp {
  name: string
  locationId: string
  vip: boolean
}

interface TierQuotas {
  groq_tasks: number
  scans: number
  fiverr_gigs: number
  flows: number
}

interface Props {
  user: {
    email: string
    name: string | null
    plan: string
    location_id: string | null
    is_admin: boolean
  }
  cards: WelcomeCard[]
  familyLocation?: FamilyLocationProp | null
  tierLabel?: string
  tierQuotas?: TierQuotas
  tierActions?: string[]
}

export default function WelcomePanel({
  user,
  cards,
  familyLocation,
  tierLabel,
  tierQuotas,
  tierActions,
}: Props) {
  const greeting = user.name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there'

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Top bar — logo + account */}
      <div className="mb-12 flex items-start justify-between gap-4">
        <Link href="/" className="block">
          <img
            src="/brand/0ncore-logo-light.png"
            alt="0nCore"
            className="h-10 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-2">
          <PlanBadge plan={user.plan} isAdmin={user.is_admin} />
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Settings className="h-3.5 w-3.5" /> Settings
          </Link>
          <Link
            href="/api/auth/signout"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Welcome back
        </div>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-900">
          Hi, {greeting}.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Pick where you want to go. Free surfaces are open to everyone — paid surfaces show a lock until your plan covers them.
        </p>
        {!user.location_id && !familyLocation && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>
              Your CRM sub-location isn't linked yet.{' '}
              <Link href="/dashboard/settings/accounts" className="font-semibold underline underline-offset-2">
                Connect it
              </Link>{' '}
              so workflows can route to your account.
            </span>
          </div>
        )}
      </div>

      {/* Sub-account + plan card — confirms the email-based family link */}
      {(familyLocation || tierQuotas) && (
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          {familyLocation && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Building2 className="h-3.5 w-3.5" />
                Your CRM sub-account
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-semibold text-slate-900">
                    {familyLocation.name}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    {familyLocation.locationId}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Linked via email match
                  </div>
                </div>
                {familyLocation.vip && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                    <Crown className="h-3 w-3" /> VIP
                  </span>
                )}
              </div>
              <Link
                href="/dashboard/onboarding/crm"
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Verify 2-way sync <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
          {tierQuotas && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Sparkles className="h-3.5 w-3.5" />
                Your monthly budget — {tierLabel || user.plan}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'AI tasks (Groq)', value: tierQuotas.groq_tasks },
                  { label: 'Stack scans', value: tierQuotas.scans },
                  { label: 'Fiverr gigs', value: tierQuotas.fiverr_gigs },
                  { label: 'Time-delayed flows', value: tierQuotas.flows },
                ].map((q) => (
                  <div key={q.label}>
                    <div className="font-mono text-base font-semibold text-slate-900">
                      {q.value === Number.MAX_SAFE_INTEGER
                        ? 'Unlimited'
                        : q.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">{q.label}</div>
                  </div>
                ))}
              </div>
              {user.plan === 'free' && (
                <div className="mt-4 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                  Bring your own free Groq key for unlimited AI tasks —
                  <Link href="/dashboard/settings/groq" className="ml-1 font-semibold text-slate-900 underline-offset-2 hover:underline">
                    connect Groq
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Onboarding next steps — what to do first on this plan */}
      {tierActions && tierActions.length > 0 && (
        <div className="mb-10 rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50/60 to-cyan-50/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Next steps on {tierLabel || user.plan}
          </div>
          <ul className="space-y-2">
            {tierActions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => <Card key={c.id} card={c} />)}
      </div>

      {/* Footer */}
      <div className="mt-12 flex items-center justify-between text-xs text-slate-400">
        <div>{user.email}</div>
        <Link href="/pricing" className="font-medium text-slate-600 hover:text-slate-900">
          Compare plans →
        </Link>
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────

function Card({ card }: { card: WelcomeCard }) {
  const Icon = ICONS[card.icon] ?? Workflow
  const isLocked = card.access === 'locked'

  const tone =
    card.tag === 'Free'       ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
    card.tag === 'Starter'    ? 'bg-sky-50 text-sky-700 ring-sky-200' :
    card.tag === 'Builder'    ? 'bg-violet-50 text-violet-700 ring-violet-200' :
    card.tag === 'Enterprise' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
    'bg-slate-100 text-slate-700 ring-slate-200'

  const cardBody = (
    <div
      className={`group relative h-full overflow-hidden rounded-2xl border bg-white p-6 transition-all ${
        isLocked
          ? 'border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(0,0,0,0.06)]'
          : 'border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_24px_48px_-16px_rgba(0,0,0,0.18)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200 transition group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:ring-emerald-200">
          <Icon className="h-5 w-5" />
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${tone}`}>
          {card.tag}
        </span>
      </div>

      <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900">
        {card.title}
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">{card.subtitle}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.description}</p>

      <div className="mt-5 flex items-center text-xs font-medium text-slate-700">
        {isLocked ? (
          <span className="flex items-center gap-1 text-slate-400">
            <Lock className="h-3.5 w-3.5" /> {card.required_plan ?? 'Upgrade required'}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-700 transition group-hover:gap-2">
            Open <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {/* Lock overlay */}
      {isLocked && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-white/55 backdrop-blur-[1px] opacity-100 transition group-hover:opacity-0"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-slate-900/85 text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.40)] transition group-hover:opacity-0">
            <Lock className="h-3.5 w-3.5" />
          </div>
          {/* Hover detail panel — slides in when the card is hovered */}
          <div
            className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs opacity-0 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.20)] transition-all group-hover:translate-y-0 group-hover:opacity-100"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-semibold text-slate-900">Requires {card.required_plan ?? 'an upgrade'}</span>
            </div>
            <p className="mt-1 text-slate-500">{card.description}</p>
            <Link
              href="/pricing"
              className="pointer-events-auto mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              See plans <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </>
      )}
    </div>
  )

  return isLocked ? (
    <div className="block">{cardBody}</div>
  ) : (
    <Link href={card.href} className="block">
      {cardBody}
    </Link>
  )
}

// ── Plan badge ────────────────────────────────────────────────────────

function PlanBadge({ plan, isAdmin }: { plan: string; isAdmin: boolean }) {
  const label = isAdmin ? 'Admin' : (plan?.charAt(0).toUpperCase() + plan?.slice(1) || 'Free')
  const tone = isAdmin
    ? 'bg-slate-900 text-white'
    : plan === 'free'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    : 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  )
}
