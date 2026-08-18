/**
 * Multi-provider OAuth configuration.
 * Each provider defines its auth URL, token URL, scopes, and profile endpoint.
 */

export interface OAuthProvider {
  id: string
  name: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
  profileUrl: string
  clientIdEnv: string
  clientSecretEnv: string
  /** Override the default callback URL pattern */
  redirectUriOverride?: string
  /** Extra params to add to the auth URL */
  extraAuthParams?: Record<string, string>
  /** How to extract user info from the profile response */
  extractProfile: (data: Record<string, unknown>) => {
    provider_account_id: string
    provider_email: string | null
    provider_name: string | null
    provider_avatar: string | null
  }
}

export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  google: {
    id: 'google',
    name: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/analytics.readonly', // GA4
      'https://www.googleapis.com/auth/webmasters.readonly', // Search Console
      'https://www.googleapis.com/auth/business.manage', // Business Profile (reviews/local)
      'https://www.googleapis.com/auth/adwords', // Google Ads (needs developer token to call)
      'https://www.googleapis.com/auth/calendar', // Calendar sync
      'https://www.googleapis.com/auth/tasks', // Tasks sync
    ],
    profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    // offline + consent → guarantees a refresh_token so server-side reads keep working
    //
    // NO include_granted_scopes HERE, deliberately. It looks harmless — "also
    // carry forward what the user already approved" — and it is what produced
    // `Error 400: invalid_request` on connect. Incremental authorization merges
    // every scope this account has EVER granted this client into one request,
    // so an unrelated older grant (a Drive/YouTube consent, in our case) gets
    // folded in beside Analytics and Ads and Google rejects the combination.
    //
    // The failure is invisible in the code, because the offending scopes are
    // not in this file — they are in the user's grant history. It also fails
    // per-account: a fresh Google account connects fine while the owner's does
    // not, which reads as "works for everyone but me".
    //
    // Requesting exactly the scopes listed above, and no more, is both the fix
    // and the correct behaviour: a re-consent shows the user precisely what
    // this app is asking for.
    extraAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    extractProfile: (data) => ({
      provider_account_id: String(data.id || data.sub || ''),
      provider_email: (data.email as string) || null,
      provider_name: (data.name as string) || null,
      provider_avatar: (data.picture as string) || null,
    }),
  },

  facebook: {
    id: 'facebook',
    name: 'Facebook',
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scopes: [
      'email',
      'public_profile',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_read_user_content',
      'ads_read',
      'read_insights',
    ],
    profileUrl: 'https://graph.facebook.com/v19.0/me?fields=id,name,email,picture',
    clientIdEnv: 'FACEBOOK_APP_ID',
    clientSecretEnv: 'FACEBOOK_APP_SECRET',
    extractProfile: (data) => ({
      provider_account_id: String(data.id || ''),
      provider_email: (data.email as string) || null,
      provider_name: (data.name as string) || null,
      provider_avatar: ((data.picture as Record<string, unknown>)?.data as Record<string, unknown>)?.url as string || null,
    }),
  },

  github: {
    id: 'github',
    name: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['user:email', 'read:user', 'repo', 'read:org'],
    profileUrl: 'https://api.github.com/user',
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
    extractProfile: (data) => ({
      provider_account_id: String(data.id || ''),
      provider_email: (data.email as string) || null,
      provider_name: (data.name as string) || (data.login as string) || null,
      provider_avatar: (data.avatar_url as string) || null,
    }),
  },

  x: {
    id: 'x',
    name: 'X (Twitter)',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    profileUrl: 'https://api.twitter.com/2/users/me?user.fields=profile_image_url,description',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
    extraAuthParams: { code_challenge_method: 'S256' },
    extractProfile: (data) => {
      const user = (data.data || data) as Record<string, unknown>
      return {
        provider_account_id: String(user.id || ''),
        provider_email: null, // X doesn't expose email in v2
        provider_name: (user.name as string) || (user.username as string) || null,
        provider_avatar: (user.profile_image_url as string) || null,
      }
    },
  },

  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'email', 'w_member_social'],
    profileUrl: 'https://api.linkedin.com/v2/userinfo',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    extractProfile: (data) => ({
      provider_account_id: String(data.sub || ''),
      provider_email: (data.email as string) || null,
      provider_name: (data.name as string) || null,
      provider_avatar: (data.picture as string) || null,
    }),
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: [
      'channels:read',
      'channels:history',
      'chat:write',
      'users:read',
      'users:read.email',
      'team:read',
      'groups:read',
      'im:read',
      'files:read',
    ],
    profileUrl: 'https://slack.com/api/users.identity',
    clientIdEnv: 'SLACK_CLIENT_ID',
    clientSecretEnv: 'SLACK_CLIENT_SECRET',
    extraAuthParams: { user_scope: 'identity.basic,identity.email,identity.avatar' },
    extractProfile: (data) => {
      const user = (data.user || data) as Record<string, unknown>
      const team = (data.team || {}) as Record<string, unknown>
      return {
        provider_account_id: String(user.id || ''),
        provider_email: (user.email as string) || null,
        provider_name: (user.name as string) || null,
        provider_avatar: (user.image_72 as string) || (user.image_48 as string) || null,
      }
    },
  },
}

export function getProvider(id: string): OAuthProvider | null {
  return OAUTH_PROVIDERS[id] || null
}

export function getRedirectUri(provider: string): string {
  const config = OAUTH_PROVIDERS[provider]
  if (config?.redirectUriOverride) return config.redirectUriOverride
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
  return `${base}/api/auth/connect/${provider}/callback`
}

/**
 * Generate a PKCE code verifier + challenge for providers that need it (X/Twitter).
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = Buffer.from(array).toString('base64url')

  // S256 challenge
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  // Use sync crypto for server-side
  const hashBuffer = require('crypto').createHash('sha256').update(data).digest()
  const challenge = Buffer.from(hashBuffer).toString('base64url')

  return { verifier, challenge }
}
