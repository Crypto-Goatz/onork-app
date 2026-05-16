/**
 * /dashboard/ops — embeds the white-labeled CRM dashboard inside the 0nCore
 * shell so power users can run CRM operations without leaving the portal.
 *
 * Part of the "0nCore-primary + CRM-as-ops-shell" hybrid UX spike. Pairs
 * with the top-right "Open in CRM" deep-link button.
 *
 * Server component: resolves session + crm_location_id, renders either an
 * empty-state (no workspace claimed) or an iframe pointed at the deep link.
 *
 * TODO(iframe-embedding): the CRM origin (app.rocketclients.com) is very
 * likely to send `X-Frame-Options: SAMEORIGIN` or a restrictive
 * `Content-Security-Policy: frame-ancestors`. If so, the iframe will be
 * blocked and the user will see a blank pane. The fallback CTA below opens
 * the same URL in a new tab so the spike is still useful. To make true
 * embedding work, the CRM tenant would need `frame-ancestors 0ncore.com`
 * configured server-side.
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ExternalLink, Briefcase } from 'lucide-react'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import ClaimWorkspaceBanner from '@/components/welcome/ClaimWorkspaceBanner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// TODO(white-label): swap to `https://app.0ncore.com` once white-label DNS
// is configured. Matches `components/dashboard/OpenInCrmButton.tsx`.
const CRM_DASHBOARD_BASE = 'https://app.rocketclients.com'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function buildDeepLink(locationId: string): string {
  return `${CRM_DASHBOARD_BASE}/v2/location/${locationId}/dashboard`
}

export default async function DashboardOpsPage() {
  // getSession (cookie-only) — middleware has already validated the JWT.
  // Never call getUser() in a server component (Critical Rule #12).
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login?next=/dashboard/ops')

  const sb = admin()
  const { data: profile } = await sb
    .from('profiles')
    .select('full_name, crm_location_id')
    .eq('id', user.id)
    .maybeSingle<{ full_name: string | null; crm_location_id: string | null }>()

  const locationId = profile?.crm_location_id ?? null

  // Empty state — same banner pattern used on /welcome.
  if (!locationId) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-core-text flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-core-green" />
            Ops (CRM)
          </h1>
          <p className="mt-1.5 text-[13px] text-core-text-muted">
            Run your CRM operations inside 0nCore. Claim your workspace below
            to embed the ops dashboard here.
          </p>
        </div>
        <ClaimWorkspaceBanner userName={profile?.full_name ?? null} />
      </div>
    )
  }

  const deepLink = buildDeepLink(locationId)

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-core-border bg-core-card">
        <div className="flex items-center gap-2 min-w-0">
          <Briefcase className="w-4 h-4 text-core-green shrink-0" />
          <span className="text-[13px] font-semibold text-core-text">
            Ops (CRM)
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-core-green/10 text-core-green font-mono truncate">
            {locationId.slice(0, 8)}...
          </span>
        </div>
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-[28px] px-2.5 rounded-md border border-white/10 bg-white/[0.02] text-[11px] font-semibold text-core-text no-underline hover:border-core-green/40 hover:text-core-green hover:bg-core-green/[0.06]"
        >
          <ExternalLink className="w-3 h-3" />
          Open in new tab
        </a>
      </div>
      <div className="flex-1 relative bg-core-bg">
        <iframe
          src={deepLink}
          title="CRM Ops Dashboard"
          className="absolute inset-0 w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          referrerPolicy="strict-origin"
        />
        {/* Fallback hint — sits behind the iframe; if the iframe loads it
            covers this. If the iframe is X-Frame-Options blocked the user
            sees this with the "open in new tab" CTA in the header above. */}
        <div className="absolute inset-0 -z-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-md px-6 pointer-events-auto">
            <p className="text-[13px] text-core-text-muted">
              If the CRM dashboard does not appear below, your CRM tenant may
              be blocking iframe embedding.
            </p>
            <Link
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 h-[32px] px-3 rounded-md border border-core-green/30 bg-core-green/[0.06] text-[12px] font-semibold text-core-green no-underline hover:bg-core-green/[0.12]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in new tab
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
