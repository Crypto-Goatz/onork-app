import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const CRM_AGENCY_PIT = process.env.CRM_AGENCY_PIT || ''
const CRM_LOCATION_ID = process.env.CRM_LOCATION_ID || ''
const CRM_PIT = process.env.CRM_PIT || ''

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function crmRequest(path: string, method: string, token: string, body?: Record<string, unknown>) {
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Version': CRM_VERSION,
    },
  }
  if (body) options.body = JSON.stringify(body)
  const res = await fetch(`${CRM_API}${path}`, options)
  return res.json()
}

/**
 * POST /api/provision
 * Provisions a new user in the CRM + Stripe
 * Called after signup or when user first accesses dashboard
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = body.user_id as string
  const email = body.email as string
  const name = body.name as string

  if (!userId || !email) {
    return NextResponse.json({ error: 'user_id and email required' }, { status: 400 })
  }

  const admin = getAdmin()
  const results: Record<string, unknown> = { user_id: userId }

  // ── 1. CRM Contact ────────────────────────────────────────
  if (CRM_PIT) {
    try {
      // Check if contact already exists
      const searchResult = await crmRequest(
        `/contacts/search/duplicate?locationId=${CRM_LOCATION_ID}&email=${encodeURIComponent(email)}`,
        'GET',
        CRM_PIT
      )

      if (searchResult.contact) {
        results.crm_contact_id = searchResult.contact.id
        results.crm_status = 'existing'
      } else {
        // Create new contact
        const nameParts = (name || '').split(' ')
        const contact = await crmRequest('/contacts/', 'POST', CRM_PIT, {
          locationId: CRM_LOCATION_ID,
          email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          source: '0ncore',
          tags: ['0ncore-user', 'auto-provisioned', 'needs-onboarding', 'free-tier'],
        })

        if (contact.contact?.id) {
          results.crm_contact_id = contact.contact.id
          results.crm_status = 'created'
        } else {
          results.crm_status = 'failed'
          results.crm_error = contact.message || 'Unknown error'
        }
      }

      // Save CRM contact ID to profile
      if (results.crm_contact_id) {
        await admin.from('profiles').update({
          crm_contact_id: results.crm_contact_id,
        }).eq('id', userId)
      }
    } catch (err) {
      results.crm_status = 'error'
      results.crm_error = (err as Error).message
    }
  } else {
    results.crm_status = 'skipped'
    results.crm_note = 'CRM_PIT not configured'
  }

  // ── 2. Stripe Customer ────────────────────────────────────
  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY
  if (STRIPE_SECRET) {
    try {
      const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', userId).single()

      if (profile?.stripe_customer_id) {
        results.stripe_customer_id = profile.stripe_customer_id
        results.stripe_status = 'existing'
      } else {
        const res = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            email,
            name: name || '',
            'metadata[user_id]': userId,
            'metadata[source]': '0ncore',
          }),
        })
        const customer = await res.json()

        if (customer.id) {
          results.stripe_customer_id = customer.id
          results.stripe_status = 'created'
          await admin.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', userId)
        } else {
          results.stripe_status = 'failed'
          results.stripe_error = customer.error?.message
        }
      }
    } catch (err) {
      results.stripe_status = 'error'
      results.stripe_error = (err as Error).message
    }
  } else {
    results.stripe_status = 'skipped'
    results.stripe_note = 'STRIPE_SECRET_KEY not configured'
  }

  // ── 3. CRM Sub-Account (Location) ────────────────────────
  const CRM_AGENCY_PIT_TOKEN = process.env.CRM_AGENCY_PIT
  if (CRM_AGENCY_PIT_TOKEN) {
    try {
      const { data: profileCheck } = await admin
        .from('profiles')
        .select('crm_location_id')
        .eq('id', userId)
        .single()

      if (profileCheck?.crm_location_id) {
        results.crm_location_id = profileCheck.crm_location_id
        results.crm_subaccount_status = 'existing'
      } else {
        // Call the sub-account creation endpoint internally
        const subRes = await fetch(`${new URL(request.url).origin}/api/provision/crm-subaccount`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, email, name }),
        })
        const subData = await subRes.json()

        if (subData.crm_location_id) {
          results.crm_location_id = subData.crm_location_id
          results.crm_subaccount_status = subData.status
        } else {
          results.crm_subaccount_status = 'failed'
          results.crm_subaccount_error = subData.error || subData.detail
        }
      }
    } catch (err) {
      results.crm_subaccount_status = 'error'
      results.crm_subaccount_error = (err as Error).message
    }
  } else {
    results.crm_subaccount_status = 'skipped'
    results.crm_subaccount_note = 'CRM_AGENCY_PIT not configured'
  }

  // ── 4. Seed user_tiers at tier 0 (lobby) ──────────────────
  await admin.from('user_tiers').upsert({
    user_id: userId,
    tier_level: 0,
    tier_name: 'lobby',
  }, { onConflict: 'user_id' })
  results.user_tier = 'lobby (0)'

  // ── 5. Seed K1 in kb_content_queue (pending — filled during onboarding) ──
  await admin.from('kb_content_queue').upsert({
    user_id: userId,
    layer: 'K1',
    content: { business_name: '', brand_tone: 'professional' },
    status: 'pending',
  }, { onConflict: 'user_id,layer' })
  results.k1_seeded = true

  // ── 6. Update profile as provisioned (but NOT onboarded yet) ──
  await admin.from('profiles').update({
    provisioned_at: new Date().toISOString(),
    tier_level: 0,
  }).eq('id', userId)

  results.provisioned = true

  return NextResponse.json(results)
}

/**
 * GET /api/provision?user_id=...
 * Check provision status for a user
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const admin = getAdmin()
  const { data: profile } = await admin.from('profiles')
    .select('stripe_customer_id, crm_contact_id, crm_location_id, onboarding_complete, plan')
    .eq('id', userId)
    .single()

  return NextResponse.json({
    provisioned: !!(profile?.stripe_customer_id || profile?.crm_contact_id),
    stripe: !!profile?.stripe_customer_id,
    crm: !!profile?.crm_contact_id,
    crm_location: !!profile?.crm_location_id,
    plan: profile?.plan || 'free',
    onboarding_complete: profile?.onboarding_complete || false,
  })
}
