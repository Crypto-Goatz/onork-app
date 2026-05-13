import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEMO_EMAIL = 'demo@0ncore.com'
const DEMO_PASSWORD = '0nCore-Demo-2026!'

// GET /api/auth/demo — Auto-login with demo credentials and redirect.
// Gated behind ALLOW_DEMO_ACCOUNTS=true. In production this 404s so the
// demo path can't be hit by real users.
export async function GET(req: NextRequest) {
  if (process.env.ALLOW_DEMO_ACCOUNTS !== 'true') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const redirect = searchParams.get('redirect') || '/dashboard'
  const locationId = searchParams.get('locationId') || 'demo-location'
  const embed = searchParams.get('embed') || ''

  // Ensure demo user exists
  const { data: existingUser } = await supabase.auth.admin.listUsers()
  const demoUser = existingUser?.users?.find(u => u.email === DEMO_EMAIL)

  if (!demoUser) {
    // Create demo user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'GHL Reviewer', company: 'GoHighLevel' },
    })

    if (createError) {
      console.error('[demo] Failed to create demo user:', createError)
      return NextResponse.json({ error: 'Demo setup failed' }, { status: 500 })
    }

    // Create profile
    if (newUser?.user) {
      await supabase.from('profiles').upsert({
        id: newUser.user.id,
        email: DEMO_EMAIL,
        full_name: 'GHL Reviewer',
        company: 'GoHighLevel',
        is_admin: false,
        role: 'member',
        crm_location_id: locationId,
      })
    }
  }

  // Build redirect URL
  let url = redirect
  const params = new URLSearchParams()
  if (embed) params.set('embed', embed)
  if (locationId !== 'demo-location') params.set('locationId', locationId)
  if (params.toString()) url += `?${params.toString()}`

  // Return demo credentials for the reviewer to use
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'

  return NextResponse.json({
    message: '0nCore Demo Access',
    credentials: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    },
    urls: {
      login: `${baseUrl}/login`,
      dashboard: `${baseUrl}/dashboard`,
      embed: `${baseUrl}/dashboard?locationId=${locationId}&embed=true`,
    },
    instructions: [
      '1. Go to the login URL below',
      '2. Enter the demo credentials',
      '3. You will be redirected to the dashboard',
      '4. For embed testing, use the embed URL',
    ],
  })
}
