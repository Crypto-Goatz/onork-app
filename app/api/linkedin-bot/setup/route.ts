// POST /api/linkedin-bot/setup
// One-time setup: creates CRM pipelines + custom fields for 0nLinkedIn
// Idempotent — safe to call multiple times

import { NextRequest, NextResponse } from 'next/server'

const CRM_BASE = 'https://services.leadconnectorhq.com'
const API_VERSION = '2021-07-28'

function getHeaders() {
  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT_ROCKETOPP
  if (!pit) throw new Error('No CRM PIT token')
  return {
    Authorization: `Bearer ${pit}`,
    'Content-Type': 'application/json',
    Version: API_VERSION,
  }
}

async function crmFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${CRM_BASE}${path}`, { ...opts, headers: { ...getHeaders(), ...(opts.headers || {}) } })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

export async function POST(req: NextRequest) {
  const locationId = process.env.CRM_LOCATION_ID
  if (!locationId) return NextResponse.json({ error: 'CRM_LOCATION_ID env var not set' }, { status: 500 })
  const results: Record<string, unknown> = {}

  try {
    // ═══ 1. Create Content Queue Pipeline ═══
    const contentPipeline = await crmFetch('/opportunities/pipelines', {
      method: 'POST',
      body: JSON.stringify({
        locationId,
        name: '0nLinkedIn Content Queue',
        stages: [
          { name: 'Pending Approval', position: 0 },
          { name: 'Approved', position: 1 },
          { name: 'Scheduled', position: 2 },
          { name: 'Posted', position: 3 },
          { name: 'Rejected', position: 4 },
          { name: 'Expired', position: 5 },
        ],
      }),
    })
    results.contentPipeline = contentPipeline.ok
      ? { id: contentPipeline.data?.pipeline?.id || contentPipeline.data?.id, status: 'created' }
      : { status: 'skipped', reason: contentPipeline.data }

    // ═══ 2. Create Lead Pipeline ═══
    const leadPipeline = await crmFetch('/opportunities/pipelines', {
      method: 'POST',
      body: JSON.stringify({
        locationId,
        name: '0nLinkedIn Lead Pipeline',
        stages: [
          { name: 'Commenter Identified', position: 0 },
          { name: 'ICP Scored', position: 1 },
          { name: 'Comment Sent', position: 2 },
          { name: 'Author Replied', position: 3 },
          { name: 'DM Sent', position: 4 },
          { name: 'Conversation Active', position: 5 },
          { name: 'Meeting Booked', position: 6 },
          { name: 'Converted', position: 7 },
        ],
      }),
    })
    results.leadPipeline = leadPipeline.ok
      ? { id: leadPipeline.data?.pipeline?.id || leadPipeline.data?.id, status: 'created' }
      : { status: 'skipped', reason: leadPipeline.data }

    // ═══ 3. Create Custom Fields ═══
    const customFields = [
      // Contact fields
      { name: 'LinkedIn Profile URL', dataType: 'TEXT', model: 'contact' },
      { name: 'ICP Score', dataType: 'NUMERICAL', model: 'contact' },
      { name: 'Last Comment Date', dataType: 'DATE', model: 'contact' },
      { name: 'Author Reply Received', dataType: 'CHECKBOX', model: 'contact' },
      { name: 'DM Sent', dataType: 'CHECKBOX', model: 'contact' },
      { name: 'Lead Source Post URL', dataType: 'TEXT', model: 'contact' },
      // Opportunity fields
      { name: 'VPIS Score', dataType: 'NUMERICAL', model: 'opportunity' },
      { name: 'Content Type', dataType: 'TEXT', model: 'opportunity' },
      { name: 'Post Text', dataType: 'LARGE_TEXT', model: 'opportunity' },
      { name: 'Predicted VPIS Score', dataType: 'NUMERICAL', model: 'opportunity' },
      { name: 'Actual VPIS Score', dataType: 'NUMERICAL', model: 'opportunity' },
      { name: 'Patterns Fired', dataType: 'TEXT', model: 'opportunity' },
      { name: 'Hook Archetype', dataType: 'TEXT', model: 'opportunity' },
      { name: 'Content Status', dataType: 'TEXT', model: 'opportunity' },
      { name: 'Scheduled For', dataType: 'DATE', model: 'opportunity' },
    ]

    const fieldResults: Array<{ name: string; status: string }> = []
    for (const field of customFields) {
      const res = await crmFetch(`/locations/${locationId}/customFields`, {
        method: 'POST',
        body: JSON.stringify({
          name: field.name,
          dataType: field.dataType,
          model: field.model,
        }),
      })
      fieldResults.push({ name: field.name, status: res.ok ? 'created' : 'exists_or_failed' })
    }
    results.customFields = fieldResults

    // ═══ 4. Create Tags ═══
    const tags = [
      'linkedin-post', 'linkedin-comment', 'vpis-elite', 'vpis-high',
      'icp-high', 'icp-medium', 'author-replied', 'dm-sent',
      'meeting-booked', '0nlinkedin-lead', '0nlinkedin-autopilot',
    ]
    const tagResults: Array<{ tag: string; status: string }> = []
    for (const tag of tags) {
      const res = await crmFetch(`/locations/${locationId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ name: tag }),
      })
      tagResults.push({ tag, status: res.ok ? 'created' : 'exists_or_failed' })
    }
    results.tags = tagResults

    return NextResponse.json({ ok: true, results })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
