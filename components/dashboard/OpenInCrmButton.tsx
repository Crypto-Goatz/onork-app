'use client'

/**
 * OpenInCrmButton — top-right header deep-link into the user's CRM sub-location.
 *
 * Part of the "0nCore-primary + CRM-as-ops-shell" hybrid UX spike. Loads the
 * signed-in user's `profiles.crm_location_id` and renders a small ghost button
 * that opens the white-labeled CRM dashboard in a new tab.
 *
 * - Uses getSession() (cookie-only, no network) per Critical Rule #12.
 * - Disabled state with tooltip when the user has not yet claimed a workspace.
 * - Lucide ExternalLink icon (no emoji per design system rules).
 */

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// TODO(white-label): swap to `https://app.0ncore.com` once white-label DNS is
// configured for the agency tenant. Today the white-labeled GHL surface lives
// at app.rocketclients.com — matches the URL already used by /dashboard/admin.
const CRM_DASHBOARD_BASE = 'https://app.rocketclients.com'

function buildDeepLink(locationId: string): string {
  return `${CRM_DASHBOARD_BASE}/v2/location/${locationId}/dashboard`
}

export default function OpenInCrmButton() {
  const [locationId, setLocationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) {
        if (!cancelled) setLoading(false)
        return
      }
      supabase
        .from('profiles')
        .select('crm_location_id')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled) return
          setLocationId((data?.crm_location_id as string | null) ?? null)
          setLoading(false)
        })
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  // Loading skeleton — keep header layout stable
  if (loading) {
    return (
      <span
        className="hidden md:inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-md border border-white/10 bg-white/[0.02] text-[12px] font-semibold text-core-text-muted opacity-50"
        aria-busy="true"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open in CRM
      </span>
    )
  }

  // No claim yet — disabled with tooltip
  if (!locationId) {
    return (
      <span
        className="hidden md:inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-md border border-white/10 bg-white/[0.02] text-[12px] font-semibold text-core-text-muted cursor-not-allowed opacity-60"
        title="Claim your workspace first"
        aria-disabled="true"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open in CRM
      </span>
    )
  }

  return (
    <a
      href={buildDeepLink(locationId)}
      target="_blank"
      rel="noopener noreferrer"
      className="hidden md:inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-md border border-white/10 bg-white/[0.02] text-[12px] font-semibold text-core-text no-underline transition-colors hover:border-core-green/40 hover:text-core-green hover:bg-core-green/[0.06]"
      title="Open this workspace in the CRM"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      Open in CRM
    </a>
  )
}
