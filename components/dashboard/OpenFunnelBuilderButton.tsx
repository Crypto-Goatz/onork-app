'use client'

/**
 * Deep-links into the user's CRM funnel/website builder — where landing pages
 * are actually built (native CRM builder, per-sub-account, with their own domain,
 * forms, and tracking). No Vercel deploys, no per-page cost.
 */

import { useEffect, useState } from 'react'
import { Plus, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CRM_BASE = 'https://app.rocketclients.com'

export default function OpenFunnelBuilderButton() {
  const [locationId, setLocationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) { if (!cancelled) setLoading(false); return }
      supabase.from('profiles').select('crm_location_id').eq('id', user.id).maybeSingle()
        .then(({ data }) => {
          if (cancelled) return
          setLocationId((data?.crm_location_id as string | null) ?? null)
          setLoading(false)
        })
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const base = 'inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg text-[13px] font-semibold no-underline transition-colors'

  if (loading) return <span className={`${base} border border-core-border text-core-text-muted opacity-50`}><Plus className="w-4 h-4" /> Build a Page</span>
  if (!locationId) return <span className={`${base} border border-core-border text-core-text-muted opacity-60 cursor-not-allowed`} title="Claim your workspace first"><Plus className="w-4 h-4" /> Build a Page</span>

  return (
    <a
      href={`${CRM_BASE}/v2/location/${locationId}/funnels-websites/funnels`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} bg-core-green text-black hover:brightness-110`}
      title="Open the page/funnel builder in your CRM workspace"
    >
      <Plus className="w-4 h-4" /> Build a Page <ExternalLink className="w-3.5 h-3.5 opacity-70" />
    </a>
  )
}
