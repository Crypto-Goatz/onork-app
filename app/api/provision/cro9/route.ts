/**
 * CRO9 Auto-Provisioning API
 * POST /api/provision/cro9
 *
 * Called from cro9.com signup → creates 0nCore account + CRM sub-location + enables CRO9
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getAgencyPIT(): string {
  return process.env.CRM_AGENCY_PIT_NEW || process.env.CRM_PIT_RAW || process.env.CRM_AGENCY_PIT || ''
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, company, domain, plan } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const companyName = company || fullName || email.split('@')[0]
    const startTime = Date.now()
    const log: string[] = []

    // ─── Step 1: Create Supabase Auth Account ───
    log.push('Creating auth account...')
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-verify for provisioned accounts
      user_metadata: {
        full_name: fullName || '',
        company_name: companyName,
        source: 'cro9',
        plan: plan || 'trial',
      },
    })

    if (authError) {
      // If user already exists, try to find them
      if (authError.message?.includes('already been registered')) {
        const { data: existingUsers } = await admin.auth.admin.listUsers()
        const existing = existingUsers?.users?.find(u => u.email === email)
        if (existing) {
          return NextResponse.json({
            error: 'Account already exists. Please log in.',
            loginUrl: 'https://0ncore.com/login',
          }, { status: 409 })
        }
      }
      console.error('[CRO9 Provision] Auth error:', authError.message)
      return NextResponse.json({ error: `Account creation failed: ${authError.message}` }, { status: 400 })
    }

    const userId = authData.user.id
    log.push(`Auth account created: ${userId}`)

    // ─── Step 2: Create/Update Profile ───
    log.push('Setting up profile...')
    await admin.from('profiles').upsert({
      id: userId,
      email,
      full_name: fullName || '',
      company_name: companyName,
      industry: 'seo',
      website: domain ? `https://${domain.replace(/^https?:\/\//, '')}` : '',
      source: 'cro9',
      is_admin: false,
      onboarding_complete: false,
      created_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    log.push('Profile created')

    // ─── Step 3: Auto-Provision CRM Sub-Location ───
    let locationId: string | null = null
    const agencyPIT = getAgencyPIT()

    if (agencyPIT) {
      log.push('Provisioning CRM sub-location...')
      try {
        const companyId = process.env.CRM_COMPANY_ID || ''
        const locRes = await fetch(`${CRM_API}/locations/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${agencyPIT}`,
            Version: CRM_VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId,
            name: `${companyName} — CRO9`,
            email,
            phone: '',
            address: '',
            city: '',
            state: '',
            country: 'US',
            postalCode: '',
            website: domain || '',
            timezone: 'America/New_York',
            settings: {
              allowDuplicateContact: false,
              allowDuplicateOpportunity: false,
            },
          }),
        })

        if (locRes.ok) {
          const locData = await locRes.json()
          locationId = locData.location?.id || locData.id || null
          log.push(`CRM location created: ${locationId}`)

          // Store location in profile
          if (locationId) {
            await admin.from('profiles').update({ crm_location_id: locationId }).eq('id', userId)
          }
        } else {
          const errText = await locRes.text().catch(() => '')
          console.error(`[CRO9 Provision] CRM location failed: ${locRes.status} — ${errText.substring(0, 200)}`)
          log.push(`CRM location failed: ${locRes.status} (non-blocking)`)
        }
      } catch (err) {
        console.error('[CRO9 Provision] CRM error:', err)
        log.push('CRM provisioning skipped (error)')
      }
    } else {
      log.push('No agency PIT — CRM provisioning skipped')
    }

    // ─── Step 4: Enable CRO9 Capabilities ───
    log.push('Enabling CRO9 capabilities...')
    await admin.from('user_tiers').upsert({
      user_id: userId,
      tier: 'cro9_trial',
      trial_start: new Date().toISOString(),
      trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      capabilities: ['cro9-neuro-engine', 'analytics', 'brand-board'],
      source: 'cro9',
    }, { onConflict: 'user_id' })
    log.push('CRO9 trial enabled (14 days)')

    // ─── Step 5: Seed K-Layers ───
    log.push('Seeding K-layers...')

    // K1: Platform capabilities
    await admin.from('kb_content_queue').upsert({
      user_id: userId,
      layer: 'K1',
      content: {
        platform: 'CRO9 by 0nCore',
        capabilities: [
          'SEO ranking analysis via Google Search Console',
          'AI-powered content briefs with federated models',
          'Adaptive scoring with Thompson Sampling',
          'SERP position tracking and snapshots',
          '6 action buckets: CTR Fix, Striking Distance, Relevance Rebuild, Position Climb, Schema Upgrade, Thin Content',
          'Multi-model AI: Claude, GPT, Gemini, Grok — learns which works best per task',
          'Google Analytics integration',
          'Brand board with two-way CRM sync',
        ],
      },
      status: 'active',
    }, { onConflict: 'user_id,layer' })

    // K3: Company (from signup data)
    await admin.from('kb_content_queue').upsert({
      user_id: userId,
      layer: 'K3',
      content: {
        company_name: companyName,
        industry: 'seo',
        website: domain || '',
        services: ['SEO', 'Content Marketing', 'CRO'],
      },
      status: 'active',
    }, { onConflict: 'user_id,layer' })

    log.push('K-layers seeded (K1 + K3)')

    // ─── Step 6: Create initial CRO9 site entry ───
    if (domain) {
      log.push(`Creating CRO9 site for ${domain}...`)
      await admin.from('cro9_sites').insert({
        user_id: userId,
        domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        location_id: locationId,
        status: 'pending_gsc',
        trial_active: true,
        trial_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }).select()
      log.push('CRO9 site created — awaiting GSC connection')
    }

    const durationMs = Date.now() - startTime
    log.push(`Provisioning complete in ${durationMs}ms`)

    console.log(`[CRO9 Provision] SUCCESS | ${email} | userId=${userId} | locationId=${locationId} | ${durationMs}ms`)

    return NextResponse.json({
      success: true,
      userId,
      locationId,
      email,
      plan: plan || 'trial',
      trialDays: 14,
      dashboardUrl: 'https://0ncore.com/dashboard/cro9-engine',
      gscConnectUrl: 'https://0ncore.com/dashboard/settings/analytics',
      log,
      durationMs,
    })
  } catch (error) {
    console.error('[CRO9 Provision] Fatal error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Provisioning failed',
    }, { status: 500 })
  }
}
