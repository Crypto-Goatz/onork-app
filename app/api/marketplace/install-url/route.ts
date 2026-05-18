/**
 * GET /api/marketplace/install-url
 *
 * Returns the canonical CRM Marketplace install URL for the 0nCore app.
 * Constructs it server-side so the marketplace listing button can always
 * point at a stable URL we control — and so the scope list stays in
 * sync with SUB_LOCATION_APP without manual copy-paste.
 *
 * Two modes:
 *   - GET (default): returns JSON { url, clientId, scopes, scope_count }
 *   - GET ?redirect=1: 302s the user directly to the CRM install flow.
 *     This is what the marketplace listing button should point at.
 */

import { NextRequest, NextResponse } from 'next/server'
import { MARKETPLACE_APP } from '@/lib/crm'
import { SUB_LOCATION_APP } from '@/lib/crm-apps'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CRM_INSTALL_BASE = 'https://services.leadconnectorhq.com/oauth/chooselocation'

function buildInstallUrl(): { url: string; clientId: string; scopes: string[] } {
  const clientId = MARKETPLACE_APP.clientId
  const redirectUri = MARKETPLACE_APP.redirectUri
  const scopes = SUB_LOCATION_APP.scopes

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
  })

  return {
    url: `${CRM_INSTALL_BASE}?${params.toString()}`,
    clientId,
    scopes,
  }
}

export async function GET(req: NextRequest) {
  const { url, clientId, scopes } = buildInstallUrl()

  if (req.nextUrl.searchParams.get('redirect') === '1') {
    return NextResponse.redirect(url, 302)
  }

  return NextResponse.json({
    url,
    clientId,
    scope_count: scopes.length,
    scopes,
    redirect_endpoint: 'https://0ncore.com/api/marketplace/install-url?redirect=1',
  })
}
