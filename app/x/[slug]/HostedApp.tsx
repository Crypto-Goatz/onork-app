/**
 * The screens hosted add-ons bring with them.
 *
 * A 'hosted' add-on is one whose product IS a UI — a course list, a lead
 * search — rather than a form and a Run button. The frame gates it exactly like
 * every other add-on and then renders THIS instead of the generic panel.
 *
 * RENDERED IN PLACE, NOT REDIRECTED TO. The first cut of this migration pointed
 * each add-on at the route it already had and sent the customer there. That was
 * wrong in a way only production could show: /dashboard/* is owner-only (the H1
 * gate in middleware.ts), so a signed-in customer following the Hub tile was
 * bounced straight back to /hub. The tile said Open and the door led home. An
 * add-on's entitled surface therefore lives under /x/, which is the one route
 * built to be reachable by whoever the gate says may reach it.
 *
 * THE OLD ROUTES ARE NOT DELETED, because they serve different people:
 *   /dashboard/course-builder — the operator view, behind H1, every tenant.
 *   /app/course, /crm/leadscout — the marketplace Custom Pages, opened in an
 *       iframe by someone with no 0nCORE account, authenticating by SSO.
 * Same engine, different front doors, and the audiences do not overlap.
 */
import type { ComponentType } from 'react'
import CourseBuilderApp from '@/app/dashboard/course-builder/CourseBuilderApp'
import LeadScoutApp from '@/app/crm/leadscout/LeadScoutApp'
import BuildStudio from '@/app/crm/build/BuildStudio'

/** lead0n proves identity by session here; the Custom Page uses SSO. */
function Lead0nSession() {
  return <LeadScoutApp auth="session" />
}

const HOSTED_APPS: Record<string, ComponentType> = {
  'ai-course-builder': CourseBuilderApp,
  lead0n: Lead0nSession,
  // 0nBlueprint's product is the studio and the dry-run plan beside it. The
  // same component serves the Custom Page at /crm/build: useSso answers the
  // iframe handshake there and mints from the 0nCORE session here, so one
  // screen covers both audiences without a second copy to keep in step.
  '0nblueprint': BuildStudio,
}

/**
 * null means a definition claims surface:'hosted' and brought no screen. The
 * frame treats that as no door at all rather than rendering an empty page —
 * the same rule as a listing with no code behind it.
 */
export function hostedAppFor(slug: string): ComponentType | null {
  return HOSTED_APPS[slug] ?? null
}
