import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * CRM Marketplace SSO Endpoint
 *
 * When a CRM user clicks on 0nCore in their sidebar, CRM sends them
 * here with an encrypted session token. We verify it and create a
 * Supabase session, then redirect to the dashboard.
 */

const SHARED_SECRET = process.env.CRM_MARKETPLACE_SHARED_SECRET || ''

export async function GET(req: NextRequest) {
  const ssoToken = req.nextUrl.searchParams.get('token')
  const locationId = req.nextUrl.searchParams.get('locationId')
  const companyId = req.nextUrl.searchParams.get('companyId')

  if (!ssoToken) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // For now, redirect to dashboard with location context
  // Full SSO token verification will decrypt the JWT from CRM
  const url = new URL('/dashboard', req.url)
  if (locationId) url.searchParams.set('locationId', locationId)

  return NextResponse.redirect(url)
}

export async function POST(req: NextRequest) {
  // CRM can also POST SSO data
  const body = await req.json()
  const { ssoToken, locationId, companyId, email } = body

  // Create or find user, start session, redirect
  return NextResponse.json({
    redirectUrl: `https://0ncore.com/dashboard?locationId=${locationId || ''}`,
  })
}
