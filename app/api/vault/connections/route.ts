/**
 * GET /api/vault/connections — what this tenant has actually connected.
 *
 * Backs the vault door on vault.0ncore.com. It reads `on_connections` through
 * lib/vault/connections.ts, which is the ONE store for a tenant's credentials,
 * so the door shows the same rows 0nMCP and the hosted apps resolve against
 * rather than a second opinion assembled from `user_connections`.
 *
 * Never returns ciphertext and never returns a secret — `listConnections()`
 * does not select the column at all, which is stronger than stripping it here.
 *
 * The UNCONFIGURED case is reported, not swallowed. A deployment with no vault
 * env has no rows for anybody; answering "you have nothing connected" would be
 * indistinguishable from the truth and would invite a user to re-paste a key
 * that cannot be stored. It says so instead.
 */
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isVaultConfigured, listConnections } from '@/lib/vault/connections'
import { agencyForUser } from '@/lib/groq/router'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ authed: false, connections: [] }, { status: 401 })

  const firstName =
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    (user.email || '').split('@')[0] ||
    'there'

  if (!isVaultConfigured()) {
    return NextResponse.json({
      authed: true,
      firstName,
      vaultConfigured: false,
      connections: [],
      note: '0nVault is not configured on this deployment, so nothing can be read or saved here. This is our misconfiguration, not a missing key on your side.',
    })
  }

  try {
    const connections = await listConnections(await agencyForUser(user.id))
    return NextResponse.json({ authed: true, firstName, vaultConfigured: true, connections })
  } catch (err) {
    // A configured vault that fails to read is NOT "nothing connected".
    return NextResponse.json(
      {
        authed: true,
        firstName,
        vaultConfigured: true,
        connections: [],
        error: err instanceof Error ? err.message : 'Vault read failed',
      },
      { status: 502 },
    )
  }
}
