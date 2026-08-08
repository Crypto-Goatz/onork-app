'use client'

/**
 * The customer portal — clean, dark, client-facing. One sub-account's own world:
 * their numbers, what's been done for them, how to get help, and their tasks.
 *
 * Deliberately NOT the agency chrome. An agency's client should never see the
 * cross-client machinery — just their company, presented well. Data is the same
 * ownership-checked source the agency dashboard uses (/api/clients/:id); auth is
 * the shared app JWT via useSso, so the login gate matches the rest of the site.
 */
import { useEffect, useState } from 'react'
import {
  Users, Workflow, Receipt, Mail, Phone, MapPin, Globe, Loader2,
  LifeBuoy, MessageSquareText, ArrowUpRight, CheckSquare, Sparkles, LogOut,
} from 'lucide-react'
import { useSso, authHeaders, STORAGE_KEY } from '@/app/crm/useSso'
import { LockGate } from '@/components/auth/LockGate'
import { createClient } from '@/lib/supabase/client'

interface Detail {
  client: { id: string; name: string; email?: string | null; phone?: string | null; city?: string | null; state?: string | null; website?: string | null }
  contacts: number | null
  workflows: { name?: string; status?: string }[] | null
  receipts: { capability: string; status: string; detail: string | null; created_at: string }[]
}

export default function CustomerPortal({ locationId }: { locationId: string }) {
  const sso = useSso()
  const [d, setD] = useState<Detail | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (sso.state === 'pending' || !sso.token) return
    let live = true
    fetch(`/api/clients/${encodeURIComponent(locationId)}`, { headers: authHeaders(sso.token) })
      .then((r) => r.json())
      .then((j) => { if (live) (j?.error ? setErr(j.error) : setD(j)) })
      .catch(() => { if (live) setErr('Could not load your portal.') })
    return () => { live = false }
  }, [sso.state, sso.token, locationId])

  const signOut = async () => {
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
    try { await createClient().auth.signOut() } catch {}
    window.location.href = `/login?next=/portal/${locationId}`
  }

  if (sso.state === 'standalone' || sso.state === 'rejected') {
    return <LockGate next={`/portal/${locationId}`} title="Your portal" subtitle="Sign in to view your company dashboard." />
  }

  const name = d?.client.name ?? 'Your company'
  const runs = d?.receipts.length ?? 0

  return (
    <div className="min-h-screen bg-[#080b10] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(110,224,90,0.08),transparent_55%)] text-[#f0f4f8]">
      <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-12">

        {/* Header — company + sign out. The agency's own branding drops in here later. */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#6EE05A]/15 text-sm font-black text-[#6EE05A]">
              {(name || 'C').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold">{name}</div>
              <div className="text-xs text-white/45">Client portal</div>
            </div>
          </div>
          <button onClick={signOut} aria-label="Sign out"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/50 transition-colors hover:border-white/25 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {/* Hero */}
        <div className="mt-9">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#6EE05A]">Welcome</p>
          <h1 className="mt-2 text-balance text-3xl font-black tracking-tight sm:text-4xl">
            {name}.
          </h1>
          <p className="mt-2 max-w-md text-[15px] text-white/55">Everything happening in your account, in one place.</p>
        </div>

        {err && (
          <p className="mt-6 rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/[0.06] px-4 py-3 text-sm text-[#ff8f8f]">{err}</p>
        )}
        {!d && !err && (
          <div className="mt-8 flex items-center gap-2 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Loading your portal…</div>
        )}

        {d && (
          <>
            {/* KPI cards */}
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Kpi icon={Users} label="Contacts" value={d.contacts === null ? '—' : d.contacts.toLocaleString()} />
              <Kpi icon={Workflow} label="Automations" value={d.workflows === null ? '—' : String(d.workflows.length)} />
              <Kpi icon={Receipt} label="Actions done" value={String(runs)} />
            </div>

            {/* Company details */}
            {(d.client.email || d.client.phone || d.client.city || d.client.website) && (
              <Card className="mt-4">
                <CardTitle>Your details</CardTitle>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {d.client.email && <Line icon={Mail} text={d.client.email} />}
                  {d.client.phone && <Line icon={Phone} text={d.client.phone} />}
                  {(d.client.city || d.client.state) && <Line icon={MapPin} text={[d.client.city, d.client.state].filter(Boolean).join(', ')} />}
                  {d.client.website && <Line icon={Globe} text={d.client.website} />}
                </div>
              </Card>
            )}

            {/* Recent activity */}
            <Card className="mt-4">
              <CardTitle>Recent activity</CardTitle>
              {d.receipts.length === 0 ? (
                <p className="mt-3 text-sm text-white/45">Nothing yet — your team's work will show up here.</p>
              ) : (
                <div className="mt-3 space-y-1.5">
                  {d.receipts.slice(0, 8).map((r, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${r.status === 'ok' ? 'bg-[#6EE05A]' : r.status === 'failed' ? 'bg-[#ff6b6b]' : 'bg-[#f59e0b]'}`} />
                      <div className="min-w-0">
                        <div className="text-[13px] text-white/85">{r.detail || r.capability}</div>
                        <div className="mt-0.5 font-mono text-[10.5px] text-white/35">{r.capability}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Support block — agency-configurable later; a real, working slot now. */}
            <Card className="mt-4">
              <CardTitle>Need a hand?</CardTitle>
              <p className="mt-1.5 text-sm text-white/55">Your team is one message away.</p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <a href={d.client.email ? `mailto:${d.client.email}` : '#'}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:border-[#6EE05A]/40">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#6EE05A]/15 text-[#6EE05A]"><MessageSquareText className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block text-[13px] font-semibold">Send a message</span><span className="block truncate text-xs text-white/45">Get help from your team</span></span>
                </a>
                <a href="#"
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:border-[#6EE05A]/40">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#6EE05A]/15 text-[#6EE05A]"><LifeBuoy className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block text-[13px] font-semibold">Open a support ticket</span><span className="block truncate text-xs text-white/45">Track it to resolution</span></span>
                </a>
              </div>
            </Card>

            {/* 0nTask cross-promo */}
            <a href="https://app.0ntask.com" target="_blank" rel="noreferrer"
              className="mt-4 flex items-center gap-4 rounded-2xl border border-[#16a34a]/25 bg-[#16a34a]/[0.07] p-4 transition-transform hover:scale-[1.005]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#16a34a]/20 text-[#4ade80]"><CheckSquare className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[15px] font-bold">Manage your tasks with 0nTask <Sparkles className="h-3.5 w-3.5 text-[#4ade80]" /></div>
                <p className="text-xs text-white/55">One screen for tasks — you, your team, and AI, side by side.</p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40" />
            </a>

            <p className="mt-8 text-center text-[11px] text-white/30">Powered by 0nCORE</p>
          </>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45"><Icon className="h-3 w-3" /> {label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 ${className}`}>{children}</div>
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/70">{children}</h2>
}

function Line({ icon: Icon, text }: { icon: typeof Mail; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-white/75">
      <Icon className="h-3.5 w-3.5 shrink-0 text-white/35" /> <span className="truncate">{text}</span>
    </div>
  )
}
