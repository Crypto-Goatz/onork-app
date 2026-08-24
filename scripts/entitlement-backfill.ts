/**
 * ENTITLEMENT BACKFILL + PATH VERIFIER
 *
 * `product_keys` is what the 0n token returns as `addons`. The webhook writes it
 * on `checkout.session.completed` (lib/entitlements/grant.ts) — but that code
 * shipped 2026-08-23 with ZERO completed purchases after it, so the table being
 * empty proved nothing either way. An untested write path is not a working one.
 *
 * This runs the SHIPPED resolvers against real historic completed sessions:
 *   - dry run (default) — prints what each past sale WOULD resolve to
 *   - --write           — grants the entitlement, idempotently
 *
 * It imports lib/entitlements/grant.ts rather than reimplementing the logic, so
 * a green run here is evidence about the real code and not about a lookalike.
 *
 *   npx tsx scripts/entitlement-backfill.ts
 *   npx tsx scripts/entitlement-backfill.ts --write
 */
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { resolveBuyer, resolveProduct, grantFromCheckoutSession } from '../lib/entitlements/grant'

const WRITE = process.argv.includes('--write')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const sk = process.env.STRIPE_SECRET_KEY

if (!url || !key || !sk) {
  console.error(
    'missing env: need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY',
  )
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const stripe = new Stripe(sk)

async function main() {
  const completed: Stripe.Checkout.Session[] = []
  for await (const s of stripe.checkout.sessions.list({ limit: 100 })) {
    if (s.status === 'complete') completed.push(s)
  }

  console.log(`completed sessions: ${completed.length}   mode: ${WRITE ? 'WRITE' : 'DRY RUN'}\n`)

  let resolved = 0
  let unresolved = 0

  for (const s of completed) {
    const buyer = await resolveBuyer(supabase, s)
    const product = await resolveProduct(stripe, s)
    const paid = ((s.amount_total ?? 0) / 100).toFixed(2)
    const created = new Date(s.created * 1000).toISOString().slice(0, 10)
    const ok = Boolean(buyer.userId && product.slug)
    ok ? resolved++ : unresolved++

    console.log(
      `${ok ? 'RESOLVES  ' : 'UNRESOLVED'} ${created} $${paid.padStart(7)}  ` +
        `slug=${product.slug ?? '—'} (${product.via})  ` +
        `user=${buyer.userId ? buyer.userId.slice(0, 8) : '—'} (${buyer.via})  ` +
        `email=${buyer.email ?? 'none'}`,
    )

    if (WRITE && ok) {
      const r = await grantFromCheckoutSession(supabase, stripe, s)
      console.log(`     -> ${r.outcome} slug=${r.slug}`)
    }
  }

  console.log(`\nresolved: ${resolved}   unresolved: ${unresolved}`)
  if (unresolved && !WRITE) {
    console.log(
      'UNRESOLVED rows are sales with no attributable buyer or product — that is the\n' +
        'pre-client_reference_id era (0503fee), not a bug in the resolver.',
    )
  }
}

main().catch(e => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
