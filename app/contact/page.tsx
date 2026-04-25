import type { Metadata } from 'next'
import Link from 'next/link'
import { ContactClient } from './contact-client'

export const metadata: Metadata = {
  title: 'Contact Us — 0nCore',
  description: 'Chat with Jaxx AI, book a demo, or reach out for support. Get answers in seconds.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#020810] text-white">
      {/* Hero */}
      <section className="pt-32 pb-12 px-6 text-center max-w-3xl mx-auto">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7ed957] mb-3">Get in Touch</p>
        <h1 className="text-[clamp(28px,5vw,44px)] font-extrabold leading-tight mb-4">
          Let&apos;s talk about<br />
          <span className="bg-gradient-to-r from-[#7ed957] via-[#00d4ff] to-[#14b8a6] bg-clip-text text-transparent">what you&apos;re building</span>
        </h1>
        <p className="text-[16px] text-white/40 max-w-lg mx-auto leading-relaxed">
          Whether you need a demo, technical support, or want to explore how 0nCore fits your business — we&apos;re here.
        </p>
      </section>

      <ContactClient />

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-6 text-center">
        <p className="text-[11px] text-white/20">
          &copy; 2026 RocketOpp LLC &middot; <Link href="/" className="text-white/30 no-underline hover:text-white/50">0ncore.com</Link> &middot; <Link href="https://0nmcp.com" className="text-white/30 no-underline hover:text-white/50">0nmcp.com</Link>
        </p>
      </footer>
    </div>
  )
}
