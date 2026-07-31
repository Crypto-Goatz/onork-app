'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, MessageSquare, PhoneCall, Workflow, Magnet, GitBranch, Calendar, Filter,
  CreditCard, Share2, GraduationCap, ShoppingCart, Palette, PenLine, Wand2, Globe,
  Bot, Phone, Receipt, Search, Cpu, ToggleRight, BarChart3, MousePointerClick,
  Database, Star, MapPin, ShieldCheck, Megaphone, LayoutTemplate, Activity, Building2,
  Tag, Boxes, Camera, PanelsTopLeft, Shuffle, List, LayoutGrid, ChevronUp, ChevronDown,
  ChevronRight, type LucideIcon,
} from 'lucide-react'

const C = ['#7ed957', '#00d4ff', '#a78bfa']
const color = (i: number) => C[i % C.length]

type Cap = { icon: LucideIcon; desc: string; subs: string[] }
const CAP_LIB: Record<string, Cap> = {
  'Email Campaigns': { icon: Mail, desc: 'Design, send, and A/B-test broadcast and drip email — AI writes it in your voice.', subs: ['Broadcasts', 'Drip sequences', 'A/B testing'] },
  'Text Message': { icon: MessageSquare, desc: 'Two-way SMS conversations and blasts in the same inbox as everything else.', subs: ['1:1 SMS', 'Bulk blasts', 'Auto-replies'] },
  'AI Voice Surveys': { icon: PhoneCall, desc: 'An AI agent calls your list, asks your questions, and logs every answer to the contact.', subs: ['Outbound calls', 'Branching scripts', 'Answer logging'] },
  'Drip Automations': { icon: Workflow, desc: 'Time-released sequences that nurture a lead across days or weeks, hands-free.', subs: ['Delays & waits', 'Branches', 'Exit rules'] },
  'Pipeline Tracking': { icon: GitBranch, desc: 'Leads move through visual stages with AI-scored priority and auto follow-ups.', subs: ['Stages', 'Lead scoring', 'Reminders'] },
  'Conversation AI': { icon: Bot, desc: 'An AI that reads the thread and replies in your tone across SMS, email, and chat.', subs: ['Tone matching', 'Multi-channel', 'Auto-draft'] },
  'Smart Booking': { icon: Calendar, desc: 'Real-time, timezone-aware availability that syncs both ways with your calendar.', subs: ['Availability', 'Timezones', '2-way sync'] },
  'AI Voice Booking': { icon: PhoneCall, desc: 'The AI answers the phone, checks your calendar, and books the slot — sounds human.', subs: ['Answer calls', 'Check calendar', 'Confirm slot'] },
  'SMS Reminders': { icon: MessageSquare, desc: 'Automatic confirmations and reminders that crush no-shows.', subs: ['Confirmations', 'Reminders', 'Reschedule'] },
  'Booking Funnels': { icon: Filter, desc: 'Purpose-built pages that turn a click into a confirmed appointment.', subs: ['Calendar page', 'Intake form', 'Upsells'] },
  'No-show Recovery': { icon: Workflow, desc: 'Missed the slot? An automation re-engages and re-books instantly.', subs: ['Detect miss', 'Re-engage', 'Re-book'] },
  'Sales Funnels': { icon: Filter, desc: 'Multi-step pages with upsells and order bumps, built in minutes.', subs: ['Order bumps', 'Upsells', 'Downsells'] },
  'Launch Sequences': { icon: Mail, desc: 'Pre-built email arcs that build anticipation and convert on launch day.', subs: ['Tease', 'Open cart', 'Close cart'] },
  'Stripe Checkout': { icon: CreditCard, desc: 'Take payments and subscriptions natively — even inside an AI chat.', subs: ['One-time', 'Subscriptions', 'In-chat pay'] },
  'Social Blast': { icon: Share2, desc: 'One idea, posted everywhere — platform-optimized by AI, scheduled at once.', subs: ['Multi-platform', 'Scheduling', 'AI captions'] },
  'Course Builder': { icon: GraduationCap, desc: 'Describe a topic; AI generates the curriculum, lessons, and quizzes.', subs: ['Curriculum', 'Quizzes', 'Certificates'] },
  'Landing Pages': { icon: LayoutTemplate, desc: 'High-converting pages with built-in tracking and CRO9 optimization.', subs: ['Templates', 'A/B tests', 'CRO9'] },
  'Abandoned Cart': { icon: ShoppingCart, desc: 'Detects drop-off and fires the win-back sequence automatically.', subs: ['Detect drop', 'Trigger flow', 'Recover'] },
  'Win-back SMS': { icon: MessageSquare, desc: 'Perfectly-timed texts that recover revenue you already earned.', subs: ['Timed texts', 'Offers', 'Opt-out'] },
  'Re-engagement Email': { icon: Mail, desc: 'Reawaken cold contacts with AI-personalized comeback offers.', subs: ['Re-warm', 'Personalize', 'Win-back offer'] },
  'Win-back Flows': { icon: Workflow, desc: 'Branching automations that escalate until they convert or opt out.', subs: ['Branches', 'Escalation', 'Exit'] },
  'Payment Retry': { icon: CreditCard, desc: 'Failed charges retry on smart schedules so you stop leaking MRR.', subs: ['Smart retries', 'Dunning', 'Update card'] },
  'Brand Builder': { icon: Palette, desc: 'Lock your colors, fonts, and voice; AI applies them everywhere.', subs: ['Colors', 'Fonts', 'Voice'] },
  'Social Planner': { icon: Share2, desc: 'Plan, generate, and auto-publish across every connected platform.', subs: ['Calendar', 'Auto-publish', 'Queues'] },
  'AI Blog': { icon: PenLine, desc: 'SEO-aware articles drafted, illustrated, and published on a schedule.', subs: ['Drafts', 'Images', 'Schedule'] },
  'AI Content': { icon: Wand2, desc: 'On-brand copy for any surface from a single sentence of intent.', subs: ['Copy', 'Rewrites', 'On-brand'] },
  'Website Builder': { icon: Globe, desc: 'Spin up a full site or funnel with native hosting and tracking.', subs: ['Pages', 'Hosting', 'Tracking'] },
  'Pipeline': { icon: GitBranch, desc: 'Drag-and-drop deal stages with AI prioritization and reminders.', subs: ['Stages', 'Priority', 'Reminders'] },
  'Power Dialer': { icon: Phone, desc: 'Click-to-call with logging, recording, and AI call summaries.', subs: ['Click-to-call', 'Recording', 'AI summary'] },
  'Invoices & Quotes': { icon: Receipt, desc: 'Send, track, and collect — with auto-reminders until it is paid.', subs: ['Send', 'Track', 'Collect'] },
  'Follow-up Engine': { icon: Workflow, desc: 'Never drop a deal; AI schedules the next touch at the right moment.', subs: ['Next touch', 'Cadence', 'Reminders'] },
  'Social': { icon: Share2, desc: 'Publish and engage across 7 platforms from one place.', subs: ['7 platforms', 'Engage', 'Publish'] },
  'Blog': { icon: PenLine, desc: 'A content engine that compounds your organic reach.', subs: ['Articles', 'SEO', 'Schedule'] },
  'SXO / SEO': { icon: Search, desc: 'Search-experience optimization wired to real Search Console data.', subs: ['Keywords', 'Rankings', 'Optimize'] },
  'Lead Magnets': { icon: Magnet, desc: 'Capture pages and gated assets that grow your list on autopilot.', subs: ['Capture pages', 'Gated assets', 'List growth'] },
  'Newsletter': { icon: Mail, desc: 'Recurring sends with AI assembly and deliverability built in.', subs: ['Templates', 'Send', 'Deliverability'] },
  'Visual Automations': { icon: Workflow, desc: 'A drag-and-drop canvas where any trigger fires any tool.', subs: ['Triggers', 'Steps', 'Branches'] },
  'Agentic Generator': { icon: Wand2, desc: 'Describe an outcome; the agent picks the tools and builds the workflow.', subs: ['Describe', 'Plan', 'Run'] },
  'Switches': { icon: ToggleRight, desc: 'Save any run as a portable, replayable .0n file.', subs: ['Save run', 'Replay', '.0n file'] },
  'CrewAI Agents': { icon: Cpu, desc: 'Multi-agent crews that research, write, and act in parallel.', subs: ['Multi-agent', 'Research', 'Act'] },
  'Triggers & Webhooks': { icon: GitBranch, desc: 'Fire flows from CRM events, cron, raw HTTP, or any MCP tool.', subs: ['CRM events', 'Cron', 'HTTP'] },
  'Analytics': { icon: BarChart3, desc: 'Real GA4 + Search Console data unified into one cockpit.', subs: ['GA4', 'Search Console', 'Unified'] },
  'CRO9 Engine': { icon: MousePointerClick, desc: 'AI rewrites your copy live and learns what converts.', subs: ['Variants', 'Bandit', 'Lift'] },
  'List Enrichment': { icon: Database, desc: 'Detect the full tech and marketing stack behind any contact or site.', subs: ['Tech stack', 'Signals', 'Export'] },
  'AI Surveys': { icon: PhoneCall, desc: 'Voice or text surveys that gather intel and score intent.', subs: ['Voice', 'Text', 'Scoring'] },
  'Review Insights': { icon: Star, desc: 'Sentiment and themes pulled from every review you receive.', subs: ['Sentiment', 'Themes', 'Alerts'] },
  'Business Profile': { icon: MapPin, desc: 'Manage your Google listing, posts, and local insights from the CRM.', subs: ['Listing', 'Posts', 'Insights'] },
  'Review Requests': { icon: MessageSquare, desc: 'Auto-ask happy customers at the perfect moment to boost ratings.', subs: ['Auto-ask', 'Timing', 'Channels'] },
  'AI Review Replies': { icon: Bot, desc: 'AI drafts on-brand responses to every review for your approval.', subs: ['Draft', 'Approve', 'On-brand'] },
  'Reputation Guard': { icon: ShieldCheck, desc: 'Get alerted on negative sentiment before it spreads.', subs: ['Alerts', 'Sentiment', 'Escalate'] },
  'Follow-up Asks': { icon: Mail, desc: 'Sequenced nudges that turn silent customers into 5-star reviews.', subs: ['Sequences', 'Nudges', '5-star'] },
  'Paid Ads': { icon: Megaphone, desc: 'Connect Google and Meta to manage spend and creative in one view.', subs: ['Google', 'Meta', 'Spend'] },
  'CRO9 Optimizer': { icon: MousePointerClick, desc: 'Auto-tunes landing copy against live conversion data.', subs: ['Copy tests', 'Live tune', 'Lift'] },
  'Conversion Tracking': { icon: Activity, desc: 'Server-side tracking that ties ad clicks to real revenue.', subs: ['Server-side', 'Attribution', 'Revenue'] },
  'Ad Analytics': { icon: BarChart3, desc: 'ROAS, spend, and conversions across platforms, unified.', subs: ['ROAS', 'Spend', 'Conversions'] },
  'Sub-accounts': { icon: Building2, desc: 'Fully isolated workspaces — one per client, managed centrally.', subs: ['Isolation', 'Per client', 'Central mgmt'] },
  'White-label': { icon: Tag, desc: 'Your brand on the entire dashboard, top to bottom.', subs: ['Your brand', 'Custom domain', 'Logo'] },
  'SaaS Factory': { icon: Boxes, desc: 'Provision a complete SaaS for each client in a single shot.', subs: ['Provision', 'Configure', 'Launch'] },
  'Snapshot Deploy': { icon: Camera, desc: 'Clone a perfect setup across every sub-account in seconds.', subs: ['Clone', 'Bulk push', 'Templates'] },
  'Client Portals': { icon: PanelsTopLeft, desc: 'Branded /vip portals where each client logs in to their world.', subs: ['Branded', '/vip', 'Login'] },
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

/* ── Shifting drill-down: Outcome → Capability → sub-category ──────── */
function DrillView({ outcome, onBack }: { outcome: Outcome; onBack: () => void }) {
  const [cap, setCap] = useState<string | null>(null)
  const atCap = cap !== null
  const focusIcon = atCap ? CAP_LIB[cap].icon : outcome.icon
  const focusLabel = atCap ? cap : outcome.label
  const children: { key: string; label: string; icon?: LucideIcon }[] = atCap
    ? CAP_LIB[cap].subs.map((s) => ({ key: `${cap}:${s}`, label: s }))
    : outcome.caps.map((name) => ({ key: name, label: name, icon: CAP_LIB[name].icon }))

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* breadcrumb */}
      <div className="mb-8 flex items-center justify-center gap-1.5 text-sm">
        <button onClick={onBack} className="font-semibold text-white/45 transition-colors hover:text-white/80">Outcomes</button>
        <ChevronRight className="h-3.5 w-3.5 text-white/25" />
        <button onClick={() => setCap(null)} className={`font-semibold transition-colors ${atCap ? 'text-white/45 hover:text-white/80' : 'text-[#7ed957]'}`}>{outcome.label}</button>
        {atCap && <><ChevronRight className="h-3.5 w-3.5 text-white/25" /><span className="font-semibold text-[#7ed957]">{cap}</span></>}
      </div>

      {/* shifting stage */}
      <AnimatePresence mode="wait">
        <motion.div key={cap ?? '__root'}
          initial={{ opacity: 0, x: atCap ? 60 : -60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: atCap ? -60 : 60 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }} className="flex flex-col items-center">

          {/* focus node */}
          <motion.div layout className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-[#0d1117]" style={{ borderColor: '#7ed95755', boxShadow: '0 0 30px rgba(126,217,87,0.22)' }}>
              {(() => { const I = focusIcon; return <I className="h-9 w-9 text-[#7ed957]" /> })()}
            </div>
            <div className="mt-3 text-xl font-black tracking-tight text-white">{focusLabel}</div>
            <AnimatePresence>
              {atCap && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-2 max-w-md text-sm leading-relaxed text-white/65">{CAP_LIB[cap].desc}</motion.p>
              )}
              {!atCap && <motion.p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/40">Click a capability to go deeper</motion.p>}
            </AnimatePresence>
          </motion.div>

          {/* children */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {children.map((c, i) => {
              const col = color(i)
              if (atCap) {
                return (
                  <motion.div key={c.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}
                    className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-white/80 backdrop-blur" style={{ borderColor: `${col}40`, background: `${col}12` }}>
                    {c.label}
                  </motion.div>
                )
              }
              const Ci = c.icon!
              return (
                <motion.button key={c.key} initial={{ opacity: 0, y: 14, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.04 + i * 0.05, type: 'spring', stiffness: 300, damping: 22 }}
                  whileHover={{ y: -3, scale: 1.03 }} onClick={() => setCap(c.label)}
                  className="group flex items-center gap-2.5 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-left backdrop-blur transition-colors hover:border-white/25"
                  style={{ boxShadow: 'none' }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-[#0d1117]" style={{ borderColor: `${col}40` }}>
                    <Ci className="h-[18px] w-[18px]" style={{ color: col }} />
                  </span>
                  <span className="text-sm font-bold text-white">{c.label}</span>
                  <ChevronRight className="h-4 w-4 text-white/30 transition-transform group-hover:translate-x-0.5" />
                </motion.button>
              )
            })}
          </div>

          {atCap && (
            <a href="/signup" className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#7ed957] px-6 py-3 text-sm font-bold text-[#020810] shadow-[0_0_24px_rgba(126,217,87,0.3)] transition-transform hover:scale-[1.03]">
              Do this in 0nCore <ChevronRight className="h-4 w-4" />
            </a>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
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
              <motion.button key={o.id} layout initial={{ opacity: 0, y: 22, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -22, scale: 0.95 }}
                transition={{ duration: 0.32 }} onClick={() => onPick(o)} whileHover={{ y: -4 }}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 text-left transition-colors hover:border-white/[0.22]">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border bg-[#0d1117]" style={{ borderColor: `${col}40` }}>
                  <Icon className="h-6 w-6" style={{ color: col }} />
                </div>
                <div className="text-lg font-black tracking-tight text-white">{o.label}</div>
                <div className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-white/45">
                  {o.caps.length} capabilities <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
      <button onClick={shuffle} className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#7ed957] px-6 py-3 text-sm font-bold text-[#020810] shadow-[0_0_24px_rgba(126,217,87,0.3)] transition-transform hover:scale-[1.03]">
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
  const styleFor = (s: number) => { const abs = Math.abs(s); return { y: s * 90, opacity: abs === 2 ? 0.28 : abs === 1 ? 0.9 : 1, scale: abs === 2 ? 0.82 : abs === 1 ? 0.94 : 1.06, z: 30 - abs * 10 } }
  return (
    <div className="flex flex-col items-center">
      <button onMouseEnter={() => start(-1)} onMouseLeave={stop} onClick={() => setCenter((c) => mod(c - 1, N))}
        className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/60 transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"><ChevronUp className="h-5 w-5" /></button>
      <div className="relative h-[470px] w-full max-w-md overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-40 h-28 bg-gradient-to-b from-[#020810] to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-28 bg-gradient-to-t from-[#020810] to-transparent" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <AnimatePresence initial={false}>
            {slots.map((s) => {
              const o = OUTCOMES[mod(center + s, N)]; const st = styleFor(s); const Icon = o.icon; const col = color(mod(center + s, N)); const clickable = s === 0
              return (
                <motion.button key={o.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ y: st.y, opacity: st.opacity, scale: st.scale, zIndex: st.z }} exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 28 }} onClick={() => clickable && onPick(o)} style={{ pointerEvents: clickable ? 'auto' : 'none' }}
                  className={`absolute left-1/2 top-0 flex w-[350px] -translate-x-1/2 items-center gap-4 rounded-2xl border p-4 ${clickable ? 'cursor-pointer border-[#7ed957]/45 bg-gradient-to-r from-[#7ed957]/[0.1] to-transparent' : 'border-white/[0.08] bg-white/[0.02]'}`}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-[#0d1117]" style={{ borderColor: `${col}40` }}><Icon className="h-6 w-6" style={{ color: col }} /></div>
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
      {/* single static glow — cheap */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.06] blur-[140px]" />
      <section className="relative">
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-14 text-center">
          <span className="mb-5 inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">Interactive · pick an outcome</span>
          <h1 className="text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block text-white">What do you want</span>
            <span className="block bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">to make happen?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">Choose an outcome, then drill down — each click shifts you deeper into exactly how 0nCore gets it done.</p>
        </div>

        {!selected && (
          <div className="relative mx-auto mb-10 flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {([['cards', LayoutGrid, 'Shuffle'], ['list', List, 'Browse']] as const).map(([m, Icon, label]) => (
              <button key={m} onClick={() => setMode(m)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${mode === m ? 'bg-[#7ed957] text-[#020810]' : 'text-white/60 hover:text-white'}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        )}

        <div className="relative mx-auto min-h-[520px] max-w-4xl px-6 pb-28">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key="drill" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}>
                <DrillView outcome={selected} onBack={() => setSelected(null)} />
              </motion.div>
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
