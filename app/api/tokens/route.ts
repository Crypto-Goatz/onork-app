import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import crypto from 'crypto'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/tokens — list user's active tokens
export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tokens } = await admin
    .from('user_tokens')
    .select('id, token_prefix, label, scopes, created_at, last_used_at, revoked')
    .eq('user_id', user.id)
    .eq('revoked', false)
    .order('created_at', { ascending: false })

  return NextResponse.json({ tokens: tokens || [] })
}

// POST /api/tokens — generate a new token
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { label, scopes } = await req.json()

  // Generate secure token
  const rawToken = `0ncore_${crypto.randomBytes(32).toString('hex')}`
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const tokenPrefix = rawToken.slice(0, 14) + '...'

  const { data: row, error } = await admin
    .from('user_tokens')
    .insert({
      user_id: user.id,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      label: label || 'WordPress Plugin',
      scopes: scopes || ['plugin:read', 'plugin:write', 'api:read'],
      revoked: false,
    })
    .select('id, token_prefix, label, scopes, created_at')
    .single()

  if (error) {
    console.error('[tokens] Create failed:', error)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }

  // Return full token ONCE — never stored in plain text
  return NextResponse.json({
    token: rawToken,
    id: row.id,
    prefix: tokenPrefix,
    label: row.label,
    message: 'Copy this token now. It will not be shown again.',
  })
}

// DELETE /api/tokens — revoke a token
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tokenId } = await req.json()
  if (!tokenId) return NextResponse.json({ error: 'tokenId required' }, { status: 400 })

  await admin
    .from('user_tokens')
    .update({ revoked: true })
    .eq('id', tokenId)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
