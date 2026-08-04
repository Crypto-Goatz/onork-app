import { NextResponse } from 'next/server'
import { METERS, formatPrice } from '@/lib/meters'

/**
 * GET /api/bootstrap — everything the shell needs on first paint.
 *
 * ONE CALL, not six. The dashboard renders inside an iframe in someone else's
 * product; every extra round trip is visible as the shell assembling itself in
 * front of the user. Agency identity, activated locations, entitlements and the
 * usage summary arrive together so the shell paints once.
 *
 * HONEST WHILE UNWIRED. Until the SSO handshake and the install tables land,
 * this returns `connected: false` and empty collections rather than sample
 * data. A dashboard that shows plausible fake locations is a dashboard someone
 * demos to a client — the empty state is the truth and it is also the thing
 * that tells us the wiring is not finished.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    ok: true,
    connected: false,
    agency: { name: null, whiteLabelLogo: null },
    locations: [],
    entitlements: Object.fromEntries(METERS.map((m) => [m.key, false])),
    usage: {
      mtdCents: 0,
      mtdLabel: formatPrice(0),
      byMeter: METERS.map((m) => ({ key: m.key, label: m.label, count: 0, costCents: 0 })),
    },
    stats: { burstsToday: 0, provisionedThisWeek: 0, openTasks: 0, flowsActive: 0, growSignals: 0 },
    needs: 'Install 0nCORE from your CRM to connect an agency.',
  })
}
