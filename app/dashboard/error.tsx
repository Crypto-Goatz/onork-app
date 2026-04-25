'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-xl bg-core-red/10 border border-core-red/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-core-red" />
        </div>
        <h2 className="text-lg font-bold text-core-text mb-2">Something went wrong</h2>
        <p className="text-sm text-core-text-muted mb-5">
          {error.message || 'This section encountered an error. Try refreshing.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-core-green text-core-bg text-sm font-bold cursor-pointer border-none hover:bg-core-green/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </div>
  )
}
