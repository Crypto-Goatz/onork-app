import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * OAuth Token Endpoint for CRM External Authentication
 *
 * The CRM calls this to exchange an authorization code for an access token.
 * This is the reverse flow — CRM authenticates WITH us.
 */

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)

  const grantType = params.get('grant_type')
  const code = params.get('code')
  const clientId = params.get('client_id')
  const clientSecret = params.get('client_secret')
  const refreshToken = params.get('refresh_token')

  // Validate client credentials — check both main app AND external auth credentials
  const validClients = [
    { id: process.env.CRM_MARKETPLACE_CLIENT_ID, secret: process.env.CRM_MARKETPLACE_CLIENT_SECRET },
    { id: process.env.CRM_EXTERNAL_AUTH_CLIENT_ID, secret: process.env.CRM_EXTERNAL_AUTH_CLIENT_SECRET },
  ]

  const isValid = validClients.some(c => c.id && c.secret && clientId === c.id && clientSecret === c.secret)
  if (!isValid) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 })
  }

  if (grantType === 'authorization_code' && code) {
    // Exchange code for token
    const accessToken = crypto.randomBytes(32).toString('hex')
    const newRefreshToken = crypto.randomBytes(32).toString('hex')

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours
      refresh_token: newRefreshToken,
      scope: 'all',
    })
  }

  if (grantType === 'refresh_token' && refreshToken) {
    // Refresh the token
    const accessToken = crypto.randomBytes(32).toString('hex')

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400,
      refresh_token: refreshToken, // Keep same refresh token
      scope: 'all',
    })
  }

  return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
}
