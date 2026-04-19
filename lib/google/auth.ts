import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import * as path from 'path'
import * as fs from 'fs'

// Service account for server-side API access (Analytics, Search Console, etc.)
let _jwtClient: JWT | null = null

const SA_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/business.manage',
]

/**
 * Build a JWT client from a user-specific SA key (stored in profile).
 * Returns a fresh JWT each time — do NOT cache, since it varies per user.
 */
export function getServiceAccountAuthFromKey(saKey: { client_email: string; private_key: string }): JWT {
  return new JWT({
    email: saKey.client_email,
    key: saKey.private_key,
    scopes: SA_SCOPES,
  })
}

/**
 * Default (global) service account auth.
 * 1. First check for a user-specific SA key if userSaKey is provided
 * 2. Fall back to GOOGLE_SA_KEY env var
 * 3. Fall back to local google-sa.json file
 */
export function getServiceAccountAuth(userSaKey?: { client_email: string; private_key: string } | null): JWT {
  // Per-user SA key takes priority
  if (userSaKey && userSaKey.client_email && userSaKey.private_key) {
    return getServiceAccountAuthFromKey(userSaKey)
  }

  // Global cached client
  if (_jwtClient) return _jwtClient

  // Try env var first (for Vercel), then local file
  const saKey = process.env.GOOGLE_SA_KEY
    ? JSON.parse(process.env.GOOGLE_SA_KEY)
    : (() => {
        const filePath = path.join(process.cwd(), 'google-sa.json')
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'))
        throw new Error('Google SA key not found. Set GOOGLE_SA_KEY env or place google-sa.json in project root.')
      })()

  _jwtClient = new JWT({
    email: saKey.client_email,
    key: saKey.private_key,
    scopes: SA_SCOPES,
  })

  return _jwtClient
}

// OAuth client for user-facing flows (Ads, user consent)
export function getOAuthClient() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars required')
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'https://0ncore.com/api/auth/google-connect/callback'
  )
}

// Pre-configured API clients
export function getAnalyticsDataClient() {
  const auth = getServiceAccountAuth()
  return google.analyticsdata({ version: 'v1beta', auth })
}

export function getAnalyticsAdminClient() {
  const auth = getServiceAccountAuth()
  return google.analyticsadmin({ version: 'v1beta', auth })
}

export function getSearchConsoleClient() {
  const auth = getServiceAccountAuth()
  return google.searchconsole({ version: 'v1', auth })
}

export function getWebmastersClient() {
  const auth = getServiceAccountAuth()
  return google.webmasters({ version: 'v3', auth })
}

// GA4 Property ID — default to 0nMCP property, override per-user
export const DEFAULT_GA4_PROPERTY = process.env.GA4_PROPERTY_ID || '444978038'
