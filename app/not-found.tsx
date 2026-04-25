import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020810] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-[80px] font-extrabold text-white/[0.04] leading-none mb-2">404</div>
        <h1 className="text-xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-sm text-white/40 mb-8">This page doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-[#6EE05A] text-[#020810] text-sm font-bold no-underline hover:bg-[#6EE05A]/90 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm font-medium no-underline hover:bg-white/[0.03] transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
