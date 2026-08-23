/**
 * POST   /api/connections/groq — verify + save the user's Groq API key
 * DELETE /api/connections/groq — disconnect (revoke the connection row)
 *
 * The POST runs `probeGroqKey()` against /openai/v1/models BEFORE persisting
 * so we never store a key we haven't verified. Returns 400 with the Groq
 * error verbatim on failure, 200 on success.
 *
 * Storage: unified `user_connections` row with provider='groq'. The same
 * email-keyed identity rules apply as Slack/LinkedIn/Google.
 */
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { putSecret, deleteSecret } from '@/lib/vault/connections'
import { probeGroqKey, getGroqKeyStatus, agencyForUser } from '@/lib/groq/router'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { api_key?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const apiKey = (body.api_key || '').trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'api_key required' }, { status: 400 })
  }

  // 1. Proof of life — refuse to store an invalid key
  try {
    const probe = await probeGroqKey(apiKey)
    if (!probe.ok) {
      return NextResponse.json({ error: 'Groq probe failed' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Probe failed' },
      { status: 400 },
    )
  }

  // 2. Persist into 0nVault — encrypted at rest, agency-scoped, audited.
  //
  // This previously went through `upsertConnection` into the shared
  // `user_connections` row, which stored the key in PLAINTEXT and is the same
  // row the login flow writes — a login that narrows scopes has silently
  // wiped connect grants there before. The vault has neither problem.
  try {
    await putSecret({
      agencyId: await agencyForUser(user.id),
      service: 'groq',
      secret: apiKey,
      label: user.email || null,
      kind: 'token',
      meta: { connected_by: user.id, scopes: 'inference' },
      verified: true,
      usedBy: 'settings-ui',
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 },
    )
  }

  const status = await getGroqKeyStatus(user.id)
  return NextResponse.json({
    ok: true,
    message: 'Groq key verified and saved.',
    status,
  })
}

export async function DELETE() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await deleteSecret(await agencyForUser(user.id), 'groq', 'settings-ui')
  return NextResponse.json({ ok: true })
}
