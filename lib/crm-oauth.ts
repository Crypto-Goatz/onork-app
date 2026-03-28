import crypto from 'crypto'

const TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token'
const AUTH_URL = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation'

// Full scope list — includes KB and Agent Studio
const DEFAULT_SCOPES = [
  'contacts.readonly', 'contacts.write',
  'conversations.readonly', 'conversations.write',
  'conversations/message.readonly', 'conversations/message.write',
  'opportunities.readonly', 'opportunities.write',
  'calendars.readonly', 'calendars.write',
  'calendars/events.readonly', 'calendars/events.write',
  'invoices.readonly', 'invoices.write',
  'payments.readonly', 'payments.write',
  'products.readonly', 'products.write',
  'locations.readonly', 'locations.write',
  'locations/tags.readonly', 'locations/tags.write',
  'locations/customFields.readonly', 'locations/customFields.write',
  'locations/customValues.readonly', 'locations/customValues.write',
  'users.readonly', 'users.write',
  'workflows.readonly',
  'forms.readonly',
  'businesses.readonly', 'businesses.write',
  'calendars/groups.readonly', 'calendars/groups.write',
  'saas/company.read', 'saas/company.write',
  'saas/location.read', 'saas/location.write',
]

function getOAuthConfig() {
  const clientId = process.env.CRM_MARKETPLACE_CLIENT_ID || process.env.CRM_MASTER_CLIENT_ID
  const clientSecret = process.env.CRM_MARKETPLACE_CLIENT_SECRET || process.env.CRM_MASTER_CLIENT_SECRET
  const redirectUri = process.env.CRM_OAUTH_REDIRECT_URI || 'https://0ncore.com/api/oauth/callback'
  if (!clientId || !clientSecret) throw new Error('CRM OAuth not configured')
  return { clientId, clientSecret, redirectUri }
}

export function getAuthorizationUrl(state?: string): string {
  const { clientId, redirectUri } = getOAuthConfig()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: DEFAULT_SCOPES.join(' '),
    ...(state ? { state } : {}),
  })
  return `${AUTH_URL}?${params}`
}

export async function exchangeCodeForTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig()
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
  return res.json()
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getOAuthConfig()
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  return res.json()
}

export function generateState(): string {
  return crypto.randomBytes(32).toString('hex')
}
