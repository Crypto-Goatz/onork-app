import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import * as path from 'path'
import * as fs from 'fs'

// Service account for server-side API access (Analytics, Search Console, etc.)
let _jwtClient: JWT | null = null

export function getServiceAccountAuth(): JWT {
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
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics',
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters',
      'https://www.googleapis.com/auth/business.manage',
    ],
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
