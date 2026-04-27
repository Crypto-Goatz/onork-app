/**
 * Snapshot Sync — Versioned CRM location provisioning
 *
 * Pushes custom fields, tags, pipelines, and custom values to all
 * active CRM sub-locations. Each version entry is additive — new
 * installs get everything, existing installs only get what's new.
 *
 * Usage:
 *   import { syncSnapshotToLocation, syncAllLocations } from '@/lib/snapshot-sync'
 *   await syncSnapshotToLocation(locationId, accessToken)
 *   const results = await syncAllLocations()
 */

import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

// ---------------------------------------------------------------------------
// Snapshot version entries — append new versions here, never mutate old ones
// ---------------------------------------------------------------------------

interface CustomFieldDef {
  name: string
  fieldKey: string
  dataType: 'TEXT' | 'NUMERICAL' | 'DATE' | 'CHECKBOX' | 'TEXTAREA'
}

interface PipelineDef {
  name: string
  stages: string[]
}

interface CustomValueDef {
  name: string
  value: string
}

interface SnapshotVersion {
  version: number
  description: string
  customFields: CustomFieldDef[]
  tags: string[]
  pipelines: PipelineDef[]
  customValues: CustomValueDef[]
}

const SNAPSHOT_UPDATES: SnapshotVersion[] = [
  {
    version: 1,
    description: 'Starter — Sales + Freelancer pipelines, base fields and tags',
    customFields: [
      { name: '0n Token', fieldKey: 'on_token', dataType: 'TEXT' },
      { name: 'VPIS Score', fieldKey: 'vpis_score', dataType: 'NUMERICAL' },
      { name: 'Market Intel Match', fieldKey: 'market_match', dataType: 'TEXT' },
      { name: 'WordPress Site', fieldKey: 'wordpress_url', dataType: 'TEXT' },
      { name: 'LinkedIn Profile', fieldKey: 'linkedin_url', dataType: 'TEXT' },
      { name: 'AI Sentiment', fieldKey: 'ai_sentiment', dataType: 'TEXT' },
      { name: 'Last 0n Action', fieldKey: 'last_on_action', dataType: 'TEXT' },
    ],
    tags: [
      'VIP', 'Freelancer', 'Agency', 'WordPress', 'AI Automation',
      '0n User', 'Trial', 'Churned', 'LinkedIn Lead', 'Market Intel Match',
      'Website Scanned', 'Voice AI Lead',
    ],
    pipelines: [
      {
        name: '0n Sales Pipeline',
        stages: ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed Won', 'Closed Lost'],
      },
      {
        name: '0n Freelancer Pipeline',
        stages: ['Brief Received', 'In Progress', 'Review', 'Delivered', 'Completed'],
      },
    ],
    customValues: [
      { name: 'oncore_api_endpoint', value: 'https://0ncore.com/api' },
      { name: 'oncore_vpis_target', value: '85' },
      { name: 'oncore_auto_respond', value: 'false' },
      { name: 'oncore_brand_voice', value: 'vibe' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function crmHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Version: CRM_VERSION,
  }
}

export function getLatestVersion(): number {
  return SNAPSHOT_UPDATES.length > 0
    ? SNAPSHOT_UPDATES[SNAPSHOT_UPDATES.length - 1].version
    : 0
}

// ---------------------------------------------------------------------------
// CRM API calls — one per resource type
// ---------------------------------------------------------------------------

async function createCustomField(
  locationId: string,
  token: string,
  field: CustomFieldDef,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${CRM_API}/locations/${locationId}/customFields`, {
      method: 'POST',
      headers: crmHeaders(token),
      body: JSON.stringify({
        name: field.name,
        fieldKey: field.fieldKey,
        dataType: field.dataType,
        model: 'contact',
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      // 422 = field already exists, treat as success
      if (res.status === 422) return { ok: true }
      return { ok: false, error: `${res.status}: ${body}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

async function createTag(
  locationId: string,
  token: string,
  tagName: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${CRM_API}/locations/${locationId}/tags`, {
      method: 'POST',
      headers: crmHeaders(token),
      body: JSON.stringify({ name: tagName }),
    })
    if (!res.ok) {
      const body = await res.text()
      if (res.status === 422) return { ok: true }
      return { ok: false, error: `${res.status}: ${body}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

async function createPipeline(
  token: string,
  locationId: string,
  pipeline: PipelineDef,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const stages = pipeline.stages.map((name, i) => ({
      name,
      position: i,
    }))
    const res = await fetch(`${CRM_API}/opportunities/pipelines`, {
      method: 'POST',
      headers: crmHeaders(token),
      body: JSON.stringify({
        name: pipeline.name,
        stages,
        locationId,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      if (res.status === 422) return { ok: true }
      return { ok: false, error: `${res.status}: ${body}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

async function createCustomValue(
  locationId: string,
  token: string,
  cv: CustomValueDef,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${CRM_API}/locations/${locationId}/customValues`, {
      method: 'POST',
      headers: crmHeaders(token),
      body: JSON.stringify({ name: cv.name, value: cv.value }),
    })
    if (!res.ok) {
      const body = await res.text()
      if (res.status === 422) return { ok: true }
      return { ok: false, error: `${res.status}: ${body}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ---------------------------------------------------------------------------
// Core sync — apply all versions above a location's current version
// ---------------------------------------------------------------------------

export interface SyncResult {
  locationId: string
  previousVersion: number
  newVersion: number
  fieldsCreated: number
  tagsCreated: number
  pipelinesCreated: number
  customValuesCreated: number
  errors: string[]
}

export async function syncSnapshotToLocation(
  locationId: string,
  token: string,
  currentVersion: number = 0,
): Promise<SyncResult> {
  const result: SyncResult = {
    locationId,
    previousVersion: currentVersion,
    newVersion: currentVersion,
    fieldsCreated: 0,
    tagsCreated: 0,
    pipelinesCreated: 0,
    customValuesCreated: 0,
    errors: [],
  }

  // Filter to only versions above what the location already has
  const pending = SNAPSHOT_UPDATES.filter((u) => u.version > currentVersion)

  if (pending.length === 0) return result

  for (const update of pending) {
    // Custom fields
    for (const field of update.customFields) {
      const r = await createCustomField(locationId, token, field)
      if (r.ok) {
        result.fieldsCreated++
      } else {
        result.errors.push(`field:${field.fieldKey} — ${r.error}`)
      }
    }

    // Tags
    for (const tag of update.tags) {
      const r = await createTag(locationId, token, tag)
      if (r.ok) {
        result.tagsCreated++
      } else {
        result.errors.push(`tag:${tag} — ${r.error}`)
      }
    }

    // Pipelines
    for (const pipeline of update.pipelines) {
      const r = await createPipeline(token, locationId, pipeline)
      if (r.ok) {
        result.pipelinesCreated++
      } else {
        result.errors.push(`pipeline:${pipeline.name} — ${r.error}`)
      }
    }

    // Custom values
    for (const cv of update.customValues) {
      const r = await createCustomValue(locationId, token, cv)
      if (r.ok) {
        result.customValuesCreated++
      } else {
        result.errors.push(`customValue:${cv.name} — ${r.error}`)
      }
    }

    result.newVersion = update.version
  }

  // Persist the new version to Supabase
  try {
    const admin = getAdmin()
    await admin
      .from('crm_installations')
      .update({ snapshot_version: result.newVersion })
      .eq('location_id', locationId)
  } catch (err) {
    result.errors.push(`db:snapshot_version update failed — ${String(err)}`)
  }

  return result
}

// ---------------------------------------------------------------------------
// Bulk sync — all active installations
// ---------------------------------------------------------------------------

export interface BulkSyncResult {
  total: number
  synced: number
  skipped: number
  errors: string[]
  details: SyncResult[]
}

export async function syncAllLocations(): Promise<BulkSyncResult> {
  const admin = getAdmin()
  const bulk: BulkSyncResult = {
    total: 0,
    synced: 0,
    skipped: 0,
    errors: [],
    details: [],
  }

  try {
    const { data: installations, error } = await admin
      .from('crm_installations')
      .select('location_id, access_token, snapshot_version, status')
      .eq('status', 'active')

    if (error) {
      bulk.errors.push(`db:fetch installations — ${error.message}`)
      return bulk
    }

    if (!installations || installations.length === 0) return bulk

    bulk.total = installations.length

    for (const inst of installations) {
      const currentVer = inst.snapshot_version ?? 0
      const latestVer = getLatestVersion()

      if (currentVer >= latestVer) {
        bulk.skipped++
        continue
      }

      try {
        const result = await syncSnapshotToLocation(
          inst.location_id,
          inst.access_token,
          currentVer,
        )
        bulk.details.push(result)

        if (result.errors.length === 0) {
          bulk.synced++
        } else {
          bulk.synced++
          bulk.errors.push(
            `${inst.location_id}: ${result.errors.length} partial errors`,
          )
        }
      } catch (err) {
        bulk.errors.push(`${inst.location_id}: ${String(err)}`)
      }
    }
  } catch (err) {
    bulk.errors.push(`syncAllLocations: ${String(err)}`)
  }

  return bulk
}
