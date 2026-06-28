import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function AppNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020810] text-white">
      <div className="text-center">
        <Sparkles className="mx-auto h-10 w-10 text-[#7ed957] mb-3" />
        <h1 className="text-xl font-semibold tracking-tight">App not found</h1>
        <p className="mt-2 text-xs text-white/40">
          This /apps URL doesn't exist or has been archived.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#7ed957] hover:text-[#7ed957]/80"
        >
          0nCore home →
        </Link>
      </div>
    </div>
  )
}
