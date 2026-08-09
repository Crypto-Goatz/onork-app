'use client'

/**
 * /crm/agent — 0nAGENT surface. A goal in, an autonomous agent out. Wired to
 * /api/agent/run; shows "Coming soon" until the daemon is connected (503).
 */
import { useState } from 'react'
import { Bot, Sparkles, ShieldCheck, Loader2, ArrowRight, Target, Cpu, ScrollText } from 'lucide-react'
import { useSso, authHeaders } from '../useSso'
import { LockGate } from '@/components/auth/LockGate'

export default function AgentPage() {
  const sso = useSso()
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ kind: 'soon' | 'running' | 'error'; text: string; sessionId?: string } | null>(null)

  const run = async () => {
    if (!goal.trim() || busy) return
    setBusy(true); setResult(null)
    try {
      const r = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(sso.token) },
        body: JSON.stringify({ goal: goal.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.status === 503) setResult({ kind: 'soon', text: 'Autonomous agents are almost here — this launches the moment the 0nAGENT engine is connected.' })
      else if (!r.ok) setResult({ kind: 'error', text: j?.error || 'Could not start the agent.' })
      else setResult({ kind: 'running', text: 'Agent running…', sessionId: j?.sessionId })
    } catch {
      setResult({ kind: 'error', text: 'Could not reach the agent.' })
    } finally { setBusy(false) }
  }

  if (sso.state === 'standalone' || sso.state === 'rejected') {
    return <LockGate next="/crm/agent" title="0nAGENT" subtitle="Sign in to run autonomous agents across your clients." />
  }

  return (
    <div className="oncore-app min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-2.5">
          <Bot className="h-5 w-5 text-[color:var(--oc-green-d)]" />
          <h1 className="text-[20px] font-bold text-[color:var(--oc-ink)]">0nAGENT</h1>
          <span className="oc-chip border border-[color:var(--oc-amber)]/40 bg-[color:var(--oc-amber)]/[0.10] px-2 py-0.5 text-[11px] text-[color:var(--oc-amber)]">Coming soon</span>
          <a href="/crm" className="ml-auto text-[13px] font-medium text-[color:var(--oc-text)]/60 hover:text-[color:var(--oc-green-d)]">← Dashboard</a>
        </div>

        {/* Hero */}
        <div className="oc-card oc-rise p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--oc-green-d)]">Autonomous</p>
          <h2 className="mt-1.5 text-[22px] font-black leading-tight text-[color:var(--oc-ink)]">Describe an outcome. The agent does the work.</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--oc-text)]/70">
            A long-running agent that plans and executes across your clients — research, outreach, ops — wired to your CRM, with a hard budget and a full audit trail.
          </p>

          <div className="mt-4">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              placeholder="e.g. Research the top 10 med-spas with no website in Denver, draft outreach for each, and add them to my pipeline."
              className="oc-input w-full resize-y px-3.5 py-3 text-[14px] leading-relaxed"
            />
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <span className="text-[11.5px] text-[color:var(--oc-text)]/50">Bounded budget · every action audited</span>
              <button type="button" onClick={run} disabled={busy || !goal.trim()}
                className="oc-btn inline-flex items-center gap-1.5 px-4 py-2 text-[13px] disabled:opacity-50">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</> : <>Launch agent <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </div>

          {result && (
            <div className={`mt-4 rounded-[12px] border px-4 py-3 text-[13px] ${
              result.kind === 'soon' ? 'border-[color:var(--oc-amber)]/30 bg-[color:var(--oc-amber)]/[0.07] text-[color:var(--oc-ink)]'
              : result.kind === 'running' ? 'border-[color:var(--oc-green-d)]/30 bg-[color:var(--oc-green)]/[0.08] text-[color:var(--oc-ink)]'
              : 'border-[color:var(--oc-red)]/30 bg-[color:var(--oc-red)]/[0.06] text-[color:var(--oc-red)]'}`}>
              {result.text}{result.sessionId ? ` (${result.sessionId})` : ''}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Step icon={Target} title="1 · Goal" body="Say the outcome in plain language. No workflow to build." />
          <Step icon={Cpu} title="2 · Autonomous" body="The agent plans, calls your tools, checks its own work, and keeps going until done." />
          <Step icon={ScrollText} title="3 · Receipts" body="Every action it took — with your money and your clients — logged and reversible." />
        </div>

        {/* Guardrails */}
        <div className="mt-3 flex items-start gap-2.5 rounded-[12px] border border-[color:var(--oc-border)] bg-white p-3.5 text-[12.5px] text-[color:var(--oc-text)]/70">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-green-d)]" />
          <span><span className="font-semibold text-[color:var(--oc-ink)]">Guardrails on by default.</span> Hard budget caps, money/comms actions gated for approval, and a full audit trail — before it ever touches a client.</span>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-[color:var(--oc-text)]/45">
          <Sparkles className="h-3 w-3" /> Powered by 0nAGENT — launching soon.
        </p>
      </div>
    </div>
  )
}

function Step({ icon: Icon, title, body }: { icon: typeof Target; title: string; body: string }) {
  return (
    <div className="oc-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--oc-green-d)]"><Icon className="h-3.5 w-3.5" /> {title}</div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/70">{body}</p>
    </div>
  )
}
