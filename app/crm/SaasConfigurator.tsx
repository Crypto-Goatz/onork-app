'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Loader2, Sparkles, Check, Plus, Info, AlertCircle, ArrowRight, RotateCcw,
} from 'lucide-react'
import { useSso, authHeaders } from './useSso'
import AppSidebar from './AppSidebar'

/**
 * Build a client's plan by describing them, not by ticking boxes.
 *
 * THE PROBLEM WITH A CHECKLIST. Fifteen add-ons with prices is honest and
 * useless: an agency owner knows "my client loses calls after hours", not
 * whether that maps to Call Tracking or Smart Triggers. Made to guess, they
 * either overspend and churn or underbuy and blame the product.
 *
 * So the description comes first and the plan arrives WITH REASONS. Every line
 * says why it is there in the buyer's own words, and what was left out is shown
 * as prominently as what was included — "you said you don't sell online, so I
 * skipped E-commerce" is what makes the rest of the list believable.
 *
 * The recommendation is never a lock. Every line toggles, the total reprices
 * instantly in the browser, and the catalogue stays visible underneath. The AI
 * is a starting point that explains itself.
 */

interface Addon { name: string; blurb: string; priceMonthly: number; category: string }
interface Catalogue { basePriceMonthly: number; baseValueMonthly: number; annualDiscountPct: number; addons: Addon[] }
interface PlanLine { key: string; name: string; category: string; priceMonthly: number; because: string }
interface Plan {
  lines: PlanLine[]; basePriceMonthly: number; monthlyTotal: number
  annualMonthlyTotal: number; annualSaving: number
  omitted: { name: string; because: string }[]; notes: string[]
}

const keyOf = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function SaasConfigurator() {
  const sso = useSso()
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null)
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [thinking, setThinking] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [annual, setAnnual] = useState(false)
  const [error, setError] = useState('')
  const [degraded, setDegraded] = useState(false)

  useEffect(() => {
    fetch('/api/saas/configure')
      .then((r) => r.json())
      .then((j) => setCatalogue(j.catalogue))
      .catch(() => {})
  }, [])

  /**
   * Repricing happens HERE, in the browser, from the catalogue.
   *
   * Round-tripping to the server on every toggle would make the total lag the
   * click — and a price that arrives late is a price people stop trusting.
   */
  const totals = useMemo(() => {
    if (!catalogue) return { monthly: 0, annualMonthly: 0, saving: 0, count: 0 }
    const monthly = catalogue.addons
      .filter((a) => selected.has(keyOf(a.name)))
      .reduce((s, a) => s + a.priceMonthly, catalogue.basePriceMonthly)
    const annualMonthly = Math.round(monthly * (1 - catalogue.annualDiscountPct / 100))
    return { monthly, annualMonthly, saving: (monthly - annualMonthly) * 12, count: selected.size }
  }, [catalogue, selected])

  const reasons = useMemo(() => {
    const m = new Map<string, string>()
    plan?.lines.forEach((l) => l.because && m.set(l.key, l.because))
    return m
  }, [plan])

  async function recommend() {
    setError('')
    setThinking(true)
    try {
      const res = await fetch('/api/saas/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(sso.token) },
        body: JSON.stringify({ description, budget: budget ? Number(budget) : undefined }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error || 'Could not build a plan.'); return }
      setPlan(j.plan)
      setDegraded(Boolean(j.degraded))
      if (j.catalogue) setCatalogue(j.catalogue)
      setSelected(new Set((j.plan?.lines ?? []).map((l: PlanLine) => l.key)))
    } catch {
      setError('Network error — try again.')
    } finally {
      setThinking(false)
    }
  }

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      const k = keyOf(name)
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })

  const byCategory = useMemo(() => {
    const m = new Map<string, Addon[]>()
    catalogue?.addons.forEach((a) => m.set(a.category, [...(m.get(a.category) ?? []), a]))
    return [...m.entries()]
  }, [catalogue])

  const canAsk = description.trim().length > 20

  return (
    <div className="oncore-app min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[color:var(--oc-border)] bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <img src="/brand/0ncore-logo-light.png" alt="0nCORE" className="h-[26px] w-auto shrink-0 object-contain" />
        <div className="truncate text-[12px] font-medium text-[color:var(--oc-text)]/75">Plan builder</div>
      </header>

      <div className="flex">
        <main className="mx-auto min-w-0 max-w-4xl flex-1 p-4 sm:p-6">
          <h1 className="text-[20px] font-bold text-[color:var(--oc-ink)]">Build a plan for a client</h1>
          <p className="mt-0.5 text-[12.5px] text-[color:var(--oc-text)]/70">
            Describe the business. You&rsquo;ll get a plan with a reason on every line — and everything is editable.
          </p>

          {/* ── the ask ── */}
          <section className="oc-card mt-5 p-4 sm:p-5">
            <label className="block text-[12px] font-semibold text-[color:var(--oc-ink)]">
              What does this client do, and what are they struggling with?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="e.g. Plumber in Ligonier. Loses calls after hours and never follows up on quotes. Doesn't sell anything online."
              className="oc-input mt-2 w-full resize-none text-[13px] leading-relaxed"
            />
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[color:var(--oc-text)]/70">
                  Budget (optional)
                </label>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[13px] text-[color:var(--oc-text)]/50">$</span>
                  <input
                    value={budget}
                    onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
                    placeholder="250"
                    inputMode="numeric"
                    className="oc-input w-24 text-[13px]"
                  />
                  <span className="text-[12px] text-[color:var(--oc-text)]/50">/mo</span>
                </div>
              </div>
              <button
                onClick={recommend}
                disabled={!canAsk || thinking}
                className="oc-btn ml-auto inline-flex items-center gap-2 px-4 py-2.5 text-[13px] disabled:opacity-50"
              >
                {thinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {thinking ? 'Sizing the plan…' : plan ? 'Try again' : 'Build the plan'}
              </button>
            </div>
            {error && <p className="mt-2 text-[12px] text-[color:var(--oc-red)]">{error}</p>}
            {degraded && (
              <p className="mt-2 flex gap-1.5 text-[12px] text-[color:var(--oc-amber)]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                The recommender is unavailable, so nothing was pre-selected. Pick by hand below — pricing still works.
              </p>
            )}
          </section>

          {/* ── what got left out. Deliberately ABOVE the catalogue: it is the
                part that makes the recommendation trustworthy. ── */}
          {plan && plan.omitted.length > 0 && (
            <section className="oc-card mt-4 border-l-4 border-l-[color:var(--oc-text)]/20 p-4 sm:p-5">
              <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-[color:var(--oc-ink)]">
                <Info className="h-3.5 w-3.5 text-[color:var(--oc-text)]/50" />
                What I left out
              </h2>
              <ul className="mt-2 space-y-1.5">
                {plan.omitted.map((o) => (
                  <li key={o.name} className="text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/75">
                    <b className="text-[color:var(--oc-ink)]">{o.name}</b> — {o.because}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan?.notes.map((n) => (
            <p key={n} className="mt-3 rounded-lg bg-[color:var(--oc-amber)]/10 px-3 py-2 text-[12px] leading-relaxed text-[color:var(--oc-text)]/80">
              {n}
            </p>
          ))}

          {/* ── the catalogue, with recommendations marked ── */}
          {catalogue && (
            <section className="mt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-[13px] font-bold text-[color:var(--oc-ink)]">Everything available</h2>
                {selected.size > 0 && (
                  <button
                    onClick={() => setSelected(new Set())}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[color:var(--oc-text)]/55 hover:text-[color:var(--oc-ink)]"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear all
                  </button>
                )}
              </div>

              <div className="oc-card mb-3 flex items-start gap-2.5 p-3.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-green-d)]" />
                <div>
                  <p className="text-[12.5px] font-semibold text-[color:var(--oc-ink)]">
                    Base platform — included free
                  </p>
                  <p className="text-[11.5px] text-[color:var(--oc-text)]/65">
                    Contacts, forms, calendar &amp; booking, tasks, media and reporting.
                    ${catalogue.baseValueMonthly}/mo of value at no cost.
                  </p>
                </div>
              </div>

              {byCategory.map(([cat, items]) => (
                <div key={cat} className="mb-4">
                  <h3 className="oc-mono mb-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[color:var(--oc-text)]/45">
                    {cat}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((a) => {
                      const k = keyOf(a.name)
                      const on = selected.has(k)
                      const why = reasons.get(k)
                      return (
                        <button
                          key={k}
                          onClick={() => toggle(a.name)}
                          className={`rounded-xl border p-3.5 text-left transition-all ${
                            on
                              ? 'border-[color:var(--oc-green-d)] bg-[color:var(--oc-green)]/[0.07]'
                              : 'border-[color:var(--oc-border)] bg-white hover:border-[color:var(--oc-text)]/30'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border ${
                                on
                                  ? 'border-transparent bg-[color:var(--oc-green-d)] text-white'
                                  : 'border-[color:var(--oc-border)]'
                              }`}
                            >
                              {on ? <Check className="h-3 w-3" /> : <Plus className="h-2.5 w-2.5 text-[color:var(--oc-text)]/40" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="text-[12.5px] font-semibold text-[color:var(--oc-ink)]">{a.name}</span>
                                <span className="oc-mono shrink-0 text-[11px] text-[color:var(--oc-text)]/60">
                                  ${a.priceMonthly}
                                </span>
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-relaxed text-[color:var(--oc-text)]/60">
                                {a.blurb}
                              </span>
                              {/* The reason, attached to the thing it justifies —
                                  not collected in a summary nobody reads. */}
                              {why && (
                                <span className="mt-1.5 block border-l-2 border-[color:var(--oc-green-d)]/40 pl-2 text-[11px] italic leading-relaxed text-[color:var(--oc-green-d)]">
                                  {why}
                                </span>
                              )}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>
      </div>

      {/* ── the running total. Sticky, because the number is the decision. ── */}
      {catalogue && (
        <div className="sticky bottom-0 z-20 border-t border-[color:var(--oc-border)] bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
            <div>
              <p className="text-[11px] text-[color:var(--oc-text)]/55">
                {totals.count} add-on{totals.count === 1 ? '' : 's'} · base included free
              </p>
              <p className="text-[19px] font-bold leading-tight text-[color:var(--oc-ink)]">
                ${annual ? totals.annualMonthly : totals.monthly}
                <span className="text-[12px] font-medium text-[color:var(--oc-text)]/55">/mo</span>
                {annual && totals.saving > 0 && (
                  <span className="ml-2 text-[11.5px] font-semibold text-[color:var(--oc-green-d)]">
                    saves ${totals.saving}/yr
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={() => setAnnual((v) => !v)}
              className={`oc-chip border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                annual
                  ? 'border-[color:var(--oc-green-d)] bg-[color:var(--oc-green)]/12 text-[color:var(--oc-green-d)]'
                  : 'border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)]'
              }`}
            >
              {annual ? `Annual · ${catalogue.annualDiscountPct}% off` : `Pay annually, save ${catalogue.annualDiscountPct}%`}
            </button>

            <button
              disabled={totals.count === 0}
              className="oc-btn ml-auto inline-flex items-center gap-2 px-4 py-2.5 text-[13px] disabled:opacity-40"
            >
              Use this plan <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
