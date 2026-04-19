import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MASTER_SNAPSHOT, deploySnapshot } from '@/lib/snapshot'

/**
 * Snapshot Deploy API
 * POST /api/snapshots/deploy
 * Body: { locationId, snapshotId? }
 * Auth: admin only or webhook secret
 */

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check webhook secret auth first
  const authHeader = request.headers.get('authorization')
  const webhookSecret = process.env.SNAPSHOT_WEBHOOK_SECRET
  const isWebhookAuth = webhookSecret && authHeader === `Bearer ${webhookSecret}`

  let locationId: string | undefined

  if (!isWebhookAuth) {
    // User auth — must be admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, crm_location_id')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
  }

  try {
    const body = await request.json()
    locationId = body.locationId

    if (!locationId) {
      return NextResponse.json({ error: 'locationId required' }, { status: 400 })
    }

    const snapshotId = body.snapshotId || 'master-v1'
    const snapshot = snapshotId === 'master-v1' ? MASTER_SNAPSHOT : MASTER_SNAPSHOT

    // Get auth token for the location
    const { getAuthForLocation } = await import('@/lib/crm')
    const auth = await getAuthForLocation(locationId)

    const result = await deploySnapshot(locationId, snapshot, auth.token)

    // Log deployment to Supabase
    try {
      await supabase.from('snapshot_deployments').insert({
        location_id: locationId,
        snapshot_id: snapshot.id,
        snapshot_version: snapshot.version,
        deployed_items: result.deployed,
        errors: result.errors,
        success: result.success,
      })
    } catch {
      // Non-fatal — table may not exist yet
    }

    return NextResponse.json({
      success: result.success,
      snapshot: { id: snapshot.id, name: snapshot.name, version: snapshot.version },
      deployed: result.deployed,
      errors: result.errors,
      locationId,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Deployment failed',
    }, { status: 500 })
  }
}
