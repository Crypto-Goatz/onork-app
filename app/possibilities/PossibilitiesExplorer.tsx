'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, MessageSquare, PhoneCall, Workflow, Magnet, GitBranch, Calendar, Filter,
  CreditCard, Share2, GraduationCap, ShoppingCart, Palette, PenLine, Wand2, Globe,
  Bot, Phone, Receipt, Search, Cpu, ToggleRight, BarChart3, MousePointerClick,
  Database, Star, MapPin, ShieldCheck, Megaphone, LayoutTemplate, Activity, Building2,
  Tag, Boxes, Camera, PanelsTopLeft, Shuffle, List, LayoutGrid, ArrowLeft, ChevronUp,
  ChevronDown, Plus, Minus, type LucideIcon,
} from 'lucide-react'

const C = ['#7ed957', '#00d4ff', '#a78bfa']
const color = (i: number) => C[i % C.length]

/* ── Capability library: icon + one-line explainer ─────────────────── */
const CAP_LIB: Record<string, { icon: LucideIcon; desc: string }> = {
  'Email Campaigns': { icon: Mail, desc: 'Design, send, and A/B-test broadcast and drip email to any segment — AI writes it in your voice.' },
  'Text Message': { icon: MessageSquare, desc: 'Two-way SMS conversations and blasts that land in the same inbox as everything else.' },
  'AI Voice Surveys': { icon: PhoneCall, desc: 'An AI agent calls your list, asks your questions, and logs every answer back to the contact.' },
  'Drip Automations': { icon: Workflow, desc: 'Time-released sequences that nurture a lead across days or weeks without you touching it.' },
  'Pipeline Tracking': { icon: GitBranch, desc: 'Every lead moves through visual stages with AI-scored priority and auto follow-ups.' },
  'Conversation AI': { icon: Bot, desc: 'An AI that reads the thread and replies in your tone across SMS, email, and chat.' },
  'Smart Booking': { icon: Calendar, desc: 'Real-time availability, timezone-aware, syncs both ways with your calendar.' },
  'AI Voice Booking': { icon: PhoneCall, desc: 'The AI answers the phone, checks your calendar, and books the appointment — sounds human.' },
  'SMS Reminders': { icon: MessageSquare, desc: 'Automatic confirmations and reminders that crush no-shows.' },
  'Booking Funnels': { icon: Filter, desc: 'Purpose-built pages that turn a click into a confirmed appointment.' },
  'No-show Recovery': { icon: Workflow, desc: 'Missed the slot? An automation re-engages and re-books them instantly.' },
  'Sales Funnels': { icon: Filter, desc: 'Multi-step pages with upsells and order bumps, built in minutes.' },
  'Launch Sequences': { icon: Mail, desc: 'Pre-built email arcs that build anticipation and convert on launch day.' },
  'Stripe Checkout': { icon: CreditCard, desc: 'Take payments and subscriptions natively — even inside an AI chat.' },
  'Social Blast': { icon: Share2, desc: 'One idea, posted everywhere — platform-optimized by AI, scheduled at once.' },
  'Course Builder': { icon: GraduationCap, desc: 'Describe a topic; AI generates the curriculum, lessons, and quizzes into your portal.' },
  'Landing Pages': { icon: LayoutTemplate, desc: 'High-converting pages with built-in tracking and CRO9 optimization.' },
  'Abandoned Cart': { icon: ShoppingCart, desc: 'Detects drop-off and fires the win-back sequence automatically.' },
  'Win-back SMS': { icon: MessageSquare, desc: 'Perfectly-timed texts that recover revenue you already earned.' },
  'Re-engagement Email': { icon: Mail, desc: 'Reawaken cold contacts with AI-personalized comeback offers.' },
  'Win-back Flows': { icon: Workflow, desc: 'Branching automations that escalate until they convert or opt out.' },
  'Payment Retry': { icon: CreditCard, desc: 'Failed charges retry on smart schedules so you stop leaking MRR.' },
  'Brand Builder': { icon: Palette, desc: 'Lock your colors, fonts, and voice; AI applies them everywhere automatically.' },
  'Social Planner': { icon: Share2, desc: 'Plan, generate, and auto-publish across every connected platform.' },
  'AI Blog': { icon: PenLine, desc: 'SEO-aware articles drafted, illustrated, and published on a schedule.' },
  'AI Content': { icon: Wand2, desc: 'On-brand copy for any surface from a single sentence of intent.' },
  'Website Builder': { icon: Globe, desc: 'Spin up a full site or funnel with native hosting and tracking.' },
  'Pipeline': { icon: GitBranch, desc: 'Drag-and-drop deal stages with AI prioritization and reminders.' },
  'Power Dialer': { icon: Phone, desc: 'Click-to-call with logging, recording, and AI call summaries.' },
  'Invoices & Quotes': { icon: Receipt, desc: 'Send, track, and collect — with auto-reminders until it is paid.' },
  'Follow-up Engine': { icon: Workflow, desc: 'Never drop a deal; AI schedules the next touch at the right moment.' },
  'Social': { icon: Share2, desc: 'Publish and engage across 7 platforms from one place.' },
  'Blog': { icon: PenLine, desc: 'A content engine that compounds your organic reach.' },
  'SXO / SEO': { icon: Search, desc: 'Search-experience optimization wired to real Search Console data.' },
  'Lead Magnets': { icon: Magnet, desc: 'Capture pages and gated assets that grow your list on autopilot.' },
  'Newsletter': { icon: Mail, desc: 'Recurring sends with AI assembly and deliverability built in.' },
  'Visual Automations': { icon: Workflow, desc: 'A drag-and-drop canvas where any trigger fires any tool.' },
  'Agentic Generator': { icon: Wand2, desc: 'Describe an outcome; the agent picks the tools and builds the workflow.' },
  'Switches': { icon: ToggleRight, desc: 'Save any run as a portable, replayable .0n file.' },
  'CrewAI Agents': { icon: Cpu, desc: 'Multi-agent crews that research, write, and act in parallel.' },
  'Triggers & Webhooks': { icon: GitBranch, desc: 'Fire flows from CRM events, cron, raw HTTP, or any MCP tool.' },
  'Analytics': { icon: BarChart3, desc: 'Real GA4 + Search Console data unified into one cockpit.' },
  'CRO9 Engine': { icon: MousePointerClick, desc: 'AI rewrites your copy live and learns what converts via Thompson sampling.' },
  'List Enrichment': { icon: Database, desc: 'Detect the full tech and marketing stack behind any contact or site.' },
  'AI Surveys': { icon: PhoneCall, desc: 'Voice or text surveys that gather intel and score intent.' },
  'Review Insights': { icon: Star, desc: 'Sentiment and themes pulled from every review you receive.' },
  'Business Profile': { icon: MapPin, desc: 'Manage your Google listing, posts, and local insights from inside the CRM.' },
  'Review Requests': { icon: MessageSquare, desc: 'Auto-ask happy customers at the perfect moment to boost ratings.' },
  'AI Review Replies': { icon: Bot, desc: 'AI drafts on-brand responses to every review for your approval.' },
  'Reputation Guard': { icon: ShieldCheck, desc: 'Get alerted on negative sentiment before it spreads.' },
  'Follow-up Asks': { icon: Mail, desc: 'Sequenced nudges that turn silent customers into 5-star reviews.' },
  'Paid Ads': { icon: Megaphone, desc: 'Connect Google and Meta to manage spend and creative in one view.' },
  'CRO9 Optimizer': { icon: MousePointerClick, desc: 'Auto-tunes landing copy against live conversion data.' },
  'Conversion Tracking': { icon: Activity, desc: 'Server-side tracking that ties ad clicks to real revenue.' },
  'Ad Analytics': { icon: BarChart3, desc: 'ROAS, spend, and conversions across platforms, unified.' },
  'Sub-accounts': { icon: Building2, desc: 'Fully isolated workspaces — one per client, managed centrally.' },
  'White-label': { icon: Tag, desc: 'Your brand on the entire dashboard, top to bottom.' },
  'SaaS Factory': { icon: Boxes, desc: 'Provision a complete SaaS for each client in a single shot.' },
  'Snapshot Deploy': { icon: Camera, desc: 'Clone a perfect setup across every sub-account in seconds.' },
  'Client Portals': { icon: PanelsTopLeft, desc: 'Branded /vip portals where each client logs in to their world.' },
}

type Outcome = { id: string; label: string; icon: LucideIcon; caps: string[] }
const OUTCOMES: Outcome[] = [
  { id: 'nurture', label: 'Nurture a Lead', icon: Magnet, caps: ['Email Campaigns', 'Text Message', 'AI Voice Surveys', 'Drip Automations', 'Pipeline Tracking', 'Conversation AI'] },
  { id: 'book', label: 'Book More Appointments', icon: Calendar, caps: ['Smart Booking', 'AI Voice Booking', 'SMS Reminders', 'Booking Funnels', 'No-show Recovery'] },
  { id: 'launch', label: 'Launch a Product', icon: Megaphone, caps: ['Sales Funnels', 'Launch Sequences', 'Stripe Checkout', 'Social Blast', 'Course Builder', 'Landing Pages'] },
  { id: 'recover', label: 'Recover Lost Revenue', icon: ShoppingCart, caps: ['Abandoned Cart', 'Win-back SMS', 'Re-engagement Email', 'Win-back Flows', 'Payment Retry'] },
  { id: 'brand', label: 'Build Your Brand', icon: Palette, caps: ['Brand Builder', 'Social Planner', 'AI Blog', 'AI Content', 'Website Builder'] },
  { id: 'close', label: 'Close More Deals', icon: GitBranch, caps: ['Pipeline', 'Conversation AI', 'Power Dialer', 'Invoices & Quotes', 'Follow-up Engine'] },
  { id: 'grow', label: 'Grow Your Audience', icon: Share2, caps: ['Social', 'Blog', 'SXO / SEO', 'Lead Magnets', 'Newsletter'] },
  { id: 'automate', label: 'Automate Your Business', icon: Workflow, caps: ['Visual Automations', 'Agentic Generator', 'Switches', 'CrewAI Agents', 'Triggers & Webhooks'] },
  { id: 'understand', label: 'Understand Your Customers', icon: BarChart3, caps: ['Analytics', 'CRO9 Engine', 'List Enrichment', 'AI Surveys', 'Review Insights'] },
  { id: 'reviews', label: 'Get More Reviews', icon: Star, caps: ['Business Profile', 'Review Requests', 'AI Review Replies', 'Reputation Guard', 'Follow-up Asks'] },
  { id: 'ads', label: 'Run Ad Campaigns', icon: Megaphone, caps: ['Paid Ads', 'CRO9 Optimizer', 'Landing Pages', 'Conversion Tracking', 'Ad Analytics'] },
  { id: 'scale', label: 'Scale Your Agency', icon: Building2, caps: ['Sub-accounts', 'White-label', 'SaaS Factory', 'Snapshot Deploy', 'Client Portals'] },
]

const mod = (n: number, m: number) => ((n % m) + m) % m

/* ── Digital animated backdrop ─────────────────────────────────────── */
function DigitalBg() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div animate={{ x: [0, 50, 0], y: [0, -36, 0] }} transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 left-[18%] h-[520px] w-[520px] rounded-full bg-[#7ed957]/[0.09] blur-[150px]" />
      <motion.div animate={{ x: [0, -60, 0], y: [0, 44, 0] }} transition={{ duration: 23, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[28%] right-[16%] h-[440px] w-[440px] rounded-full bg-[#00d4ff]/[0.07] blur-[140px]" />
      <motion.div animate={{ x: [0, 36, 0], y: [0, 36, 0] }} transition={{ duration: 27, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-10%] left-[32%] h-[480px] w-[480px] rounded-full bg-[#a78bfa]/[0.07] blur-[160px]" />
      <div className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: 'linear-gradient(rgba(126,217,87,0.45) 1px,transparent 1px),linear-gradient(90deg,rgba(126,217,87,0.45) 1px,transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 78%)',
        }} />
    </div>
  )
}

/* ── Corner targeting reticle ──────────────────────────────────────── */
function Reticle() {
  const corners = [['left-0 top-0', 'border-l-2 border-t-2'], ['right-0 top-0', 'border-r-2 border-t-2'], ['left-0 bottom-0', 'border-l-2 border-b-2'], ['right-0 bottom-0', 'border-r-2 border-b-2']] as const
  return (
    <>
      {corners.map(([pos, b], i) => (
        <motion.div key={i} initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }}
          className={`absolute h-6 w-6 ${pos} ${b} rounded-[3px] border-[#7ed957]/40`} />
      ))}
    </>
  )
}

/* ── Radial capability burst (the centerpiece) ─────────────────────── */
function CapabilityBurst({ outcome, onBack }: { outcome: Outcome; onBack: () => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const caps = outcome.caps.map((name) => ({ name, ...CAP_LIB[name] }))
  const n = caps.length
  const R = 232
  const Icon = outcome.icon

  return (
    <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
      className="relative mx-auto flex h-[600px] w-full max-w-[680px] items-center justify-center" onClick={() => setOpen(null)}>
      <button onClick={(e) => { e.stopPropagation(); onBack() }} className="absolute left-0 top-0 z-50 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-white/70 backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <Reticle />

      {/* rotating radar sweep */}
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
        className="absolute h-[540px] w-[540px] rounded-full"
        style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(126,217,87,0.10) 26deg, transparent 56deg)' }} />

      {/* power-surge rings (fire once on open) */}
      {[0, 1, 2].map((i) => (
        <motion.div key={i} initial={{ scale: 0.4, opacity: 0.5 }} animate={{ scale: 2.6, opacity: 0 }} transition={{ duration: 1.4, delay: i * 0.18, ease: 'easeOut' }}
          className="absolute h-[200px] w-[200px] rounded-full border border-[#7ed957]/40" />
      ))}

      {/* counter-rotating HUD rings */}
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        className="absolute h-[150px] w-[150px] rounded-full border border-dashed border-[#7ed957]/30" />
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        className="absolute h-[186px] w-[186px] rounded-full border border-dotted border-[#00d4ff]/20" />

      {/* connectors */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="-340 -300 680 600">
        {caps.map((_, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2
          const lit = hover === i || open === i
          return (
            <motion.line key={i} x1={0} y1={0} x2={Math.cos(a) * R} y2={Math.sin(a) * R}
              stroke={lit ? color(i) : 'rgba(255,255,255,0.09)'} strokeWidth={lit ? 2 : 1}
              strokeDasharray="6 6"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1, strokeDashoffset: lit ? [0, -24] : 0 }}
              transition={{ pathLength: { delay: 0.15 + i * 0.05, duration: 0.45 }, strokeDashoffset: { duration: 0.6, repeat: lit ? Infinity : 0, ease: 'linear' } } as any} />
          )
        })}
      </svg>

      {/* center core */}
      <motion.div layoutId={`outcome-${outcome.id}`} className="absolute z-30 flex flex-col items-center">
        <motion.div animate={{ boxShadow: ['0 0 40px rgba(126,217,87,0.30)', '0 0 64px rgba(126,217,87,0.45)', '0 0 40px rgba(126,217,87,0.30)'] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-24 w-24 items-center justify-center rounded-3xl border bg-[#0d1117]" style={{ borderColor: '#7ed95566' }}>
          <Icon className="h-11 w-11 text-[#7ed957]" />
        </motion.div>
        <div className="mt-3 max-w-[200px] text-center text-base font-black leading-tight text-white">{outcome.label}</div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#7ed957]">{n} capabilities · click to expand</div>
      </motion.div>

      {/* capability nodes */}
      {caps.map((cap, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        const x = Math.cos(a) * R, y = Math.sin(a) * R
        const Ci = cap.icon, col = color(i)
        const isOpen = open === i
        const show = hover === i || isOpen
        const below = y <= 0
        return (
          <motion.div key={cap.name} className="absolute z-40"
            initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: -120 }}
            animate={{ x, y, scale: 1, opacity: 1, rotate: 0 }} exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            transition={{ delay: 0.14 + i * 0.06, type: 'spring', stiffness: 200, damping: 16 }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); setOpen(isOpen ? null : i) }}
              className="relative flex h-[68px] w-[68px] items-center justify-center rounded-2xl border bg-[#0d1117]/90 backdrop-blur"
              style={{ borderColor: `${col}${show ? 'cc' : '40'}`, boxShadow: `0 0 ${show ? 34 : 16}px ${col}${show ? '66' : '22'}` }}>
              <Ci className="h-7 w-7" style={{ color: col }} />

              {/* HUD tooltip */}
              <AnimatePresence>
                {show && (
                  <motion.div
                    initial={{ opacity: 0, y: below ? -6 : 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: below ? -6 : 6, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute left-1/2 w-56 -translate-x-1/2 ${below ? 'top-[80px]' : 'bottom-[80px]'} z-50`}>
                    <div className="overflow-hidden rounded-xl border bg-[#020810]/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)]" style={{ borderColor: `${col}66` }}>
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="text-left text-[13px] font-black leading-tight text-white">{cap.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setOpen(isOpen ? null : i) }}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-white"
                          style={{ borderColor: `${col}88`, background: `${col}1a` }} aria-label={isOpen ? 'Collapse' : 'Expand'}>
                          {isOpen ? <Minus className="h-3 w-3" style={{ color: col }} /> : <Plus className="h-3 w-3" style={{ color: col }} />}
                        </button>
                      </div>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                            <div className="border-t px-3 py-2.5 text-left text-[12px] leading-relaxed text-white/70" style={{ borderColor: `${col}33` }}>
                              {cap.desc}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

/* ── Cards mode (3 at a time + shuffle) ────────────────────────────── */
function CardsMode({ onPick }: { onPick: (o: Outcome) => void }) {
  const [trio, setTrio] = useState<number[]>([0, 1, 2])
  const shuffle = () => setTrio([...OUTCOMES.keys()].sort(() => Math.random() - 0.5).slice(0, 3))
  return (
    <div className="flex flex-col items-center">
      <div className="grid w-full gap-5 sm:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {trio.map((idx, slot) => {
            const o = OUTCOMES[idx]; const Icon = o.icon; const col = color(slot)
            return (
              <motion.button key={o.id} layout
                initial={{ opacity: 0, y: 28, scale: 0.94, rotateX: 20 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }} exit={{ opacity: 0, y: -28, scale: 0.94 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 160, damping: 18 }} onClick={() => onPick(o)} whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 text-left backdrop-blur transition-colors hover:border-white/[0.22]">
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-0 blur-[64px] transition-opacity duration-500 group-hover:opacity-100" style={{ background: col }} />
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
      <button onClick={shuffle} className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#7ed957] px-6 py-3 text-sm font-bold text-[#020810] shadow-[0_0_28px_rgba(126,217,87,0.35)] transition-transform hover:scale-[1.03]">
        <Shuffle className="h-4 w-4" /> Shuffle outcomes
      </button>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-white/35">12 outcomes · 60+ capabilities · endless combinations</p>
    </div>
  )
}

/* ── List mode (rotating accordion) ────────────────────────────────── */
function ListMode({ onPick }: { onPick: (o: Outcome) => void }) {
  const [center, setCenter] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const N = OUTCOMES.length
  const stop = () => { if (timer.current) { clearInterval(timer.current); timer.current = null } }
  const start = (dir: number) => { stop(); setCenter((c) => mod(c + dir, N)); timer.current = setInterval(() => setCenter((c) => mod(c + dir, N)), 520) }
  useEffect(() => () => stop(), [])
  const slots = [-2, -1, 0, 1, 2]
  const styleFor = (s: number) => { const abs = Math.abs(s); return { y: s * 92, opacity: abs === 2 ? 0.26 : abs === 1 ? 0.9 : 1, scale: abs === 2 ? 0.8 : abs === 1 ? 0.93 : 1.07, blur: abs === 2 ? 4 : 0, z: 30 - abs * 10 } }
  return (
    <div className="flex flex-col items-center">
      <button onMouseEnter={() => start(-1)} onMouseLeave={stop} onClick={() => setCenter((c) => mod(c - 1, N))}
        className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/60 transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"><ChevronUp className="h-5 w-5" /></button>
      <div className="relative h-[500px] w-full max-w-md overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-40 h-32 bg-gradient-to-b from-[#020810] via-[#020810]/80 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-32 bg-gradient-to-t from-[#020810] via-[#020810]/80 to-transparent" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <AnimatePresence initial={false}>
            {slots.map((s) => {
              const o = OUTCOMES[mod(center + s, N)]; const st = styleFor(s); const Icon = o.icon; const col = color(mod(center + s, N)); const clickable = s === 0
              return (
                <motion.button key={o.id} layout initial={{ opacity: 0, scale: 0.78 }}
                  animate={{ y: st.y, opacity: st.opacity, scale: st.scale, filter: `blur(${st.blur}px)`, zIndex: st.z }} exit={{ opacity: 0, scale: 0.78 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 28 }} onClick={() => clickable && onPick(o)} style={{ pointerEvents: clickable ? 'auto' : 'none' }}
                  className={`absolute left-1/2 top-0 flex w-[360px] -translate-x-1/2 items-center gap-4 rounded-2xl border p-4 backdrop-blur ${clickable ? 'cursor-pointer border-[#7ed957]/45 bg-gradient-to-r from-[#7ed957]/[0.10] to-transparent' : 'border-white/[0.08] bg-white/[0.02]'}`}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-[#0d1117]" style={{ borderColor: `${col}40`, boxShadow: clickable ? `0 0 24px ${col}33` : 'none' }}><Icon className="h-6 w-6" style={{ color: col }} /></div>
                  <div className="min-w-0"><div className="truncate text-base font-black tracking-tight text-white">{o.label}</div><div className="font-mono text-[10px] uppercase tracking-widest text-white/45">{o.caps.length} capabilities{clickable ? ' · click to open' : ''}</div></div>
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
      <button onMouseEnter={() => start(1)} onMouseLeave={stop} onClick={() => setCenter((c) => mod(c + 1, N))}
        className="mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/60 transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"><ChevronDown className="h-5 w-5" /></button>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-white/35">Hover the arrows to glide · click the center to open</p>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function PossibilitiesExplorer() {
  const [mode, setMode] = useState<'cards' | 'list'>('cards')
  const [selected, setSelected] = useState<Outcome | null>(null)
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020810] font-sans text-white antialiased">
      <DigitalBg />
      <section className="relative">
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-14 text-center">
          <span className="mb-5 inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">Interactive · pick an outcome</span>
          <h1 className="text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block text-white">What do you want</span>
            <span className="block bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">to make happen?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">Choose an outcome. Watch 0nCore assemble every capability it fires to get you there.</p>
        </div>

        <div className="relative mx-auto mb-10 flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur">
          {([['cards', LayoutGrid, 'Shuffle'], ['list', List, 'Browse']] as const).map(([m, Icon, label]) => (
            <button key={m} onClick={() => { setMode(m); setSelected(null) }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${mode === m ? 'bg-[#7ed957] text-[#020810]' : 'text-white/60 hover:text-white'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="relative mx-auto min-h-[620px] max-w-4xl px-6 pb-28">
          <AnimatePresence mode="wait">
            {selected ? (
              <CapabilityBurst key="burst" outcome={selected} onBack={() => setSelected(null)} />
            ) : mode === 'cards' ? (
              <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CardsMode onPick={setSelected} /></motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ListMode onPick={setSelected} /></motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  )
}
