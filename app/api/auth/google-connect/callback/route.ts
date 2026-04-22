import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exchangeCode, getWorkspaceAuthUrl } from '@/lib/google/workspace'
import { google } from 'googleapis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/auth/google-connect/callback — OAuth callback
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'

  if (error) {
    return NextResponse.redirect(`${baseUrl}/dashboard/settings/analytics?error=oauth_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard/settings/analytics?error=missing_params`)
  }

  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    userId = decoded.userId
  } catch {
    return NextResponse.redirect(`${baseUrl}/dashboard/settings/analytics?error=invalid_state`)
  }

  try {
    const tokens = await exchangeCode(code)

    // Get user email from Google
    let email = ''
    try {
      const { OAuth2 } = google.auth
      const oauth = new OAuth2()
      oauth.setCredentials({ access_token: tokens.access_token })
      const people = google.people({ version: 'v1', auth: oauth })
      const me = await people.people.get({ resourceName: 'people/me', personFields: 'emailAddresses' })
      email = me.data.emailAddresses?.[0]?.value || ''
    } catch {
      // Fall back — email not critical
    }

    await supabase
      .from('profiles')
      .update({
        google_tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
          scope: tokens.scope,
          token_type: tokens.token_type,
          email,
          connected_at: new Date().toISOString(),
        },
      })
      .eq('id', userId)

    // Close popup and notify parent
    return new NextResponse(
      `<html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'google-connected', email: '${email}' }, '*');
          window.close();
        } else {
          window.location.href = '${baseUrl}/dashboard/settings/analytics?google=connected';
        }
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err) {
    console.error('[google-connect/callback] Token exchange failed:', err)
    return NextResponse.redirect(`${baseUrl}/dashboard/settings/analytics?error=token_exchange`)
  }
}
