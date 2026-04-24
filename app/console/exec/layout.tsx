'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WelcomeModal } from '@/components/ui/welcome-modal'
import { Orbit, FlaskConical, CircleDot, Lightbulb, ArrowLeft, Plus, Target, Zap, TrendingUp, Brain } from 'lucide-react'

const NAV = [
  { href: '/console/exec', label: 'Orbit View', Icon: Orbit, desc: 'See all your deals orbiting in real-time' },
  { href: '/console/exec/formulas', label: 'Formulas', Icon: FlaskConical, desc: 'Create scoring rules for your contacts' },
  { href: '/console/exec/orbits', label: 'Orbits', Icon: CircleDot, desc: 'Manage your deal pipelines' },
  { href: '/console/exec/insights', label: 'AI Insights', Icon: Lightbulb, desc: 'AI-detected patterns and recommendations' },
]

const WELCOME_STEPS = [
  {
    title: 'Your deals are planets',
    description: 'Every contact in your pipeline becomes a particle orbiting a central sun. The faster they orbit, the healthier the deal. Slow orbits mean trouble — you\'ll see it instantly.',
    icon: <Orbit className="w-5 h-5 text-[#6EE05A]" />,
    tip: 'Red particles need immediate attention. Green ones are on track to close.',
  },
  {
    title: 'Score everything automatically',
    description: 'Create scoring formulas that measure what matters to YOUR business. How engaged is the lead? How likely to close? How much friction? The AI calculates scores in real-time.',
    icon: <Target className="w-5 h-5 text-[#00d4ff]" />,
    tip: 'Start with a template formula — customize it later as you learn what predicts success.',
  },
  {
    title: 'AI watches while you sleep',
    description: 'The AI monitors every deal 24/7. It spots patterns you\'d miss — like "contacts below score 40 almost never close" or "deals in Review for 5+ days need a call." You get alerts, not charts.',
    icon: <Brain className="w-5 h-5 text-[#a78bfa]" />,
    tip: 'Check AI Insights weekly. It learns from your wins and losses to get smarter over time.',
  },
  {
    title: 'Take action in one click',
    description: 'See a deal stalling? Click it → send an email, book a call, add a note, or trigger an automation. 0nExec connects directly to your CRM — every action happens live.',
    icon: <Zap className="w-5 h-5 text-[#f5c518]" />,
    tip: 'The goal: describe outcomes, not tasks. Say "re-engage cold leads" and the AI handles the rest.',
  },
]

export default function ExecLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isExact = (href: string) => {
    if (href === '/console/exec') return pathname === '/console/exec'
    return pathname?.startsWith(href)
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#04060d' }}>
      {/* Welcome Modal — shown once per user */}
      <WelcomeModal
        storageKey="0nexec"
        title="Welcome to 0nExec"
        subtitle="Your deals visualized as a living solar system. Here's how it works in 60 seconds."
        steps={WELCOME_STEPS}
      />

      {/* Exec Sub-Nav */}
      <div className="flex items-center gap-1.5 px-5 py-2 border-b border-white/[0.06] shrink-0 z-40" style={{ background: 'rgba(4,6,13,0.95)' }}>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 mr-2 text-[11px] text-[#3a4f6a] hover:text-white/50 no-underline transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <ArrowLeft className="w-3 h-3" />
          Dashboard
        </Link>

        <div className="w-px h-4 bg-white/[0.06] mr-1" />

        {NAV.map(n => {
          const active = isExact(n.href)
          return (
            <Link
              key={n.href}
              href={n.href}
              title={n.desc}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] no-underline transition-all ${
                active
                  ? 'bg-[#6EE05A]/10 border border-[#6EE05A]/20 text-[#6EE05A] font-semibold'
                  : 'bg-transparent border border-transparent text-[#3a4f6a] hover:text-white/50 hover:bg-white/[0.03]'
              }`}
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.03em' }}
            >
              <n.Icon className="w-3.5 h-3.5" />
              {n.label}
            </Link>
          )
        })}

        <div className="flex-1" />

        <Link
          href="/console/exec/formulas/new"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#6EE05A]/8 border border-[#6EE05A]/15 text-[#6EE05A] text-[11px] font-semibold no-underline hover:bg-[#6EE05A]/15 transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}
        >
          <Plus className="w-3 h-3" />
          New Formula
        </Link>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
