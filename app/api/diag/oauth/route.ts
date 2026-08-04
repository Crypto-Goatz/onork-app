import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { MARKETPLACE_APP, AGENCY_APP } from '@/lib/crm'
import { AGENCY_V2_APP } from '@/lib/crm-apps'

/**
 * TEMPORARY. Reports whether the OAuth credentials the callback needs are
 * present in the RUNNING deployment. Booleans and lengths only — never a value.
 * Delete once the install works.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const has = (v: string | undefined) => ({ set: Boolean(v), len: v?.length ?? 0 })

/**
 * A short hash of the secret, so the ID<->secret PAIRING can be verified without
 * the secret leaving the server. Comparing hashes proves which secret sits with
 * which client_id — the exact thing a crossed env mapping would get wrong, and
 * the thing "set: true" cannot tell you.
 */
const fp = (v: string | undefined) =>
  v ? crypto.createHash('sha256').update(v).digest('hex').slice(0, 12) : null

export async function GET() {
  return NextResponse.json({
    marketplace: {
      clientId: MARKETPLACE_APP.clientId?.slice(0, 26) ?? null,
      secret: has(MARKETPLACE_APP.clientSecret || process.env.CRM_MARKETPLACE_CLIENT_SECRET),
      secretFp: fp(MARKETPLACE_APP.clientSecret || process.env.CRM_MARKETPLACE_CLIENT_SECRET),
      redirectUri: MARKETPLACE_APP.redirectUri,
    },
    agencyLegacy: {
      clientId: AGENCY_APP.clientId?.slice(0, 26) ?? null,
      secret: has(AGENCY_APP.clientSecret || process.env.CRM_AGENCY_CLIENT_SECRET),
      secretFp: fp(AGENCY_APP.clientSecret || process.env.CRM_AGENCY_CLIENT_SECRET),
      redirectUri: AGENCY_APP.redirectUri,
    },
    agencyV2: {
      clientIdEnv: AGENCY_V2_APP.clientIdEnv,
      clientId: (process.env[AGENCY_V2_APP.clientIdEnv] || '').slice(0, 26) || null,
      secretEnv: AGENCY_V2_APP.clientSecretEnv,
      secret: has(process.env[AGENCY_V2_APP.clientSecretEnv]),
      secretFp: fp(process.env[AGENCY_V2_APP.clientSecretEnv]),
      fullClientId: process.env[AGENCY_V2_APP.clientIdEnv] || null,
      redirectUri: AGENCY_V2_APP.redirectUri,
    },
    subaccount: {
      clientId: (process.env.CRM_SUBACCT_CLIENT_ID || '').slice(0, 26) || null,
      secret: has(process.env.CRM_SUBACCT_CLIENT_SECRET),
      secretFp: fp(process.env.CRM_SUBACCT_CLIENT_SECRET),
      fullClientId: process.env.CRM_SUBACCT_CLIENT_ID || null,
    },
    // Dynamic process.env lookup is the thing most likely to be silently empty.
    dynamicLookupWorks: Boolean(process.env[AGENCY_V2_APP.clientIdEnv]),
  })
}
