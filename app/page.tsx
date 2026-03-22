'use client'

import Link from 'next/link'

const features = [
  {
    title: 'CRM',
    description: 'Manage contacts, pipelines, and conversations. Full CRM integration with 245 tools.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'Automation',
    description: 'Run workflows powered by 0nMCP. 54 services, one command. Describe outcomes, not steps.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Billing',
    description: 'Track usage, view invoices, and manage your subscription. Transparent $0.01/run pricing.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
]

const stats = [
  { value: '245', label: 'CRM Tools' },
  { value: '54', label: 'Services' },
  { value: 'AES-256', label: 'Vault' },
  { value: '$0.01', label: '/run' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-core-bg flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="text-xl font-bold text-core-green">0ncore</div>
        <Link
          href="/login"
          className="text-sm text-core-text-dim hover:text-core-text transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-3xl mx-auto animate-slide-up">
          <h1 className="text-6xl sm:text-7xl font-bold text-core-green mb-4 tracking-tight">
            0ncore
          </h1>
          <p className="text-xl sm:text-2xl text-core-text-dim mb-12">
            Your AI command center
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-core-card border border-core-border rounded-xl p-6 text-left hover:border-core-border-hi hover:bg-core-card-hover transition-all duration-200"
              >
                <div className="text-core-green mb-3">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-core-text">{f.title}</h3>
                <p className="text-sm text-core-text-dim leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-12 py-4 px-6 bg-core-card border border-core-border rounded-xl">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-lg font-bold text-core-green">{s.value}</span>
                <span className="text-sm text-core-text-muted">{s.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-core-green text-core-bg font-semibold px-8 py-3 rounded-lg hover:brightness-110 transition-all duration-200 text-lg"
          >
            Get Started
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-core-text-muted text-sm">
        Powered by <span className="text-core-green">0nMCP</span> — RocketOpp LLC
      </footer>
    </div>
  )
}
