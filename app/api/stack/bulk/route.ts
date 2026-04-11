import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { parseCSVBuffer } from '@/lib/0nstack/csv-parser'
import { parseContact } from '@/lib/0nstack/domain-parser'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ---------------------------------------------------------------------------
// Supabase admin client
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function resolveUser(req: Request): Promise<{ userId: string; tier: string } | null> {
  const authHeader = req.headers.get('authorization') || ''

  if (authHeader.startsWith('Bearer sk_')) {
    const rawKey = authHeader.slice(7)
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey))
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const db = adminClient()
    const { data: keyRow } = await db
      .from('stack_api_keys')
      .select('onmcp_user_id, tier, active')
      .eq('key_hash', keyHash)
      .single()

    if (!keyRow || !keyRow.active) return null
    return { userId: keyRow.onmcp_user_id, tier: keyRow.tier || 'free' }
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id, tier: 'free' }
}

// ---------------------------------------------------------------------------
// POST /api/stack/bulk — Upload CSV, create job + contacts
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const auth = await resolveUser(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse multipart form data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data with CSV file' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'Missing "file" field — upload a CSV' }, { status: 400 })
  }

  const emailColumnOverride = formData.get('emailColumn') as string | null
  const domainColumnOverride = formData.get('domainColumn') as string | null

  // Read file content
  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = parseCSVBuffer(buffer)

  if (parsed.totalRows === 0) {
    return NextResponse.json({ error: 'CSV is empty or could not be parsed' }, { status: 400 })
  }

  // Determine columns
  const emailCol = emailColumnOverride || parsed.emailColumn
  const domainCol = domainColumnOverride || parsed.domainColumn

  if (!emailCol && !domainCol) {
    return NextResponse.json({
      error: 'Could not detect an email or domain column. Provide emailColumn or domainColumn in the form.',
      detectedColumns: parsed.detectedColumns,
      headers: parsed.headers,
    }, { status: 400 })
  }

  const db = adminClient()

  // Create job record
  const { data: job, error: jobError } = await db
    .from('stack_jobs')
    .insert({
      onmcp_user_id: auth.userId,
      job_type: 'csv_upload',
      status: 'pending',
      source_filename: file.name,
      total_contacts: parsed.totalRows,
      processed: 0,
      skipped: 0,
      failed: 0,
      no_crm_count: 0,
      tier: auth.tier,
    })
    .select('id')
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Failed to create job', detail: jobError?.message }, { status: 500 })
  }

  const jobId = job.id

  // Build contact rows
  const contactRows = parsed.rows.map((row) => {
    const email = emailCol ? (row[emailCol] || '').trim() : ''
    const domainRaw = domainCol ? (row[domainCol] || '').trim() : ''
    const parsedContact = email ? parseContact(email) : null
    const domain = domainRaw
      ? domainRaw.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase()
      : parsedContact?.domain || null

    const isFreeMail = parsedContact?.isFreeMail || false
    const skipReason = !domain
      ? 'no_domain'
      : isFreeMail
        ? 'freemail'
        : null

    return {
      job_id: jobId,
      onmcp_user_id: auth.userId,
      raw_data: row,
      original_email: email || null,
      original_domain: parsedContact?.domain || domainRaw || null,
      resolved_domain: domain,
      domain_source: domainRaw ? 'explicit' : email ? 'email' : 'none',
      is_valid: !skipReason,
      skip_reason: skipReason,
      status: skipReason ? 'skipped' : 'pending',
    }
  })

  // Insert contacts in batches of 500
  const BATCH_SIZE = 500
  let insertedCount = 0
  let skippedCount = 0

  for (let i = 0; i < contactRows.length; i += BATCH_SIZE) {
    const batch = contactRows.slice(i, i + BATCH_SIZE)
    const { error: insertError } = await db.from('stack_contacts').insert(batch)
    if (insertError) {
      console.error(`[0nStack bulk] Batch insert error at offset ${i}:`, insertError.message)
    }
    for (const row of batch) {
      if (row.status === 'skipped') skippedCount++
      else insertedCount++
    }
  }

  // Update job with skip count
  await db.from('stack_jobs').update({ skipped: skippedCount }).eq('id', jobId)

  return NextResponse.json({
    jobId,
    filename: file.name,
    totalRows: parsed.totalRows,
    pendingEnrichment: insertedCount,
    skipped: skippedCount,
    detectedColumns: parsed.detectedColumns,
    status: 'pending',
  })
}
