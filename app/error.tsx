'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[0nCore Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#020810] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Something broke</h1>
        <p className="text-sm text-white/50 mb-6 leading-relaxed">
          {error.message || 'An unexpected error occurred. This has been logged automatically.'}
        </p>
        {error.digest && (
          <p className="text-[10px] text-white/20 font-mono mb-4">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7ed957] text-[#020810] text-sm font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <a
            href="/crm"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm font-medium no-underline hover:bg-white/[0.03] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
