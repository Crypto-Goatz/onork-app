import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const TEST_EMAIL = 'mike@wpsxo.com'
const TEST_PASSWORD = '0nCore-Test-2026!'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/test-account
 * Creates or resets the mike@wpsxo.com test account.
 * Full auto-provisioning: Supabase user, profile, CRM contact, sub-location, tier, K1.
 * Body: { action: 'create' | 'delete' | 'status' }
 */
export async function POST(req: NextRequest) {
  const { action = 'status' } = await req.json().catch(() => ({ action: 'status' }))
  const admin = getAdmin()

  // ─── STATUS ───
  if (action === 'status') {
    const { data: users } = await admin.auth.admin.listUsers()
    const existing = users?.users?.find(u => u.email === TEST_EMAIL)

    if (!existing) return NextResponse.json({ exists: false, email: TEST_EMAIL })

    const { data: profile } = await admin
      .from('profiles')
      .select('business_name, crm_location_id, crm_contact_id, stripe_customer_id, provisioned_at, onboarding_complete, tier_level')
      .eq('id', existing.id)
      .single()

    return NextResponse.json({
      exists: true,
      email: TEST_EMAIL,
      user_id: existing.id,
      created_at: existing.created_at,
      profile: profile || null,
    })
  }

  // ─── DELETE ───
  if (action === 'delete') {
    const { data: users } = await admin.auth.admin.listUsers()
    const existing = users?.users?.find(u => u.email === TEST_EMAIL)

    if (existing) {
      // Clean up DB rows
      await admin.from('kb_content_queue').delete().eq('user_id', existing.id)
      await admin.from('user_tiers').delete().eq('user_id', existing.id)
      await admin.from('brand_profiles').delete().eq('user_id', existing.id)
      await admin.from('profiles').delete().eq('id', existing.id)
      await admin.auth.admin.deleteUser(existing.id)
    }

    return NextResponse.json({ deleted: true, email: TEST_EMAIL })
  }

  // ─── CREATE ───
  if (action === 'create') {
    // Delete existing first
    const { data: users } = await admin.auth.admin.listUsers()
    const existing = users?.users?.find(u => u.email === TEST_EMAIL)
    if (existing) {
      await admin.from('kb_content_queue').delete().eq('user_id', existing.id)
      await admin.from('user_tiers').delete().eq('user_id', existing.id)
      await admin.from('brand_profiles').delete().eq('user_id', existing.id)
      await admin.from('profiles').delete().eq('id', existing.id)
      await admin.auth.admin.deleteUser(existing.id)
    }

    // Create fresh user
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User (WPSXO)',
        is_test: true,
      },
    })

    if (createError || !newUser?.user) {
      return NextResponse.json({ error: createError?.message || 'Failed to create user' }, { status: 500 })
    }

    const userId = newUser.user.id
    const results: string[] = []

    // Create profile
    await admin.from('profiles').upsert({
      id: userId,
      full_name: 'Test User (WPSXO)',
      business_name: 'WPSXO Test Business',
      email: TEST_EMAIL,
      tier_level: 0,
      onboarding_complete: false,
      provisioned_at: null,
    })
    results.push('Profile created')

    // Seed user_tiers
    await admin.from('user_tiers').upsert({
      user_id: userId,
      tier_level: 0,
      tier_name: 'lobby',
    }, { onConflict: 'user_id' })
    results.push('Tier seeded (lobby)')

    // Seed K1
    await admin.from('kb_content_queue').upsert({
      user_id: userId,
      layer: 'K1',
      content: {
        business_name: 'WPSXO Test Business',
        industry: 'Technology',
        brand_tone: 'professional',
      },
      status: 'pending',
    }, { onConflict: 'user_id,layer' })
    results.push('K1 seeded')

    // CRM contact creation
    const crmPit = process.env.CRM_PIT || ''
    if (crmPit) {
      try {
        // Check for existing contact
        const searchRes = await fetch(`${CRM_API}/contacts/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${crmPit}`,
            'Content-Type': 'application/json',
            'Version': CRM_VERSION,
          },
          body: JSON.stringify({
            locationId: process.env.CRM_LOCATION_ID || '',
            filters: [{ field: 'email', operator: 'eq', value: TEST_EMAIL }],
          }),
        })
        const searchData = await searchRes.json()
        const existingContact = searchData.contacts?.[0]

        if (existingContact) {
          await admin.from('profiles').update({ crm_contact_id: existingContact.id }).eq('id', userId)
          results.push(`CRM contact found: ${existingContact.id}`)
        } else {
          const createRes = await fetch(`${CRM_API}/contacts/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${crmPit}`,
              'Content-Type': 'application/json',
              'Version': CRM_VERSION,
            },
            body: JSON.stringify({
              email: TEST_EMAIL,
              name: 'Test User WPSXO',
              locationId: process.env.CRM_LOCATION_ID || '',
              tags: ['0ncore-test', 'auto-provisioned'],
            }),
          })
          const createData = await createRes.json()
          if (createData.contact?.id) {
            await admin.from('profiles').update({ crm_contact_id: createData.contact.id }).eq('id', userId)
            results.push(`CRM contact created: ${createData.contact.id}`)
          }
        }
      } catch (err) {
        results.push(`CRM: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }

    // CRM sub-location provisioning
    const agencyPit = process.env.CRM_AGENCY_PIT_NEW || process.env.CRM_AGENCY_PIT || ''
    if (agencyPit) {
      try {
        const subRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/provision/crm-subaccount`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            email: TEST_EMAIL,
            name: 'WPSXO Test',
          }),
        })
        const subData = await subRes.json()
        if (subData.crm_location_id) {
          await admin.from('profiles').update({
            crm_location_id: subData.crm_location_id,
            provisioned_at: new Date().toISOString(),
          }).eq('id', userId)
          results.push(`Sub-location: ${subData.crm_location_id} (${subData.status})`)
        } else {
          results.push(`Sub-location: ${subData.error || 'no location returned'}`)
        }
      } catch (err) {
        results.push(`Sub-location: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }

    // Mark provisioned
    await admin.from('profiles').update({ provisioned_at: new Date().toISOString() }).eq('id', userId)
    results.push('Provisioned')

    return NextResponse.json({
      success: true,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      user_id: userId,
      results,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
