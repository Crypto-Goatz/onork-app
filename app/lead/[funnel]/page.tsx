import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { LandingForm } from './landing-form'

export const dynamic = 'force-dynamic'

interface FunnelConfig {
  funnel_id: string
  funnel_name: string
  offer_title: string
  offer_description: string | null
  is_active: boolean
}

async function getFunnel(funnelId: string): Promise<FunnelConfig | null> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await sb
    .from('funnel_config')
    .select('funnel_id, funnel_name, offer_title, offer_description, is_active')
    .eq('funnel_id', funnelId)
    .eq('is_active', true)
    .maybeSingle()
  return data
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ funnel: string }>
}) {
  const { funnel } = await params
  const config = await getFunnel(funnel)
  if (!config) notFound()

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-lg ring-1 ring-zinc-200">
        <span className="mb-5 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Free Download
        </span>
        <h1 className="mb-3 text-3xl font-bold leading-tight tracking-tight text-zinc-900">
          {config.offer_title}
        </h1>
        {config.offer_description && (
          <p className="mb-7 text-[15px] leading-relaxed text-zinc-600">{config.offer_description}</p>
        )}
        <LandingForm funnelId={config.funnel_id} />
        <p className="mt-4 text-center text-xs text-zinc-400">No spam. Unsubscribe any time.</p>
        <p className="mt-6 text-center text-[11px] text-zinc-300">
          Powered by{' '}
          <a href="https://0nmcp.com" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-500">
            0nMCP
          </a>
        </p>
      </div>
    </div>
  )
}
