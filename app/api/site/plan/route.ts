import { NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { signPlan, type SignedLeg } from '@/lib/burst/plan-token'
import { assertExecutable, legPriceCents } from '@/lib/crm/registry'
import { renderPage } from '@/lib/render'
import { resolveBlogTargets, slugify } from '@/lib/crm/blog'
import { STORE_BLAST_RADIUS } from '@/lib/crm/store'

/**
 * Propose site work. Writes NOTHING.
 *
 * This is the seam that keeps MCP honest. An MCP client is a language model, and
 * a model with a direct "publish to the client's website" tool will eventually
 * use it on the wrong location, at the wrong moment, with copy nobody read. So
 * the tool it gets is this one: it returns a signed plan and a preview, and a
 * human has to approve before /api/site/run will touch anything.
 *
 * The signature covers the capability, the location AND the params, so approving
 * a plan approves THAT plan — not a plan. Without it, "approve" would mean the
 * shape of the work while the targets stayed attacker-choosable.
 */

/** Capabilities this route is allowed to plan. Deny by default. */
const ALLOWED = new Set(['blog.publish', 'product.create', 'product.collection', 'store.provision'])

export async function POST(req: Request) {
  // Authed like every other plan route. A signed plan is a capability token —
  // /api/burst/run will execute whatever it carries — so minting one has to be
  // at least as protected as running one.
  const session = verifyAppJwt(bearer(req as any))
  if (!session.ok) {
    return NextResponse.json(
      { error: 'Authenticate first. Open 0nCORE from inside your CRM, or set ONCORE_API_TOKEN for MCP.' },
      { status: 401 }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 })
  }

  const locationId = String(body?.locationId || '').trim()
  if (!locationId) return NextResponse.json({ error: 'locationId is required.' }, { status: 400 })

  const actions = Array.isArray(body?.actions) ? body.actions : []
  if (!actions.length) return NextResponse.json({ error: 'No actions given.' }, { status: 400 })

  // From the SESSION, never the body. A caller-supplied companyId would let
  // anyone mint a plan scoped to another agency, and /api/burst/run checks the
  // plan's companyId against the session — so this is the only place it can be
  // set honestly.
  const companyId = session.claims.companyId

  const legs: SignedLeg[] = []
  const preview: any[] = []
  const blockers: string[] = []

  for (const action of actions) {
    const capability = String(action?.capability || '')
    if (!ALLOWED.has(capability)) {
      blockers.push(`"${capability}" is not something this route can plan.`)
      continue
    }

    const check = assertExecutable(capability)
    if (!check.ok) {
      blockers.push(check.insteadOffer || check.reason)
      continue
    }

    const params: Record<string, unknown> = { ...(action?.params || {}) }

    // ── per-capability preflight ──
    if (capability === 'blog.publish') {
      // Render here rather than trusting the caller: HTML built for the
      // `document` target arrives in a blog body with its stylesheet stripped
      // and renders unstyled. The blog target inlines, which is what survives.
      if (!params.html && params.spec) {
        const r = renderPage(params.spec as any, { target: 'blog' })
        params.html = r.html
        if (r.warnings.length) preview.push({ capability, warnings: r.warnings })
      }
      if (!params.html) {
        blockers.push('blog.publish needs either rendered HTML or a page design.')
        continue
      }
      if (!params.title) {
        blockers.push('blog.publish needs a title.')
        continue
      }
      params.slug = slugify(String(params.slug || params.title))

      // Ask the platform now, so a missing author is a sentence rather than a
      // 422 after the human has already approved.
      const targets = await resolveBlogTargets(locationId)
      if ('problem' in targets) {
        blockers.push(`${targets.problem} ${targets.fix}`)
        continue
      }
      // Default to DRAFT unless explicitly overridden — this is someone's
      // public website.
      params.status = params.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
      preview.push({
        capability,
        summary: `Publish "${params.title}" to ${targets.blogName} as ${params.status}`,
        blog: targets.blogName,
        author: targets.authorName,
        bytes: String(params.html).length,
      })
    }

    if (capability === 'store.provision') {
      const products = Array.isArray(params.products) ? params.products : []
      if (!products.length) {
        blockers.push('store.provision needs a list of products.')
        continue
      }
      if (products.length > STORE_BLAST_RADIUS) {
        blockers.push(
          `${products.length} products exceeds the ${STORE_BLAST_RADIUS} cap for one run. There is no bulk delete if the list is wrong — send it in batches.`
        )
        continue
      }
      const noPrice = products.filter((p: any) => !p?.price).length
      preview.push({
        capability,
        summary: `Add ${products.length} products to the store`,
        ...(noPrice
          ? { warning: `${noPrice} have no price and will be created unsellable.` }
          : {}),
      })
    }

    if (capability === 'product.create') {
      if (!params.name) {
        blockers.push('product.create needs a name.')
        continue
      }
      preview.push({ capability, summary: `Add product "${params.name}" at ${params.price ?? 'NO PRICE'}` })
    }

    if (capability === 'product.collection') {
      if (!params.name) {
        blockers.push('product.collection needs a name.')
        continue
      }
      preview.push({ capability, summary: `Create collection "${params.name}"` })
    }

    legs.push({ capability, locationId, params })
  }

  if (!legs.length) {
    return NextResponse.json(
      { error: 'Nothing runnable in that request.', blockers },
      { status: 422 }
    )
  }

  const command = String(body?.command || `Site work on ${locationId}`)
  const { token, planId, expiresAt } = signPlan({ companyId, command, legs })
  const priceCents = legs.reduce((sum, l) => sum + legPriceCents(l.capability), 0)

  return NextResponse.json({
    planId,
    planToken: token,
    expiresAt,
    locationId,
    legs: legs.length,
    priceCents,
    preview,
    // Reported even when some legs are runnable — a partially-planned request
    // that looks complete is how the missing half gets forgotten.
    blockers,
    approval:
      'Nothing has been written. Show this to a human; when they approve, call /api/site/run with the planId and planToken.',
  })
}
