/**
 * POST /api/services/stack-scan/checkout  { contacts: number, email?: string }
 *
 * Guest checkout for the done-for-you Website Stack & HIPAA Scan service.
 * Pricing: $250 per 1,500 contacts (one block). quantity = ceil(contacts/1500).
 * No login required — anyone can buy. Fulfillment list is submitted after payment.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any })
}

const PRICE_ID = process.env.STRIPE_PRICE_STACK_SCAN || 'price_1TnZTWHThmAuKVQMwr2bcwhs'
const CONTACTS_PER_BLOCK = 1500

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const contacts = Math.max(1, Math.round(Number(body.contacts) || CONTACTS_PER_BLOCK))
  const blocks = Math.max(1, Math.ceil(contacts / CONTACTS_PER_BLOCK))
  const cappedBlocks = Math.min(blocks, 100) // safety: max 150k contacts / $25k per order
  const email = typeof body.email === 'string' && body.email.includes('@') ? body.email : undefined

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.0ncore.com'
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_ID, quantity: cappedBlocks }],
      customer_email: email,
      success_url: `${base}/stack-scan/submit?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/stack-scan?cancelled=1`,
      metadata: {
        kind: 'stack_scan',
        blocks: String(cappedBlocks),
        contacts_paid: String(cappedBlocks * CONTACTS_PER_BLOCK),
      },
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'checkout failed' }, { status: 500 })
  }
}
