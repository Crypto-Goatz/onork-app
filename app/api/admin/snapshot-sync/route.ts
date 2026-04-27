/**
 * Admin Snapshot Sync API
 *
 * POST — trigger sync for all active CRM locations
 * GET  — return sync status (latest version, counts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdentity } from '@/lib/k-layer/s1-identity'
import { syncAllLocations, getLatestVersion } from '@/lib/snapshot-sync'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// ---------------------------------------------------------------------------
// POST — run sync on all locations
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const identity = await verifyIdentity(req)

    if (!identity.verified) {
      return NextResponse.json({ error: identity.error }, { status: 401 })
    }

    if (!identity.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const result = await syncAllLocations()

    return NextResponse.json({
      success: true,
      total: result.total,
      synced: result.synced,
      skipped: result.skipped,
      errors: result.errors,
      details: result.details,
    })
  } catch (err) {
    console.error('[snapshot-sync] POST error:', err)
    return NextResponse.json(
      { error: 'Snapshot sync failed', detail: String(err) },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// GET — sync status overview
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const identity = await verifyIdentity(req)

    if (!identity.verified) {
      return NextResponse.json({ error: identity.error }, { status: 401 })
    }

    if (!identity.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const admin = getAdmin()
    const latestVersion = getLatestVersion()

    // Get all active installations with their snapshot_version
    const { data: installations, error } = await admin
      .from('crm_installations')
      .select('location_id, snapshot_version, status')
      .eq('status', 'active')

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch installations', detail: error.message },
        { status: 500 },
      )
    }

    const total = installations?.length ?? 0
    const upToDate = installations?.filter(
      (i) => (i.snapshot_version ?? 0) >= latestVersion,
    ).length ?? 0
    const needsSync = total - upToDate

    return NextResponse.json({
      latestVersion,
      totalLocations: total,
      upToDate,
      needsSync,
      locations: installations?.map((i) => ({
        locationId: i.location_id,
        currentVersion: i.snapshot_version ?? 0,
        upToDate: (i.snapshot_version ?? 0) >= latestVersion,
      })),
    })
  } catch (err) {
    console.error('[snapshot-sync] GET error:', err)
    return NextResponse.json(
      { error: 'Failed to get sync status', detail: String(err) },
      { status: 500 },
    )
  }
}
