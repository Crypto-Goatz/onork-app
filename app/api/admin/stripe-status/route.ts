/**
 * Admin Stripe Status API
 *
 * Requires S1 identity verification + isAdmin.
 *
 * SQL to create webhook logs table:
 * CREATE TABLE IF NOT EXISTS stripe_webhook_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   event_id TEXT UNIQUE,
 *   event_type TEXT NOT NULL,
 *   customer_id TEXT,
 *   subscription_id TEXT,
 *   status TEXT,
 *   amount INTEGER,
 *   raw_data JSONB,
 *   processed BOOLEAN DEFAULT false,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdentity } from '@/lib/k-layer/s1-identity'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any })
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

export async function GET(req: NextRequest) {
  const identity = await verifyIdentity(req)
  if (!identity.verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!identity.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const stripe = getStripe()
    const supabase = getSupabase()

    const [balance, products, prices, events, webhookLogs] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.products.list({ limit: 20, active: true }),
      stripe.prices.list({ limit: 50, active: true }),
      stripe.events.list({ limit: 20 }),
      supabase
        .from('stripe_webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    return NextResponse.json({
      balance: {
        available: balance.available.map((b) => ({ amount: b.amount, currency: b.currency })),
        pending: balance.pending.map((b) => ({ amount: b.amount, currency: b.currency })),
      },
      products: products.data.map((p) => ({ id: p.id, name: p.name, active: p.active })),
      prices: prices.data.map((p) => ({
        id: p.id,
        product: p.product,
        unit_amount: p.unit_amount,
        currency: p.currency,
        recurring: p.recurring,
        nickname: p.nickname,
      })),
      recent_events: events.data.map((e) => ({
        id: e.id,
        type: e.type,
        created: e.created,
      })),
      webhook_logs: webhookLogs.data || [],
    })
  } catch (err) {
    console.error('[admin/stripe-status]', err)
    return NextResponse.json({ error: 'Failed to fetch Stripe status' }, { status: 500 })
  }
}

/** POST — Manual plan override for testing */
export async function POST(req: NextRequest) {
  const identity = await verifyIdentity(req)
  if (!identity.verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!identity.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const { email, plan, tier_level } = await req.json()
    if (!email || !plan) {
      return NextResponse.json({ error: 'email and plan required' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('profiles')
      .update({ plan, tier_level: tier_level || 1 })
      .eq('email', email)
      .select('id, email, plan, tier_level')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (err) {
    console.error('[admin/stripe-status] POST error', err)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}
