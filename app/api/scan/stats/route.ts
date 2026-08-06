import { NextResponse } from 'next/server'
import { getScanStats, ROCKETOPP_LOCATION } from '@/lib/scan/stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const locationId = new URL(req.url).searchParams.get('locationId') || ROCKETOPP_LOCATION
  try {
    return NextResponse.json(await getScanStats(locationId))
  } catch (err) {
    // Return the shape the page expects with the problem attached, so the board
    // renders and says what is wrong instead of showing a blank screen.
    return NextResponse.json(
      {
        ok: false, locationId, totalLeads: 0, today: 0, pipelineValue: 0,
        split: { emailable: 0, phoneOnly: 0, socialOnly: 0 },
        byDay: [], recent: [],
        problems: [err instanceof Error ? err.message : 'Could not reach the CRM.'],
      },
      { status: 200 },
    )
  }
}
