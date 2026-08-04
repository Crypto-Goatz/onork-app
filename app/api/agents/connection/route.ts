import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { seal, unseal, fingerprint } from '@/lib/vault/seal'

/**
 * GET /api/agents/connection — the details an agency pastes into a native
 * agent's custom-MCP field.
 * POST — rotate.
 *
 * GUIDED-MANUAL, because the portal exposes no way to register an external MCP
 * endpoint on a native agent automatically. Pretending otherwise would produce a
 * "Connect" button that quietly does nothing.
 *
 * THE KEY IS SHOWN, ONCE, TO THE AGENCY THAT OWNS IT. It is sealed at rest and
 * scoped per agency, so a key pasted into an agent can be revoked without
 * touching anyone else. On GET of an existing key we return the fingerprint
 * rather than the secret — if they did not keep it, they rotate.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MCP_URL = process.env.ONMCP_MCP_URL || 'https://0nmcp-remote.0nmcp.workers.dev/mcp'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

function newKey(): string {
  // 0n_ prefix per the house rule: everything we issue is greppable and revocable.
  return `0n_agent_${crypto.randomBytes(24).toString('base64url')}`
}

const INSTRUCTIONS = [
  'Open the agent you want to give 0nCORE tools to.',
  'Find its custom MCP / external tools setting.',
  'Paste the endpoint below as the server URL.',
  'Paste the key as the bearer token.',
  'Save. The agent can now use every tool you have switched on here.',
]

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const companyId = session.claims.companyId

  const sb = admin()
  const { data } = await sb.from('agency_mcp_keys').select('key_ciphertext, scoped_tools, created_at').eq('company_id', companyId).maybeSingle()

  if (!data) {
    return NextResponse.json({ ok: true, endpoint: MCP_URL, key: null, hasKey: false, instructions: INSTRUCTIONS })
  }

  const plain = unseal(data.key_ciphertext)
  return NextResponse.json({
    ok: true,
    endpoint: MCP_URL,
    // Never re-shown. The fingerprint is enough to confirm which key is live.
    key: null,
    hasKey: true,
    keyHint: plain ? fingerprint(plain) : null,
    // A key that will not unseal is a key nobody can use — say so rather than
    // letting them paste a fingerprint of nothing into an agent.
    broken: !plain,
    scopedTools: data.scoped_tools ?? [],
    createdAt: data.created_at,
    instructions: INSTRUCTIONS,
  })
}

export async function POST(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const companyId = session.claims.companyId

  const key = newKey()
  const { error } = await admin().from('agency_mcp_keys').upsert({
    company_id: companyId,
    key_ciphertext: seal(key),
    rotated_at: new Date().toISOString(),
  })
  if (error) {
    console.error('[agents/connection] rotate failed:', error)
    return NextResponse.json({ error: 'Could not create a key.' }, { status: 500 })
  }

  // The ONLY response that ever contains the secret.
  return NextResponse.json({ ok: true, endpoint: MCP_URL, key, instructions: INSTRUCTIONS })
}
