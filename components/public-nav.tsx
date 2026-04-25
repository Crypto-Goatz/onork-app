import Link from 'next/link'

export function PublicNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-[clamp(16px,4vw,32px)] py-[clamp(10px,2vw,12px)] bg-[rgba(2,8,16,0.88)] backdrop-blur-2xl border-b border-white/[0.04]">
      <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
        <img src="/brand/0ncore-logo.png" alt="0nCore" className="h-8 object-contain" />
      </Link>

      <div className="hidden md:flex items-center gap-1">
        <Link href="/platform" className="px-3 py-1.5 text-[13px] text-white/50 no-underline rounded-lg hover:text-white hover:bg-white/[0.04] transition-all">Platform</Link>
        <Link href="/marketplace" className="px-3 py-1.5 text-[13px] text-white/50 no-underline rounded-lg hover:text-white hover:bg-white/[0.04] transition-all">Marketplace</Link>
        <Link href="/pricing" className="px-3 py-1.5 text-[13px] text-white/50 no-underline rounded-lg hover:text-white hover:bg-white/[0.04] transition-all">Pricing</Link>
        <Link href="/blog" className="px-3 py-1.5 text-[13px] text-white/50 no-underline rounded-lg hover:text-white hover:bg-white/[0.04] transition-all">Blog</Link>
        <Link href="/contact" className="px-3 py-1.5 text-[13px] text-white/50 no-underline rounded-lg hover:text-white hover:bg-white/[0.04] transition-all">Contact</Link>
        <div className="w-px h-5 bg-white/[0.08] mx-2" />
        <Link href="/login" className="px-3 py-1.5 text-[13px] text-white/60 no-underline rounded-lg hover:text-white hover:bg-white/[0.04] transition-all">Sign In</Link>
        <Link href="/signup" className="ml-1 px-5 py-2 text-[13px] font-semibold text-[#020810] bg-[#7ed957] no-underline rounded-lg hover:bg-[#7ed957]/90 transition-colors">Get Started</Link>
      </div>

      <Link href="/login" className="md:hidden px-5 py-2 text-[13px] font-semibold text-[#020810] bg-[#7ed957] no-underline rounded-lg">Get Started</Link>
    </nav>
  )
}
