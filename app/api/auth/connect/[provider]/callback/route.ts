import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getProvider, getRedirectUri } from '@/lib/oauth-providers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/auth/connect/[provider]/callback — OAuth callback for any provider
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
  const settingsUrl = `${baseUrl}/dashboard/settings/accounts`

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?error=oauth_denied&provider=${providerId}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=missing_params&provider=${providerId}`)
  }

  const provider = getProvider(providerId)
  if (!provider) {
    return NextResponse.redirect(`${settingsUrl}?error=unknown_provider`)
  }

  // Decode state
  let userId: string
  let codeVerifier: string | undefined
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    userId = decoded.userId
    codeVerifier = decoded.cv
  } catch {
    return NextResponse.redirect(`${settingsUrl}?error=invalid_state&provider=${providerId}`)
  }

  const clientId = process.env[provider.clientIdEnv]
  const clientSecret = process.env[provider.clientSecretEnv]

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${settingsUrl}?error=not_configured&provider=${providerId}`)
  }

  try {
    // Exchange code for tokens
    const tokenParams: Record<string, string> = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: getRedirectUri(providerId),
      grant_type: 'authorization_code',
    }

    // Add PKCE verifier if needed
    if (codeVerifier) {
      tokenParams.code_verifier = codeVerifier
    }

    const tokenRes = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(tokenParams),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error(`[oauth/${providerId}] Token exchange failed:`, errText)
      return NextResponse.redirect(`${settingsUrl}?error=token_exchange&provider=${providerId}`)
    }

    const tokens = await tokenRes.json()
    const accessToken = tokens.access_token
    const refreshToken = tokens.refresh_token || null
    const expiresIn = tokens.expires_in ? Number(tokens.expires_in) : null
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null
    const scope = tokens.scope || provider.scopes.join(' ')

    // Fetch user profile
    let profile = {
      provider_account_id: '',
      provider_email: null as string | null,
      provider_name: null as string | null,
      provider_avatar: null as string | null,
    }

    try {
      const profileRes = await fetch(provider.profileUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        profile = provider.extractProfile(profileData)
      }
    } catch {
      // Profile fetch is best-effort
    }

    // GitHub special case: email might be private, fetch from /user/emails
    if (providerId === 'github' && !profile.provider_email) {
      try {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
          },
        })
        if (emailsRes.ok) {
          const emails = await emailsRes.json()
          const primary = emails.find((e: Record<string, unknown>) => e.primary) || emails[0]
          if (primary) profile.provider_email = primary.email as string
        }
      } catch {
        // Best effort
      }
    }

    // Upsert into user_connections
    const { error: dbError } = await supabase
      .from('user_connections')
      .upsert(
        {
          user_id: userId,
          provider: providerId,
          provider_account_id: profile.provider_account_id,
          provider_email: profile.provider_email,
          provider_name: profile.provider_name,
          provider_avatar: profile.provider_avatar,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: tokens.token_type || 'Bearer',
          expires_at: expiresAt,
          scopes: scope,
          status: 'active',
          health_status: 'healthy',
          consecutive_failures: 0,
          last_error: null,
          metadata: {},
        },
        { onConflict: 'user_id,provider' },
      )

    if (dbError) {
      console.error(`[oauth/${providerId}] DB error:`, dbError)
      return NextResponse.redirect(`${settingsUrl}?error=db_error&provider=${providerId}`)
    }

    // Close popup and notify parent window
    const displayName = profile.provider_email || profile.provider_name || providerId
    return new NextResponse(
      `<html><body><script>
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-connected',
            provider: '${providerId}',
            email: '${displayName.replace(/'/g, "\\'")}',
          }, '*');
          window.close();
        } else {
          window.location.href = '${settingsUrl}?connected=${providerId}';
        }
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    )
  } catch (err) {
    console.error(`[oauth/${providerId}] Callback error:`, err)
    return NextResponse.redirect(`${settingsUrl}?error=unknown&provider=${providerId}`)
  }
}
