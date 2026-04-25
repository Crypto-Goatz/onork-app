import type { Metadata } from 'next'
import Link from 'next/link'
import { JaxxChat } from './jaxx-chat'

export const metadata: Metadata = {
  title: 'Contact Us — 0nCore',
  description: 'Get in touch with the 0nCore team. Chat live, book a demo, or reach out for support.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#020810] text-white">
      {/* Nav provided by PublicNavWrapper in root layout */}

      {/* Hero */}
      <section className="pt-32 pb-12 px-6 text-center max-w-3xl mx-auto">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7ed957] mb-3">Get in Touch</p>
        <h1 className="text-[clamp(28px,5vw,44px)] font-extrabold leading-tight mb-4">
          Let's talk about<br />
          <span className="bg-gradient-to-r from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">what you're building</span>
        </h1>
        <p className="text-[16px] text-white/40 max-w-lg mx-auto leading-relaxed">
          Whether you need a demo, technical support, or want to explore how 0nCore fits your business — we're here.
        </p>
      </section>

      {/* Contact Grid */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-6">

          {/* Left: AI Chat */}
          <JaxxChat />

          {/* Right: Contact Options */}
          <div className="space-y-4">
            {/* Book a Demo */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-[#7ed957]/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#7ed957]/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[#7ed957]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white mb-1">Book a Demo</h3>
                  <p className="text-[13px] text-white/40 mb-3">See 0nCore in action. 15-minute walkthrough tailored to your business.</p>
                  <a
                    href="https://api.rocketclients.com/widget/booking/5xtTejAwYmiwULqboaL7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7ed957] no-underline hover:underline"
                  >
                    Schedule now
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" /></svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-[#00d4ff]/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white mb-1">Email Us</h3>
                  <p className="text-[13px] text-white/40 mb-3">For partnerships, enterprise inquiries, or detailed support.</p>
                  <a href="mailto:mike@rocketopp.com" className="text-[13px] font-semibold text-[#00d4ff] no-underline hover:underline">
                    mike@rocketopp.com
                  </a>
                </div>
              </div>
            </div>

            {/* Slack Community */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-[#a78bfa]/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#a78bfa]/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white mb-1">Join the Community</h3>
                  <p className="text-[13px] text-white/40 mb-3">Connect with other 0nCore users. Get help, share workflows, swap ideas.</p>
                  <a href="https://0nmcp.com/community" target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-[#a78bfa] no-underline hover:underline">
                    Join on 0nmcp.com
                  </a>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-[#7ed957]/[0.04] to-[#00d4ff]/[0.03] p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[22px] font-extrabold text-[#7ed957]">1,554</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Tools</div>
                </div>
                <div>
                  <div className="text-[22px] font-extrabold text-[#00d4ff]">96</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Services</div>
                </div>
                <div>
                  <div className="text-[22px] font-extrabold text-[#a78bfa]">5</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Patents</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-6 text-center">
        <p className="text-[11px] text-white/20">
          &copy; 2026 RocketOpp LLC &middot; <Link href="/" className="text-white/30 no-underline hover:text-white/50">0ncore.com</Link> &middot; <Link href="https://0nmcp.com" className="text-white/30 no-underline hover:text-white/50">0nmcp.com</Link>
        </p>
      </footer>
    </div>
  )
}
