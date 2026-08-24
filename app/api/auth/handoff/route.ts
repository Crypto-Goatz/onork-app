/**
 * POST /api/auth/handoff — mint a one-time code so another 0n product can sign
 * the same person in without a second login.
 *
 * THE POINT: one login at the Hub, and every product the customer owns opens
 * already signed in. Today the Hub's product cards are plain links, so clicking
 * CRO9 lands on a login wall while you are demonstrably signed in three inches
 * away.
 *
 * WHY A CODE AND NOT THE 0n_live_ KEY ITSELF. Putting the long-lived key in a
 * URL leaks it into browser history, server access logs, and the Referer header
 * of the destination page — and that key is valid for 30 days across EVERY
 * product. This code lives 60 seconds, works once, and is worthless the moment
 * it is redeemed. A leaked handoff URL is a non-event; a leaked device key is a
 * full account takeover.
 *
 * It rides on the same api_tokens machinery the device keys use — hashed at
 * rest, revocable, expiring — so there is no second credential store to drift.
 * `channel: 'handoff'` is what marks it single-purpose, and redemption revokes
 * it immediately.
 *
 * The destination redeems it at POST /api/auth/handoff/redeem.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { generateToken } from '@/lib/0n-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Seconds a handoff code stays valid. Long enough to redirect, short enough
 *  that a code sitting in someone's history is already dead. */
const TTL_SECONDS = 60

/** Products allowed to receive a handoff. An open list would let any site that
 *  can guess the endpoint mint itself a session for our customer. */
const ALLOWED = new Set([
  'cro9',
  '0ntask',
  'web0n',
  'verifiedsxo',
  'lead0n',
  '0nmcp',
])

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  let body: { product?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const product = (body.product || '').trim().toLowerCase()
  if (!ALLOWED.has(product)) {
    return NextResponse.json(
      { error: `Unknown product '${product}'. Allowed: ${[...ALLOWED].join(', ')}` },
      { status: 400 },
    )
  }

  // The location the code will act in, so the destination lands the customer in
  // the right client account rather than guessing.
  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id, crm_agency_id')
    .eq('id', user.id)
    .maybeSingle()

  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000)

  const code = await generateToken({
    userId: user.id,
    locationId: profile?.crm_location_id || null,
    name: `handoff:${product}`,
    channel: 'handoff',
    // Read-only by default: a handoff proves WHO you are. The destination
    // issues its own session with its own permissions from there.
    scopes: ['read'],
    metadata: {
      product,
      agency_id: profile?.crm_agency_id ?? null,
      minted_at: new Date().toISOString(),
    },
    expiresAt,
  })

  return NextResponse.json({
    code,
    product,
    expires_in: TTL_SECONDS,
    // Stated so the destination never has to guess, and so a human reading a
    // log knows this is not a long-lived credential.
    single_use: true,
  })
}
