'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, MessageSquare, PhoneCall, Workflow, Magnet, GitBranch, Calendar, Filter,
  CreditCard, Share2, GraduationCap, ShoppingCart, Palette, PenLine, Wand2, Globe,
  Bot, Phone, Receipt, Search, Cpu, ToggleRight, Users, BarChart3, MousePointerClick,
  Database, Star, MapPin, ShieldCheck, Megaphone, LayoutTemplate, Activity, Building2,
  Tag, Boxes, Camera, PanelsTopLeft, Shuffle, List, LayoutGrid, ArrowLeft, ChevronUp,
  ChevronDown, Sparkles, type LucideIcon,
} from 'lucide-react'

type Cap = { icon: LucideIcon; name: string }
type Outcome = { id: string; label: string; icon: LucideIcon; caps: Cap[] }

const C = ['#7ed957', '#00d4ff', '#a78bfa']
const color = (i: number) => C[i % C.length]

const OUTCOMES: Outcome[] = [
  { id: 'nurture', label: 'Nurture a Lead', icon: Magnet, caps: [
    { icon: Mail, name: 'Email Campaigns' }, { icon: MessageSquare, name: 'Text Message' },
    { icon: PhoneCall, name: 'AI Voice Surveys' }, { icon: Workflow, name: 'Drip Automations' },
    { icon: GitBranch, name: 'Pipeline Tracking' }, { icon: Bot, name: 'Conversation AI' } ] },
  { id: 'book', label: 'Book More Appointments', icon: Calendar, caps: [
    { icon: Calendar, name: 'Smart Booking' }, { icon: PhoneCall, name: 'AI Voice Booking' },
    { icon: MessageSquare, name: 'SMS Reminders' }, { icon: Filter, name: 'Booking Funnels' },
    { icon: Workflow, name: 'No-show Recovery' } ] },
  { id: 'launch', label: 'Launch a Product', icon: Sparkles, caps: [
    { icon: Filter, name: 'Sales Funnels' }, { icon: Mail, name: 'Launch Sequences' },
    { icon: CreditCard, name: 'Stripe Checkout' }, { icon: Share2, name: 'Social Blast' },
    { icon: GraduationCap, name: 'Course Builder' }, { icon: LayoutTemplate, name: 'Landing Pages' } ] },
  { id: 'recover', label: 'Recover Lost Revenue', icon: ShoppingCart, caps: [
    { icon: ShoppingCart, name: 'Abandoned Cart' }, { icon: MessageSquare, name: 'Win-back SMS' },
    { icon: Mail, name: 'Re-engagement Email' }, { icon: Workflow, name: 'Win-back Flows' },
    { icon: CreditCard, name: 'Payment Retry' } ] },
  { id: 'brand', label: 'Build Your Brand', icon: Palette, caps: [
    { icon: Palette, name: 'Brand Builder' }, { icon: Share2, name: 'Social Planner' },
    { icon: PenLine, name: 'AI Blog' }, { icon: Wand2, name: 'AI Content' },
    { icon: Globe, name: 'Website Builder' } ] },
  { id: 'close', label: 'Close More Deals', icon: GitBranch, caps: [
    { icon: GitBranch, name: 'Pipeline' }, { icon: Bot, name: 'Conversation AI' },
    { icon: Phone, name: 'Power Dialer' }, { icon: Receipt, name: 'Invoices & Quotes' },
    { icon: Workflow, name: 'Follow-up Engine' } ] },
  { id: 'grow', label: 'Grow Your Audience', icon: Megaphone, caps: [
    { icon: Share2, name: 'Social' }, { icon: PenLine, name: 'Blog' },
    { icon: Search, name: 'SXO / SEO' }, { icon: Magnet, name: 'Lead Magnets' },
    { icon: Mail, name: 'Newsletter' } ] },
  { id: 'automate', label: 'Automate Your Business', icon: Workflow, caps: [
    { icon: Workflow, name: 'Visual Automations' }, { icon: Wand2, name: 'Agentic Generator' },
    { icon: ToggleRight, name: 'Switches' }, { icon: Cpu, name: 'CrewAI Agents' },
    { icon: GitBranch, name: 'Triggers & Webhooks' } ] },
  { id: 'understand', label: 'Understand Your Customers', icon: BarChart3, caps: [
    { icon: BarChart3, name: 'Analytics' }, { icon: MousePointerClick, name: 'CRO9 Engine' },
    { icon: Database, name: 'List Enrichment' }, { icon: PhoneCall, name: 'AI Surveys' },
    { icon: Star, name: 'Review Insights' } ] },
  { id: 'reviews', label: 'Get More Reviews', icon: Star, caps: [
    { icon: MapPin, name: 'Business Profile' }, { icon: MessageSquare, name: 'Review Requests' },
    { icon: Bot, name: 'AI Review Replies' }, { icon: ShieldCheck, name: 'Reputation Guard' },
    { icon: Mail, name: 'Follow-up Asks' } ] },
  { id: 'ads', label: 'Run Ad Campaigns', icon: Megaphone, caps: [
    { icon: Megaphone, name: 'Paid Ads' }, { icon: MousePointerClick, name: 'CRO9 Optimizer' },
    { icon: LayoutTemplate, name: 'Landing Pages' }, { icon: Activity, name: 'Conversion Tracking' },
    { icon: BarChart3, name: 'Ad Analytics' } ] },
  { id: 'scale', label: 'Scale Your Agency', icon: Building2, caps: [
    { icon: Building2, name: 'Sub-accounts' }, { icon: Tag, name: 'White-label' },
    { icon: Boxes, name: 'SaaS Factory' }, { icon: Camera, name: 'Snapshot Deploy' },
    { icon: PanelsTopLeft, name: 'Client Portals' } ] },
]

const mod = (n: number, m: number) => ((n % m) + m) % m

/* ─── Radial capability burst (shared by both modes) ─────────────── */
function CapabilityBurst({ outcome, onBack }: { outcome: Outcome; onBack: () => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const n = outcome.caps.length
  const R = 168
  const Icon = outcome.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
      className="relative mx-auto flex h-[460px] w-full max-w-[560px] items-center justify-center"
    >
      <button onClick={onBack} className="absolute left-0 top-0 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-white/70 backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {/* connectors */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="-280 -230 560 460">
        {outcome.caps.map((_, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2
          return (
            <motion.line key={i} x1={0} y1={0} x2={Math.cos(a) * R} y2={Math.sin(a) * R}
              stroke={hover === i ? color(i) : 'rgba(255,255,255,0.10)'} strokeWidth={hover === i ? 1.5 : 1}
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }} />
          )
        })}
      </svg>

      {/* center outcome */}
      <motion.div layoutId={`outcome-${outcome.id}`} className="absolute z-20 flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-[#0d1117]" style={{ borderColor: '#7ed95755', boxShadow: '0 0 40px rgba(126,217,87,0.3)' }}>
          <Icon className="h-9 w-9 text-[#7ed957]" />
        </div>
        <div className="mt-3 max-w-[160px] text-center text-sm font-black leading-tight text-white">{outcome.label}</div>
        <div className="mt-1 h-4 font-mono text-[10px] uppercase tracking-widest text-[#7ed957]">
          {hover !== null ? outcome.caps[hover].name : `${n} capabilities`}
        </div>
      </motion.div>

      {/* capability icons */}
      {outcome.caps.map((cap, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        const x = Math.cos(a) * R, y = Math.sin(a) * R
        const Ci = cap.icon, col = color(i)
        return (
          <motion.div key={cap.name} className="absolute z-30"
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }} animate={{ x, y, scale: 1, opacity: 1 }} exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            transition={{ delay: 0.12 + i * 0.05, type: 'spring', stiffness: 220, damping: 18 }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <motion.div whileHover={{ scale: 1.18 }} className="group relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border bg-[#0d1117] backdrop-blur"
              style={{ borderColor: `${col}${hover === i ? 'aa' : '40'}`, boxShadow: `0 0 ${hover === i ? 28 : 16}px ${col}${hover === i ? '55' : '22'}` }}>
              <Ci className="h-6 w-6" style={{ color: col }} />
              <AnimatePresence>
                {hover === i && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/15 bg-[#020810] px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl">
                    {cap.name}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

/* ─── Cards mode (3 at a time + shuffle) ─────────────────────────── */
function CardsMode({ onPick }: { onPick: (o: Outcome) => void }) {
  const [trio, setTrio] = useState<number[]>([0, 1, 2])
  const shuffle = () => {
    const idxs = [...OUTCOMES.keys()].sort(() => Math.random() - 0.5).slice(0, 3)
    setTrio(idxs)
  }
  return (
    <div className="flex flex-col items-center">
      <div className="grid w-full gap-5 sm:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {trio.map((idx, slot) => {
            const o = OUTCOMES[idx]; const Icon = o.icon; const col = color(slot)
            return (
              <motion.button key={o.id} layout
                initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -24, scale: 0.95 }}
                transition={{ duration: 0.35 }} onClick={() => onPick(o)} whileHover={{ y: -4 }}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 text-left backdrop-blur transition-colors hover:border-white/[0.2]">
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-[60px] transition-opacity duration-500 group-hover:opacity-100" style={{ background: col }} />
                <div className="relative">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border bg-[#0d1117]" style={{ borderColor: `${col}40`, boxShadow: `0 0 24px ${col}22` }}>
                    <Icon className="h-6 w-6" style={{ color: col }} />
                  </div>
                  <div className="text-lg font-black tracking-tight text-white">{o.label}</div>
                  <div className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-white/45">
                    {o.caps.length} capabilities <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
      <button onClick={shuffle} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#7ed957] px-6 py-3 text-sm font-bold text-[#020810] shadow-[0_0_28px_rgba(126,217,87,0.35)] transition-transform hover:scale-[1.03]">
        <Shuffle className="h-4 w-4" /> Shuffle outcomes
      </button>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-white/35">12 outcomes · 60+ capabilities · endless combinations</p>
    </div>
  )
}

/* ─── List mode (rotating accordion, 5 visible, blurred edges) ───── */
function ListMode({ onPick }: { onPick: (o: Outcome) => void }) {
  const [center, setCenter] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const N = OUTCOMES.length
  const start = (dir: number) => {
    stop(); setCenter((c) => mod(c + dir, N))
    timer.current = setInterval(() => setCenter((c) => mod(c + dir, N)), 550)
  }
  const stop = () => { if (timer.current) { clearInterval(timer.current); timer.current = null } }
  useEffect(() => () => stop(), [])

  const slots = [-2, -1, 0, 1, 2]
  const styleFor = (s: number) => {
    const abs = Math.abs(s)
    return { y: s * 86, opacity: abs === 2 ? 0.28 : abs === 1 ? 0.9 : 1, scale: abs === 2 ? 0.82 : abs === 1 ? 0.94 : 1.06, blur: abs === 2 ? 3.5 : 0, z: 30 - abs * 10 }
  }

  return (
    <div className="flex flex-col items-center">
      <button onMouseEnter={() => start(-1)} onMouseLeave={stop} onClick={() => setCenter((c) => mod(c - 1, N))}
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/60 transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]">
        <ChevronUp className="h-5 w-5" />
      </button>

      <div className="relative h-[460px] w-full max-w-md overflow-hidden">
        {/* edge fades */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-40 h-28 bg-gradient-to-b from-[#020810] to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-28 bg-gradient-to-t from-[#020810] to-transparent" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <AnimatePresence initial={false}>
            {slots.map((s) => {
              const o = OUTCOMES[mod(center + s, N)]
              const st = styleFor(s); const Icon = o.icon; const col = color(mod(center + s, N))
              const clickable = s === 0
              return (
                <motion.button key={o.id} layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ y: st.y, opacity: st.opacity, scale: st.scale, filter: `blur(${st.blur}px)`, zIndex: st.z }}
                  exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                  onClick={() => clickable && onPick(o)}
                  style={{ pointerEvents: clickable ? 'auto' : 'none' }}
                  className={`absolute left-1/2 top-0 flex w-[340px] -translate-x-1/2 items-center gap-4 rounded-2xl border p-4 backdrop-blur ${clickable ? 'cursor-pointer border-[#7ed957]/40 bg-gradient-to-r from-[#7ed957]/[0.08] to-transparent' : 'border-white/[0.08] bg-white/[0.02]'}`}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-[#0d1117]" style={{ borderColor: `${col}40`, boxShadow: clickable ? `0 0 24px ${col}33` : 'none' }}>
                    <Icon className="h-6 w-6" style={{ color: col }} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-black tracking-tight text-white">{o.label}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">{o.caps.length} capabilities{clickable ? ' · click to open' : ''}</div>
                  </div>
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      <button onMouseEnter={() => start(1)} onMouseLeave={stop} onClick={() => setCenter((c) => mod(c + 1, N))}
        className="mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/60 transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]">
        <ChevronDown className="h-5 w-5" />
      </button>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-white/35">Hover the arrows to glide · click the center to open</p>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function PossibilitiesExplorer() {
  const [mode, setMode] = useState<'cards' | 'list'>('cards')
  const [selected, setSelected] = useState<Outcome | null>(null)

  return (
    <main className="min-h-screen bg-[#020810] font-sans text-white antialiased">
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.06] blur-[160px]" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
          <span className="mb-5 inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">Interactive · pick an outcome</span>
          <h1 className="text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block text-white">What do you want</span>
            <span className="block bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">to make happen?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">Choose an outcome. Watch 0nCore reveal every capability it fires to get you there. There's no end to the combinations.</p>
        </div>

        {/* mode toggle */}
        <div className="relative mx-auto mb-10 flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur">
          {([['cards', LayoutGrid, 'Shuffle'], ['list', List, 'Browse']] as const).map(([m, Icon, label]) => (
            <button key={m} onClick={() => { setMode(m); setSelected(null) }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${mode === m ? 'bg-[#7ed957] text-[#020810]' : 'text-white/60 hover:text-white'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* stage */}
        <div className="relative mx-auto min-h-[500px] max-w-4xl px-6 pb-28">
          <AnimatePresence mode="wait">
            {selected ? (
              <CapabilityBurst key="burst" outcome={selected} onBack={() => setSelected(null)} />
            ) : mode === 'cards' ? (
              <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CardsMode onPick={setSelected} />
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ListMode onPick={setSelected} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  )
}
