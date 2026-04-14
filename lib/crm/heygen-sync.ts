/**
 * CRM <-> HeyGen Sync
 *
 * Reads a CRM contact, maps to ProfessionalProfile,
 * runs the PACG pipeline, writes video URL + archetype
 * + status back to CRM custom fields.
 */

import { crmGet, crmPut } from '@/lib/crm/client'
import { runPACGVideoPipeline, updateVideoRecord } from '@/lib/heygen/pacg-video-pipeline'
import { pollUntilComplete } from '@/lib/heygen/client'
import type { ProfessionalProfile } from '@/lib/heygen/types'

// ── CRM Custom Field Keys ───────────────────────────────────────

const CRM_FIELDS = {
  VIDEO_URL: 'heygen_video_url',
  VIDEO_STATUS: 'heygen_video_status',
  VIDEO_ID: 'heygen_video_id',
  SENIORITY: 'heygen_seniority_tier',
  ORG_SIZE: 'heygen_org_size_tier',
  VARIANT: 'heygen_variant_id',
  PIPELINE_DATE: 'heygen_pipeline_date',
}

// ── Contact → Profile mapper ────────────────────────────────────

interface CRMContact {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email?: string
  companyName?: string
  title?: string
  website?: string
  tags?: string[]
  customFields?: Array<{ id: string; key: string; value: string }>
  [key: string]: unknown
}

function getCustomField(contact: CRMContact, key: string): string | undefined {
  return contact.customFields?.find((f) => f.key === key)?.value
}

export function mapContactToProfile(
  contact: CRMContact,
  locationId: string
): ProfessionalProfile {
  const name =
    contact.name ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
    'there'

  return {
    contactId: contact.id,
    name,
    title: contact.title || getCustomField(contact, 'title') || 'Professional',
    company: contact.companyName || getCustomField(contact, 'company') || 'your company',
    industry: getCustomField(contact, 'industry') || 'Technology',
    companySize: parseInt(getCustomField(contact, 'company_size') || '0', 10) || undefined,
    yearsExperience: parseInt(getCustomField(contact, 'years_experience') || '0', 10) || undefined,
    linkedinUrl: getCustomField(contact, 'linkedin_url') || undefined,
    email: contact.email,
    painPoints: getCustomField(contact, 'pain_points')?.split(',').map((s) => s.trim()) ?? [],
    techStack: getCustomField(contact, 'tech_stack')?.split(',').map((s) => s.trim()) ?? [],
    locationId,
  }
}

// ── Fetch contact from CRM ──────────────────────────────────────

async function fetchContact(
  contactId: string,
  locationId: string
): Promise<CRMContact | null> {
  const res = await crmGet(`/contacts/${contactId}`, locationId)
  if (!res.ok) {
    console.error(`[heygen-sync] Failed to fetch contact ${contactId}:`, res.status)
    return null
  }
  const body = await res.json()
  return body.contact ?? body
}

// ── Write video fields back to CRM ──────────────────────────────

async function writeVideoFieldsToCRM(
  contactId: string,
  locationId: string,
  fields: Record<string, string>
) {
  const customFields = Object.entries(fields).map(([key, value]) => ({
    key,
    value,
  }))

  await crmPut(`/contacts/${contactId}`, locationId, {
    customFields,
  })
}

// ── Main sync function ──────────────────────────────────────────

export async function syncContactVideo(
  contactId: string,
  locationId: string,
  opts?: {
    testMode?: boolean
    forceVariantId?: string
    skipPolling?: boolean
  }
): Promise<{ executionId: string; videoId: string; status: string }> {
  // 1. Fetch contact
  const contact = await fetchContact(contactId, locationId)
  if (!contact) {
    throw new Error(`Contact ${contactId} not found in location ${locationId}`)
  }

  // 2. Map to profile
  const profile = mapContactToProfile(contact, locationId)

  // 3. Run PACG pipeline
  const result = await runPACGVideoPipeline(profile, {
    testMode: opts?.testMode,
    forceVariantId: opts?.forceVariantId,
  })

  // 4. Immediately write initial fields to CRM
  await writeVideoFieldsToCRM(contactId, locationId, {
    [CRM_FIELDS.VIDEO_ID]: result.videoId,
    [CRM_FIELDS.VIDEO_STATUS]: 'generating',
    [CRM_FIELDS.SENIORITY]: result.seniorityTier,
    [CRM_FIELDS.ORG_SIZE]: result.orgSizeTier,
    [CRM_FIELDS.VARIANT]: result.variant.id,
    [CRM_FIELDS.PIPELINE_DATE]: result.createdAt,
  })

  // 5. Optionally poll for completion and update
  if (!opts?.skipPolling) {
    // Fire-and-forget polling (don't block the response)
    pollAndUpdate(result.executionId, result.videoId, contactId, locationId).catch(
      (err) => console.error('[heygen-sync] poll failed:', err)
    )
  }

  return {
    executionId: result.executionId,
    videoId: result.videoId,
    status: 'generating',
  }
}

async function pollAndUpdate(
  executionId: string,
  videoId: string,
  contactId: string,
  locationId: string
) {
  try {
    const final = await pollUntilComplete(videoId, { timeoutMs: 300_000 })

    const status = final.status === 'completed' ? 'completed' : 'failed'

    // Update Supabase record
    await updateVideoRecord(executionId, {
      status,
      video_url: final.video_url ?? null,
      thumbnail_url: final.thumbnail_url ?? null,
    })

    // Update CRM fields
    const fields: Record<string, string> = {
      [CRM_FIELDS.VIDEO_STATUS]: status,
    }
    if (final.video_url) {
      fields[CRM_FIELDS.VIDEO_URL] = final.video_url
    }
    await writeVideoFieldsToCRM(contactId, locationId, fields)
  } catch (err) {
    console.error('[heygen-sync] pollAndUpdate error:', err)
    await updateVideoRecord(executionId, { status: 'failed' })
    await writeVideoFieldsToCRM(contactId, locationId, {
      [CRM_FIELDS.VIDEO_STATUS]: 'failed',
    })
  }
}
