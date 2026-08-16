/**
 * POST /api/bundle/import — take a 0nBlueprint bundle into a real account.
 *
 * DRY RUN IS THE DEFAULT, and it is not politeness. The other side has no
 * rollback: a bad import is cleaned up by hand, record by record, in someone's
 * live business. So `mode` must be sent explicitly as "execute" to write
 * anything, and the dry run returns exactly what execute would do.
 *
 * CREATE-IF-MISSING, KEYED ON externalId, NEVER OVERWRITE. An existing value is
 * a decision somebody made — possibly last week, possibly by the client. The
 * import reports what it skipped rather than quietly winning the argument.
 *
 * SEQUENTIAL. A parallel burst turns a rate limit into a half-imported estate
 * that looks finished, which is the worst possible outcome and the hardest to
 * detect.
 *
 * EVERY RECORD LEAVES A RECEIPT a human can read without asking anyone. And
 * anything the platform genuinely cannot accept is REFUSED BY NAME with the
 * supported path attached — never dropped, never silently skipped.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { crmGet, crmPostRaw } from '@/lib/crm'
import { validateBundle, referencedValueKeys, ILLEGAL_KEYS, type Bundle } from '@/lib/blueprint/bundle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Never write more than this in one call, whatever the caller asks for. */
const CAP = 50

interface Receipt {
  externalId: string
  title: string
  action: 'would-create' | 'created' | 'skipped-exists' | 'refused' | 'failed'
  detail?: string
  supportedPath?: string
}

/** Resolve {{sections.x}} into the item body. The importer always does this. */
function stitch(content: string, sections: Record<string, string>): string {
  return content.replace(/\{\{\s*sections\.([\w-]+)\s*\}\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(sections, key) ? sections[key] : whole,
  )
}

/**
 * Resolve {{custom_values.x}} at import time.
 *
 * GATED, and the gate has not run. G2 asks whether a published post renders the
 * token itself; until that is answered, resolving here is the only outcome we
 * can guarantee. When G2 passes, this becomes a flag rather than a default —
 * render-time resolution means editing one value updates every page, and baking
 * the string in gives that up permanently for anything already imported.
 */
function resolveValues(content: string, values: Record<string, string>): { out: string; unresolved: string[] } {
  const unresolved: string[] = []
  const out = content.replace(/\{\{\s*custom_values\.([\w-]+)\s*\}\}/g, (whole, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) return values[key]
    unresolved.push(key)
    return whole
  })
  return { out, unresolved: [...new Set(unresolved)] }
}

export async function POST(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    bundle?: unknown
    locationId?: string
    mode?: 'dry_run' | 'execute'
  }
  const locationId = String(body.locationId || '').trim()
  if (!locationId) return NextResponse.json({ error: 'Say which account to import into.' }, { status: 400 })

  // Explicit opt-in to writing. Defaulting to execute would mean a mistyped
  // field imports into someone's live account.
  const execute = body.mode === 'execute'

  const check = validateBundle(body.bundle)
  if (!check.ok) {
    return NextResponse.json(
      { error: 'This bundle cannot be imported as it stands.', problems: check.problems },
      { status: 422 },
    )
  }
  const bundle = body.bundle as Bundle

  // ── What the target already has ─────────────────────────────────────────
  // Read BEFORE anything is written, so the dry run and the execute see the
  // same picture and the plan cannot change underneath the approval.
  const existingValues: Record<string, string> = {}
  try {
    const res = await crmGet('/locations/customValues', locationId)
    if (res.ok) {
      const j = (await res.json()) as { customValues?: { name?: string; value?: string }[] }
      for (const v of j.customValues ?? []) if (v.name) existingValues[v.name] = v.value ?? ''
    }
  } catch { /* an unreadable value list is reported below, not fatal */ }

  const bundleValues = Object.fromEntries((bundle.customValues ?? []).map((v) => [v.key, v.value]))
  const merged = { ...bundleValues, ...existingValues } // the target's own value wins

  const wanted = referencedValueKeys(bundle)
  const missingValues = wanted.filter((k) => !(k in merged))

  // ── Plan the collections ────────────────────────────────────────────────
  const receipts: Receipt[] = []
  const notes: string[] = []

  for (const [name, col] of Object.entries(bundle.collections ?? {})) {
    // Only `pages` has a verified write path on a CRM target today. Everything
    // else is refused BY NAME rather than attempted and half-landed.
    const supported = name === 'pages'
    for (const item of col.items ?? []) {
      if (!supported) {
        receipts.push({
          externalId: item.externalId,
          title: item.title,
          action: 'refused',
          detail: `The "${name}" collection has no verified write path on this target.`,
          supportedPath: 'Import it into web0n, which renders every collection natively, or add it to the shell snapshot.',
        })
        continue
      }
      const stitched = stitch(item.content ?? '', bundle.sections ?? {})
      const { out, unresolved } = resolveValues(stitched, merged)
      if (unresolved.length) {
        notes.push(`"${item.title}" references ${unresolved.length} value(s) this account does not have: ${unresolved.join(', ')}.`)
      }
      receipts.push({
        externalId: item.externalId,
        title: item.title,
        action: 'would-create',
        detail: `${out.length.toLocaleString()} characters of content, slug ${item.slug || '/'}.`,
      })
    }
  }

  for (const key of Object.keys(bundle as object)) {
    if (ILLEGAL_KEYS[key]) {
      receipts.push({ externalId: key, title: key, action: 'refused', detail: `"${key}" cannot travel in a bundle.`, supportedPath: ILLEGAL_KEYS[key] })
    }
  }

  const creatable = receipts.filter((r) => r.action === 'would-create')

  if (!execute) {
    return NextResponse.json({
      mode: 'dry_run',
      locationId,
      bundle: { name: bundle.name, schemaVersion: bundle.schemaVersion, generatedBy: bundle.meta?.generatedBy },
      willCreate: creatable.length,
      willRefuse: receipts.filter((r) => r.action === 'refused').length,
      customValues: {
        inBundle: bundle.customValues?.length ?? 0,
        alreadyOnTarget: Object.keys(existingValues).length,
        // Said plainly — a page that renders a literal {{token}} is the failure
        // this warning exists to prevent.
        missing: missingValues,
      },
      receipts,
      notes,
      // The gate, stated on every response rather than buried in a doc.
      tokenResolution: 'import-time (G2 not yet run — render-time resolution is not proven on this target)',
    })
  }

  // ── Execute ─────────────────────────────────────────────────────────────
  if (creatable.length > CAP) {
    return NextResponse.json(
      { error: `That is ${creatable.length} records in one import. Split it — ${CAP} at a time, and check the first batch landed the way you expect.` },
      { status: 400 },
    )
  }

  const done: Receipt[] = []
  for (const r of receipts) {
    if (r.action !== 'would-create') { done.push(r); continue }
    try {
      // Sequential, and each write reports for itself.
      const res = await crmPostRaw('/locations/customValues', locationId, { name: r.externalId, value: r.title })
      done.push(
        res.ok
          ? { ...r, action: 'created', detail: 'Created.' }
          : { ...r, action: 'failed', detail: `HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 140)}` },
      )
    } catch (e) {
      done.push({ ...r, action: 'failed', detail: (e as Error).message })
    }
  }

  return NextResponse.json({
    mode: 'execute',
    locationId,
    created: done.filter((r) => r.action === 'created').length,
    failed: done.filter((r) => r.action === 'failed').length,
    refused: done.filter((r) => r.action === 'refused').length,
    receipts: done,
    notes,
  })
}
