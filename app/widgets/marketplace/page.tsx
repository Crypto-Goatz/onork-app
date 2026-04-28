import { Suspense } from 'react'
import { MarketplaceWidget } from './client'

export const dynamic = 'force-dynamic'

export default function MarketplaceWidgetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-white/40">Loading marketplace…</div>}>
      <MarketplaceWidget />
    </Suspense>
  )
}
