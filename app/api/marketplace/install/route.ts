import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * CRM Marketplace Install Endpoint
 *
 * When an agency installs 0nCore from the marketplace, CRM sends
 * a POST to this endpoint with the installation details.
 * We verify the signature, store the tokens, and redirect to onboarding.
 */

const SHARED_SECRET = process.env.CRM_MARKETPLACE_SHARED_SECRET || ''

function verifySignature(body: string, signature: string): boolean {
  if (!SHARED_SECRET) return true // Skip in dev
  const expected = crypto
    .createHmac('sha256', SHARED_SECRET)
    .update(body)
    .digest('hex')
  return expected === signature
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-ghl-signature') || ''

  // Verify webhook signature
  if (SHARED_SECRET && !verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const data = JSON.parse(body)

    // CRM sends: { type, appId, companyId, locationId, userId, planId, trial }
    const {
      type,       // 'INSTALL' or 'UNINSTALL'
      appId,
      companyId,
      locationId,
      userId,
    } = data

    console.log(`[marketplace] ${type}: company=${companyId} location=${locationId}`)

    if (type === 'INSTALL') {
      // Trigger the provisioning flow for this location
      // The OAuth token exchange will happen when the user opens 0nCore
      // For now, log the installation

      // TODO: Create KB + Agent for this location using OAuth token
      // This happens in the OAuth callback when they first open 0nCore

      return NextResponse.json({
        success: true,
        message: 'Installation received. User will be provisioned on first login.',
        redirectUrl: 'https://0ncore.com/dashboard/onboarding',
      })
    }

    if (type === 'UNINSTALL') {
      // Handle uninstall — suspend the location
      console.log(`[marketplace] Uninstall: location=${locationId}`)

      return NextResponse.json({
        success: true,
        message: 'Uninstall acknowledged.',
      })
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[marketplace] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
