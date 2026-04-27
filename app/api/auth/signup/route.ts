import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { provisionSubLocation } from '@/lib/provision'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const MASTER_LOCATION_ID = 'nphConTwfHcVE1oA0uep'
const MASTER_PIT = 'pit-f5f41b5a-32e4-4aee-84f4-a130cd3aad91'

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = (fullName || '').trim()
  if (!trimmed) return { firstName: 'User', lastName: '' }
  const parts = trimmed.split(/\s+/)
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || '',
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, company, website } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be 8+ characters' }, { status: 400 })
    }

    // 1. Create auth user via Supabase Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: full_name || '',
        company: company || '',
      },
    })

    if (authError) {
      if (authError.message?.includes('already')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Try signing in.' },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Generate 0n_ token
    const token = `0n_${crypto.randomBytes(24).toString('hex')}`

    // 3. Create profile row
    await supabase.from('profiles').upsert({
      id: userId,
      email,
      full_name: full_name || null,
      company: company || null,
      access_token: token,
      tier_level: 0,
      plan: 'free',
      onboarding_completed: false,
      onboarding_step: 1,
      business_name: company || null,
      website: website || null,
    }, { onConflict: 'id' })

    // 4. Create CRM contact in MASTER location (non-blocking)
    const { firstName, lastName } = splitName(full_name)
    let crmContactId: string | null = null

    try {
      const contactRes = await fetch(`${CRM_API}/contacts/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MASTER_PIT}`,
          Version: CRM_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          tags: ['0n User', 'Trial', 'Signup'],
          source: '0ncore-signup',
          companyName: company || '',
          locationId: MASTER_LOCATION_ID,
        }),
      })

      if (contactRes.ok) {
        const contactData = await contactRes.json()
        crmContactId = contactData.contact?.id || contactData.id || null
        if (crmContactId) {
          await supabase
            .from('profiles')
            .update({ crm_contact_id: crmContactId })
            .eq('id', userId)
        }
        console.log(`[auth/signup] CRM contact created: ${crmContactId} for ${email}`)
      } else {
        const errText = await contactRes.text()
        console.error(`[auth/signup] CRM contact creation failed: ${contactRes.status}`, errText)
      }
    } catch (crmErr) {
      console.error('[auth/signup] CRM contact error:', crmErr)
    }

    // 5. Start CRM sub-location provisioning (async — runs in background)
    provisionSubLocation(userId).then((result) => {
      console.log(`[auth/signup] Provision result for ${email}:`, result.success ? 'OK' : result.errors)
    }).catch((err) => {
      console.error(`[auth/signup] Provision failed for ${email}:`, err)
    })

    // 6. If website provided, scrape brand data in background
    if (website) {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/brand/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, website }),
      }).catch(() => {})
    }

    // 7. Track onboarding event
    await supabase.from('onboarding_events').insert({
      user_id: userId,
      step: 'signup_complete',
      metadata: {
        email,
        has_website: !!website,
        has_company: !!company,
        crm_contact_id: crmContactId,
      },
    })

    return NextResponse.json({
      ok: true,
      userId,
      token,
      status: 'provisioning',
    })
  } catch (err) {
    console.error('[auth/signup] Error:', err)
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
