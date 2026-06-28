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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020810] px-4 py-8 font-sans text-white antialiased">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.07] blur-[140px]" />
      <Suspense fallback={<div className="relative text-white/45">Loading…</div>}>
        <RecommendationsModal funnelId={funnel} />
      </Suspense>
    </main>
  )
}
