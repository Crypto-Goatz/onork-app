'use client'

/**
 * Email signup form wired to CRO9: the CTA label is a CroSlot (A/B-optimized),
 * and submitting fires a conversion credit to every variant the visitor saw
 * (keepalive, so it survives the navigation to /signup).
 */

import { ArrowRight } from 'lucide-react'
import { CroSlot, trackCro9Conversion } from './CroSlot'

export function SignupForm({
  ctaSlot,
  ctaFallback,
}: {
  ctaSlot: string
  ctaFallback: string
}) {
  return (
    <form
      action="/signup"
      method="get"
      onSubmit={() => trackCro9Conversion()}
      className="flex w-full max-w-xl flex-col sm:flex-row items-stretch gap-2"
    >
      <input
        type="email"
        name="email"
        required
        placeholder="you@yourcompany.com"
        autoComplete="email"
        aria-label="Your work email"
        className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-5 py-3.5 text-base text-white placeholder-white/30 outline-none focus:border-[#6EE05A]/60 focus:bg-white/[0.07] transition-all"
      />
      <button
        type="submit"
        className="group inline-flex items-center justify-center gap-2 bg-[#6EE05A] text-black font-semibold rounded-lg px-6 py-3.5 hover:brightness-110 transition-all duration-150 shadow-[0_0_50px_-10px_rgba(110,224,90,0.55)] whitespace-nowrap"
      >
        <CroSlot slot={ctaSlot} fallback={ctaFallback} as="span" />
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </form>
  )
}
