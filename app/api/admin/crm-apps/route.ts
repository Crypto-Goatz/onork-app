/**
 * GET /api/admin/crm-apps
 *
 * Reports the live state of both CRM marketplace apps + which env vars
 * are set + which operation categories route where. Admin-only.
 */

import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-gate'
import { CRM_APPS, type CrmAppKey, type CrmOperationCategory } from '@/lib/crm-apps'

const OP_CATEGORIES: CrmOperationCategory[] = [
  'contacts', 'conversations', 'opportunities', 'calendars', 'invoices',
  'payments', 'products', 'social', 'tags', 'custom_fields', 'custom_values',
  'workflows', 'forms', 'campaigns', 'objects', 'media', 'courses', 'users',
  'locations_read', 'webhooks_register',
  'sub_accounts', 'snapshot_deploy', 'agency_billing', 'agency_users',
  'agency_settings', 'oauth_install',
]

function isPit(s: string | undefined): boolean {
  return !!s && s.startsWith('pit-')
}

function maskValue(s: string | undefined): string | null {
  if (!s) return null
  if (s.length <= 12) return s
  return `${s.slice(0, 8)}…${s.slice(-4)} (${s.length} chars)`
}

export async function GET() {
  const gate = await verifyAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error ?? 'Forbidden' }, { status: gate.userId ? 403 : 401 })
  }

  const apps = Object.entries(CRM_APPS).map(([key, app]) => {
    const clientId = process.env[app.clientIdEnv]
    const clientSecret = process.env[app.clientSecretEnv]
    const pit = process.env[app.pitEnv]

    return {
      key: key as CrmAppKey,
      name: app.name,
      appId: app.appId,
      authClass: app.authClass,
      redirectUri: app.redirectUri,
      scopeCount: app.scopes.length,
      env: {
        clientId: {
          var: app.clientIdEnv,
          set: !!clientId,
          preview: maskValue(clientId),
        },
        clientSecret: {
          var: app.clientSecretEnv,
          set: !!clientSecret,
          preview: clientSecret ? `(${clientSecret.length} chars)` : null,
        },
        pit: {
          var: app.pitEnv,
          set: !!pit,
          isValidPit: isPit(pit),
          preview: maskValue(pit),
        },
      },
    }
  })

  // Operation routing snapshot
  const { pickApp } = await import('@/lib/crm-apps')
  const routing = OP_CATEGORIES.map((cat) => ({
    category: cat,
    routesTo: pickApp(cat).key,
  }))

  return NextResponse.json({
    apps,
    routing,
    rules: [
      'PIT tokens MUST be type:plain on Vercel (encrypted breaks Bearer auth)',
      'Sub-location ops route to 0nCORE Marketplace App',
      'Agency ops route to 0nAGENCY App',
      'Token resolution within an app: OAuth access_token → location PIT → agency PIT',
    ],
  })
}
