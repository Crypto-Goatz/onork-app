import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MessageSquare, BookOpen, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Support — 0nCore',
  description: 'Get help with 0nCore. Contact our team, join the community, or browse documentation for the AI-powered CRM platform.',
  alternates: { canonical: 'https://0ncore.com/support' },
  openGraph: {
    title: 'Support — 0nCore',
    description: 'Get help with 0nCore — contact, community, and documentation.',
    url: 'https://0ncore.com/support',
    type: 'website',
  },
}

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email support',
    body: 'Direct line to the team. Response within one business day for general questions, faster for paid plans.',
    cta: 'mike@rocketopp.com',
    href: 'mailto:mike@rocketopp.com',
  },
  {
    icon: MessageSquare,
    title: 'Community',
    body: 'Join the 0nMCP community to share workflows, ask questions, and connect with other operators building on the platform.',
    cta: 'Visit community',
    href: 'https://0nmcp.com/community',
  },
  {
    icon: BookOpen,
    title: 'Documentation',
    body: 'Specs, guides, integration docs, and the .0n standard reference. Start here when building or troubleshooting.',
    cta: 'Browse docs',
    href: 'https://0nmcp.com',
  },
]

const FAQ = [
  {
    q: 'How fast will I hear back?',
    a: 'General questions: one business day. Paid plans: priority routing — typically within a few hours during business hours (US Eastern).',
  },
  {
    q: 'What information should I include?',
    a: 'Your account email, the page or feature involved, what you expected vs. what happened, and a screenshot or short screen recording when relevant. The more context, the faster we can resolve it.',
  },
  {
    q: 'Are there office hours or live chat?',
    a: 'We hold weekly community office hours announced in the community. For urgent issues on paid plans, email support is the fastest path.',
  },
  {
    q: 'Where do I report a security issue?',
    a: 'Email mike@rocketopp.com with "Security" in the subject. We acknowledge security reports within 24 hours and follow responsible-disclosure practices.',
  },
]

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        <header className="space-y-3">
          <p className="text-xs font-medium tracking-wide uppercase text-[#6EE05A]">Support</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
            How can we help?
          </h1>
          <p className="text-sm text-[#8b949e] leading-relaxed max-w-2xl">
            0nCore is built and maintained by RocketOpp LLC. We answer every email personally —
            pick the channel that fits the question and we&rsquo;ll get back to you quickly.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-1">
          {CHANNELS.map(({ icon: Icon, title, body, cta, href }) => (
            <a
              key={title}
              href={href}
              className="group block bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#484f58] hover:bg-[#1c2128] hover:translate-y-[-1px] hover:shadow-lg hover:shadow-black/20 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6EE05A]/10 border border-[#6EE05A]/20 shrink-0">
                  <Icon className="w-5 h-5 text-[#6EE05A]" />
                </div>
                <div className="flex-1 space-y-2">
                  <h2 className="text-base font-medium text-[#e6edf3]">{title}</h2>
                  <p className="text-sm text-[#c9d1d9] leading-relaxed">{body}</p>
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6EE05A] group-hover:gap-2 transition-all">
                    {cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[#e6edf3]">Common questions</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-2"
              >
                <h3 className="text-base font-medium text-[#e6edf3]">{item.q}</h3>
                <p className="text-sm text-[#c9d1d9] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-2">
          <h2 className="text-base font-medium text-[#e6edf3]">Still stuck?</h2>
          <p className="text-sm text-[#c9d1d9] leading-relaxed">
            Send a note to{' '}
            <a href="mailto:mike@rocketopp.com" className="text-[#6EE05A] hover:underline">
              mike@rocketopp.com
            </a>{' '}
            and we&rsquo;ll route it to the right person on the team.
          </p>
        </section>

        <footer className="pt-6 border-t border-[#30363d] flex flex-wrap items-center justify-between gap-3 text-xs text-[#8b949e]">
          <span>&copy; 2026 RocketOpp LLC. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[#e6edf3] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#e6edf3] transition-colors">
              Terms
            </Link>
            <Link href="/" className="hover:text-[#e6edf3] transition-colors">
              Home
            </Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
