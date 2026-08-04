import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { WIDGETS, embedTag, CANONICAL_APP_ID } from '@/lib/widgets/registry'
import { WORKFLOW_ACTIONS } from '@/lib/crm/actions'
import { TRIGGERS } from '@/lib/crm/triggers'

/**
 * GET /api/snapshot/manifest — everything to place while building the master
 * snapshot, generated from the registries.
 *
 * A DOCUMENT WOULD GO STALE. This is derived from the same definitions the
 * runtime uses, so the tag you paste is by construction the tag the server will
 * answer. A hand-written checklist drifts the first time a key changes, and the
 * failure shows up as a silent no-op on a customer's live page.
 *
 * IT LISTS UNFINISHED WIDGETS TOO, ON PURPOSE. A placeholder tag for a widget
 * that currently serves a no-op costs nothing and means that when we ship it,
 * it appears on every existing client with no snapshot push. Seeding generously
 * now is what keeps the manual step rare later.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  return NextResponse.json({
    ok: true,
    registerEverythingOn: CANONICAL_APP_ID,

    /**
     * The location id has to resolve on the page for an embed to know which
     * client it is on. `{{location.id}}` is the expected merge field; if a page
     * renders it literally, embed.js sees the braces and renders NOTHING rather
     * than guessing — so a wrong field is a silent no-op, never wrong data.
     */
    locationMergeField: '{{location.id}}',

    embeds: WIDGETS.filter((w) => w.delivery === 'embed').map((w) => ({
      key: w.key,
      name: w.name,
      live: w.live,
      note: w.live ? 'Renders now.' : `Serves nothing until ready — safe to place. ${w.pending ?? ''}`.trim(),
      placeOn: PLACEMENT[w.key] ?? 'any page',
      tag: embedTag(w.key),
    })),

    panels: WIDGETS.filter((w) => w.delivery === 'panel').map((w) => ({
      key: w.key, name: w.name, live: w.live,
      widgetUrl: `https://app.0ncore.com/widgets/${w.key}`,
    })),

    actions: WORKFLOW_ACTIONS.map((a) => ({
      key: a.key,
      name: a.name,
      live: a.live,
      endpoint: `https://app.0ncore.com/api/crm/action/${a.key}`,
      configFields: a.fields,
      returnsToWorkflow: a.returns,
    })),

    triggers: TRIGGERS.map((t) => ({
      key: t.key,
      name: t.name,
      firesWhen: t.when,
      // Until the custom-trigger fire contract is captured, a native workflow
      // listens on its own inbound webhook and we POST to that URL.
      listenWith: 'Inbound webhook trigger — save the URL and we will call it.',
    })),

    sampleWorkflows: [
      {
        name: '0nCORE — Score and act on a new lead',
        steps: ['Trigger: contact created', 'Action: 0nCORE: Score & Route', 'If/else on {{branch}}', 'hot -> Action: 0nCORE: Run Command ("book a call")'],
      },
      {
        name: '0nCORE — React to AI work',
        steps: ['Trigger: Inbound webhook (register as oncore_burst_completed)', 'Your own follow-up steps'],
      },
    ],
  })
}

/** Where each embed earns its place in the snapshot. */
const PLACEMENT: Record<string, string> = {
  oncore_analytics: 'every page header — mandatory',
  oncore_form_capture: 'opt-in / contact pages, inside <div id="oncore-form"></div>',
  oncore_booking_block: 'the booking or contact page',
  oncore_conversion_bar: 'every page footer',
  oncore_social_proof: 'landing pages',
  oncore_chat: 'site footer',
  oncore_lp_inject: 'the placeholder funnel step',
  oncore_course_embed: 'the membership page',
}
