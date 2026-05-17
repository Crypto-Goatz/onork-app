/**
 * /welcome — the post-auth control panel for every signed-in user.
 *
 * Server-side responsibilities:
 *   1. Auth gate — redirect to /login?next=/welcome if no session
 *   2. Provision — make sure profiles row exists (idempotent insert)
 *   3. Fetch the user's plan + crm_location_id so we can compute access
 *   4. Hand off to <WelcomePanel/> with everything resolved
 *
 * The user picks their own destination from 6 cards. No single product
 * is forced as the "main" surface — flexibility for both free + paid users.
 */

import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import WelcomePanel, { type CardAccess } from '@/components/welcome/WelcomePanel'
import ClaimWorkspaceBanner from '@/components/welcome/ClaimWorkspaceBanner'
import WorkspaceProvisioningStatus from '@/components/welcome/WorkspaceProvisioningStatus'
import { FAMILY_LOCATIONS, findFamilyMatch } from '@/lib/family-locations'
import { getTierCapabilities } from '@/lib/permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface ProfileRow {
  id: string
  email: string | null
  full_name: string | null
  plan: string | null
  crm_location_id: string | null
  is_admin: boolean | null
  provisioning_started_at: string | null
  provisioning_error: string | null
}

const PLAN_RANK: Record<string, number> = {
  free: 0,
  supporter: 1,
  starter: 1,
  builder: 2,
  pro: 2,
  enterprise: 3,
  business: 3,
  penthouse: 4,
  agency: 4,
}

function rank(plan: string | null | undefined): number {
  return PLAN_RANK[(plan ?? 'free').toLowerCase()] ?? 0
}

export default async function WelcomePage() {
  // Use getSession (cookie-only, no network) instead of getUser (network call).
  // Middleware has already validated the JWT before this server component runs;
  // re-validating here can race with middleware's cookie refresh and produce
  // a /welcome → /login → /welcome infinite loop.
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login?next=/welcome')

  const sb = admin()

  // Ensure profile row exists (idempotent — Supabase trigger should have
  // created it on signup, but we defend against missing rows here)
  let { data: profile } = await sb
    .from('profiles')
    .select('id, email, full_name, plan, crm_location_id, is_admin, provisioning_started_at, provisioning_error')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()

  if (!profile) {
    const { data: created } = await sb
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email ?? null,
        full_name: (user.user_metadata?.full_name as string) ?? null,
        plan: 'free',
      })
      .select('id, email, full_name, plan, crm_location_id, is_admin, provisioning_started_at, provisioning_error')
      .single<ProfileRow>()
    profile = created ?? null
  }

  const plan = profile?.plan ?? 'free'
  const userRank = rank(plan)
  const isAdmin = !!profile?.is_admin

  // Compute access per card. Admins always pass.
  const access = (minRank: number): CardAccess =>
    isAdmin || userRank >= minRank ? 'unlocked' : 'locked'

  // Resolve the family location (if linked OR matchable by email).
  // This is the "fallback for users with an email recognized by a sub-location"
  // — even if their profile crm_location_id is null, we surface the match.
  const profileLocationId = profile?.crm_location_id ?? null
  const emailMatch = findFamilyMatch(profile?.email ?? user.email ?? '')
  const familyLocation =
    (profileLocationId && FAMILY_LOCATIONS.find((f) => f.locationId === profileLocationId)) ||
    emailMatch?.location ||
    null

  const tierCaps = getTierCapabilities(plan)

  // Workspace state machine for the top-of-page banner:
  //   - Has location (own or family) → render nothing (workspace cards below)
  //   - No location, provisioning started → live polling status component
  //   - No location, provisioning never started → legacy manual claim banner
  //     (covers users who signed up before the auto-provision change)
  const provisioningStartedAt = profile?.provisioning_started_at ?? null
  const showProvisioningStatus =
    !profileLocationId && !familyLocation && !!provisioningStartedAt
  const showClaim =
    !profileLocationId && !familyLocation && !provisioningStartedAt

  return (
    <>
      {showProvisioningStatus && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
          <WorkspaceProvisioningStatus
            userName={profile?.full_name ?? null}
            initialStartedAt={provisioningStartedAt}
          />
        </div>
      )}
      {showClaim && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
          <ClaimWorkspaceBanner userName={profile?.full_name ?? null} />
        </div>
      )}
      <WelcomePanel
      user={{
        email: profile?.email ?? user.email ?? '',
        name: profile?.full_name ?? null,
        plan,
        location_id: profileLocationId,
        is_admin: isAdmin,
      }}
      familyLocation={
        familyLocation
          ? { name: familyLocation.name, locationId: familyLocation.locationId, vip: !!familyLocation.vip }
          : null
      }
      tierLabel={tierCaps.label}
      tierQuotas={tierCaps.quotas}
      tierActions={tierCaps.onboardingActions}
      cards={[
        {
          id: 'canvas',
          title: 'Canvas',
          subtitle: 'Visual workspace + Jaxx flow builder',
          description: 'Drop blocks, draw connections, or just tell Jaxx what you want.',
          href: '/canvas',
          access: 'unlocked',
          tag: 'Free',
          required_plan: null,
          icon: 'Workflow',
        },
        {
          id: 'notes',
          title: 'Notes',
          subtitle: 'AI-first capture — flowcharts, mind maps, docs',
          description: 'Drop any thought; the brain decides what it should become.',
          href: '/dashboard/notes',
          access: 'unlocked',
          tag: 'Free',
          required_plan: null,
          icon: 'Sparkles',
        },
        {
          id: 'service_packager',
          title: 'Service Packager',
          subtitle: 'Eight sellable outputs from one input',
          description: 'Fiverr gig, Upwork, portfolio, landing page, social — generated and exported.',
          href: '/dashboard/service-packager',
          access: 'unlocked',
          tag: 'Free',
          required_plan: null,
          icon: 'Package',
        },
        {
          id: 'course_builder',
          title: 'Course Builder',
          subtitle: 'AI courses + auto-publish to your CRM',
          description: 'Conversational course generation that publishes itself.',
          href: '/dashboard/courses',
          access: access(1),
          tag: 'Starter',
          required_plan: 'Starter ($29/mo)',
          icon: 'GraduationCap',
        },
        {
          id: 'hipaa_scanner',
          title: 'HIPAA Scanner',
          subtitle: 'Compliance scans + weighted scoring',
          description: '63 checks across the 4 HIPAA pillars, with branded PDF reports.',
          href: '/dashboard/hipaa',
          access: access(2),
          tag: 'Builder',
          required_plan: 'Builder ($79/mo)',
          icon: 'Shield',
        },
        {
          id: 'voice_ai',
          title: 'Voice AI',
          subtitle: 'Phone + web voice agents with knowledge bases',
          description: 'Deploy a voice agent that books, qualifies, and summarizes.',
          href: '/dashboard/voice',
          access: access(3),
          tag: 'Enterprise',
          required_plan: 'Enterprise ($299/mo)',
          icon: 'Mic',
        },
      ]}
      />
    </>
  )
}
