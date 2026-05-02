import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getProvider, getRedirectUri } from '@/lib/oauth-providers'
import {
  upsertConnection,
  IdentityMismatchError,
  type Provider,
} from '@/lib/oauth/connections'

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
  let mode: string = 'connect'
  let nextPath: string | null = null
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    userId = decoded.userId
    codeVerifier = decoded.cv
    mode = decoded.mode || 'connect'
    if (typeof decoded.next === 'string' && decoded.next.startsWith('/')) {
      nextPath = decoded.next
    }
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

    // Slack returns { ok: true, access_token, authed_user: { access_token, id } }
    // Other providers return { access_token, refresh_token, expires_in }
    let accessToken: string
    let refreshToken: string | null = null
    let expiresAt: string | null = null
    let scope: string

    if (providerId === 'slack') {
      if (!tokens.ok) {
        console.error(`[oauth/slack] Token exchange failed:`, tokens.error)
        return NextResponse.redirect(`${settingsUrl}?error=token_exchange&provider=slack`)
      }
      // Use the bot token for API access, user token for identity
      accessToken = tokens.access_token || tokens.authed_user?.access_token
      scope = tokens.scope || ''
    } else {
      accessToken = tokens.access_token
      refreshToken = tokens.refresh_token || null
      const expiresIn = tokens.expires_in ? Number(tokens.expires_in) : null
      expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null
      scope = tokens.scope || provider.scopes.join(' ')
    }

    // Fetch user profile
    let profile = {
      provider_account_id: '',
      provider_email: null as string | null,
      provider_name: null as string | null,
      provider_avatar: null as string | null,
    }

    try {
      // Slack identity uses the authed_user token
      const profileToken = providerId === 'slack'
        ? (tokens.authed_user?.access_token || accessToken)
        : accessToken

      const profileRes = await fetch(provider.profileUrl, {
        headers: { Authorization: `Bearer ${profileToken}` },
      })
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        profile = provider.extractProfile(profileData)

        // Slack: also store team info in metadata
        if (providerId === 'slack' && tokens.team) {
          profile.provider_account_id = tokens.authed_user?.id || profile.provider_account_id
        }
      }
    } catch {
      // Profile fetch is best-effort
      // For Slack, we can extract from the token response directly
      if (providerId === 'slack') {
        profile.provider_account_id = tokens.authed_user?.id || tokens.bot_user_id || ''
        profile.provider_name = tokens.team?.name || 'Slack Workspace'
      }
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

    // Slack login mode — find or create user, then sign them in
    let freshlyCreated = false
    if (mode === 'login' && providerId === 'slack' && profile.provider_email) {
      // Check if user exists with this email
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(u => u.email === profile.provider_email)

      if (existingUser) {
        userId = existingUser.id
      } else {
        // Create new user
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: profile.provider_email,
          email_confirm: true,
          user_metadata: {
            full_name: profile.provider_name,
            avatar_url: profile.provider_avatar,
            provider: 'slack',
          },
        })
        if (createErr || !newUser.user) {
          console.error('[oauth/slack] Failed to create user:', createErr)
          return NextResponse.redirect(`${settingsUrl}?error=user_creation&provider=slack`)
        }
        userId = newUser.user.id
        freshlyCreated = true

        // Create profile
        await supabase.from('profiles').upsert({
          id: userId,
          email: profile.provider_email,
          full_name: profile.provider_name,
          avatar_url: profile.provider_avatar,
        }, { onConflict: 'id' })
      }
    }

    // Upsert into user_connections via the email-keyed identity unifier.
    // - mode='login' (Slack only) already created/found the user above; pass
    //   userId explicitly.
    // - mode='connect' enforces that provider_email matches profile.email.
    //   Mismatch throws IdentityMismatchError → user-facing error redirect.
    //
    // Persist OIDC id_token (Google/LinkedIn return one) into metadata so a
    // future role-decoding pass can read groups/claims without a re-auth.
    const baseMetadata: Record<string, unknown> =
      providerId === 'slack' && tokens.team
        ? { team_id: tokens.team.id, team_name: tokens.team.name }
        : {}
    if (tokens.id_token) {
      baseMetadata.id_token = tokens.id_token
    }

    try {
      await upsertConnection({
        provider: providerId as Provider,
        oncoreUserId: userId,
        providerAccountId: profile.provider_account_id,
        providerEmail: profile.provider_email,
        providerName: profile.provider_name,
        providerAvatar: profile.provider_avatar,
        accessToken,
        refreshToken,
        tokenType: tokens.token_type || 'Bearer',
        expiresAt,
        scopes: scope,
        metadata: baseMetadata,
        // Fresh Slack-login users have a profile.email we just wrote; the
        // identity check can race the write, so skip it for that one path.
        skipIdentityCheck: mode === 'login' && freshlyCreated,
      })

      // For freshly-created users, ensure profiles.email is backfilled so
      // subsequent connects pass the identity check on the first try.
      if (mode === 'login' && freshlyCreated && profile.provider_email) {
        await supabase
          .from('profiles')
          .update({ email: profile.provider_email })
          .eq('id', userId)
      }
    } catch (err) {
      if (err instanceof IdentityMismatchError) {
        console.warn(`[oauth/${providerId}] identity mismatch:`, err.message)
        return NextResponse.redirect(
          `${settingsUrl}?error=identity_mismatch&provider=${providerId}&detail=${encodeURIComponent(err.message)}`,
        )
      }
      console.error(`[oauth/${providerId}] upsert error:`, err)
      return NextResponse.redirect(`${settingsUrl}?error=db_error&provider=${providerId}`)
    }

    // For Slack login mode, generate a magic link to create a Supabase session.
    // Honor `state.next` if it was carried through; otherwise land on /dashboard.
    // We never default to /install/slack here — that path is for bot install,
    // not identity-scope login.
    if (mode === 'login' && profile.provider_email) {
      const loginRedirect = `${baseUrl}${nextPath || '/dashboard'}`
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.provider_email,
        options: { redirectTo: loginRedirect },
      })

      if (linkErr || !linkData?.properties?.hashed_token) {
        console.error('[oauth/slack] Magic link generation failed:', linkErr)
        return NextResponse.redirect(`${baseUrl}/login?error=auth_failed`)
      }

      const actionLink = linkData.properties.action_link
      return NextResponse.redirect(actionLink)
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
