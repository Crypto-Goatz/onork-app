import { Suspense } from 'react'
import { RecommendationsModal } from './modal'

export const dynamic = 'force-dynamic'

export default async function ThankYouPage({
  params,
}: {
  params: Promise<{ funnel: string }>
}) {
  const { funnel } = await params

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900/50 px-4 py-8">
      <Suspense fallback={<div className="text-zinc-400">Loading…</div>}>
        <RecommendationsModal funnelId={funnel} />
      </Suspense>
    </div>
  )
}
