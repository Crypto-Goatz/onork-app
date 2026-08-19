/**
 * 0nBlueprint Bundle v2 — the wire format between every builder and every
 * renderer in the ecosystem.
 *
 * THIS FILE IS A CONTRACT, NOT A LIBRARY, and it is a VERBATIM COPY of
 * web0n/lib/blueprint/bundle.ts. Duplicated deliberately rather than shared
 * through a package: a wire format that can be changed by bumping a dependency
 * is a wire format that breaks a consumer who did not bump it. `schemaVersion`
 * is the guard — a reader that does not recognise the string refuses the file
 * instead of guessing, which is the whole point of having one.
 *
 * If you change this file, change the other one in the same commit.
 *
 * PAGES ARE JUST A COLLECTION. That is the whole idea, and it is why this
 * exists at all. A page, a blog post, a product and a service are the same
 * thing: typed items with fields, rendered through a per-collection template.
 * web0n renders all of them natively; the CRM approximates the ones it can
 * write through its API and refuses the rest by name.
 *
 * EVERY RECORD CARRIES AN EXTERNAL ID. Import is create-if-missing keyed on it,
 * never overwrite — the other side has no rollback, and an existing value is a
 * decision somebody made.
 */

export const SCHEMA_VERSION = '0nblueprint-bundle-v2'

/* ── M4: one content truth per site ────────────────────────────────────────
   A site whose content is written by two renderers is two sites that disagree
   by Friday, and the disagreement surfaces as a customer reading a stale price.
   The rule is not "don't do that" in a document — it is this field, refused by
   the validator when it is missing and by the importer when it names someone
   else.

   `canonicalRenderer` is a declaration about the SITE, not about where the
   bundle was built. A site designed in the web0n studio but destined to live in
   a CRM sub-account declares `crm`; a site that stays on web0n declares `web0n`
   and every CRM importer refuses it by name. Each renderer is described here so
   the refusal can say who owns the site and where the write does belong, rather
   than "not allowed". */
export const CANONICAL_RENDERERS = {
  web0n: {
    label: 'web0n',
    owns: 'web0n renders every collection natively and holds this site’s content.',
    instead: 'Import it into web0n, or re-export the bundle with 0nCore named as this site’s home if you are moving it.',
  },
  crm: {
    label: '0nCore',
    owns: '0nCore holds this site’s content in the CRM sub-account.',
    instead: 'Import it into the 0nCore account that owns the site, or re-export the bundle with web0n named as this site’s home if you are moving it.',
  },
} as const

export type CanonicalRenderer = keyof typeof CANONICAL_RENDERERS

/** Every renderer name a bundle may legally declare. */
export const CANONICAL_RENDERER_NAMES = Object.keys(CANONICAL_RENDERERS) as CanonicalRenderer[]

export interface CustomValue {
  key: string
  label: string
  value: string
}

export interface CollectionItem {
  /** Idempotency key. Import matches on this and never on title. */
  externalId: string
  title: string
  slug?: string
  navOrder?: number
  /** Resolved HTML. `{{sections.x}}` is already stitched; `{{custom_values.x}}` may remain. */
  content?: string
  seo?: { title?: string; description?: string }
  fields?: Record<string, unknown>
}

export interface Collection {
  /** Which per-collection template renders these items. */
  template: string
  label?: string
  items: CollectionItem[]
}

export interface Bundle {
  name: string
  version: string
  schemaVersion: typeof SCHEMA_VERSION
  /**
   * Which renderer owns this site's content. Required — see M4 above. An
   * importer that is not this renderer refuses the whole bundle by name.
   */
  canonicalRenderer: CanonicalRenderer
  meta: {
    vertical?: string
    pattern?: string
    generatedBy: string
    generatedAt: string
    /** What the target must already have for this to land intact. */
    shellExpectations?: Record<string, unknown>
  }
  customValues: CustomValue[]
  /** Reusable HTML blocks, referenced from item content as {{sections.key}}. */
  sections: Record<string, string>
  collections: Record<string, Collection>
  entities?: Record<string, unknown>
  snapshotHints?: { required?: Record<string, unknown>; recommended?: Record<string, unknown> }
}

/* ── Keys a bundle may never carry ─────────────────────────────────────────
   Not an oversight — these are the platform's verified read-only surfaces.
   Naming them here means the validator can refuse with the supported path
   instead of failing somewhere deep in an import. */
export const ILLEGAL_KEYS: Record<string, string> = {
  workflows: 'Workflows are distributed by snapshot only — the API is GET /workflows/ and nothing else. Put them in the shell snapshot.',
  builderPages: 'Builder pages and funnels have no JSON import. Ship them in the shell snapshot or as a share link.',
  funnels: 'Funnels have no JSON import. Ship them in the shell snapshot or as a share link.',
  forms: 'Forms are read-only over the API. Ship them in the shell snapshot.',
  surveys: 'Surveys are read-only over the API. Ship them in the shell snapshot.',
}

/* ── Validation ───────────────────────────────────────────────────────────── */

export interface Problem {
  path: string
  message: string
  /** A refusal names the supported route; an error is just wrong. */
  supportedPath?: string
}

/**
 * The same validator runs in the builder (as a preview) and on the server (as
 * the authority). Two implementations would drift, and the one that drifted
 * would be the one telling the user everything was fine.
 */
export function validateBundle(input: unknown): { ok: boolean; problems: Problem[] } {
  const problems: Problem[] = []
  const b = input as Partial<Bundle> | null

  if (!b || typeof b !== 'object') {
    return { ok: false, problems: [{ path: '', message: 'That is not a bundle — the file did not parse as an object.' }] }
  }
  if (b.schemaVersion !== SCHEMA_VERSION) {
    problems.push({
      path: 'schemaVersion',
      message: `Expected "${SCHEMA_VERSION}", found ${b.schemaVersion ? `"${b.schemaVersion}"` : 'nothing'}. A reader that guesses at an unknown version is how a silent half-import happens.`,
    })
  }
  // M4. Checked before anything else about the content, because a bundle aimed
  // at the wrong renderer is not a bundle with a problem in it — it is a bundle
  // that belongs somewhere else, and listing its section typos first would bury
  // that.
  if (!b.canonicalRenderer) {
    problems.push({
      path: 'canonicalRenderer',
      message: `Nothing says which renderer owns this site. One of ${CANONICAL_RENDERER_NAMES.map((n) => `"${n}"`).join(' or ')} is required — a site written by two renderers is two sites that disagree.`,
      supportedPath: 'Re-export naming the site’s home. web0n’s studio sets it from where you send the bundle: the 0nCore handoff declares "crm", the download declares "web0n".',
    })
  } else if (!CANONICAL_RENDERER_NAMES.includes(b.canonicalRenderer)) {
    problems.push({
      path: 'canonicalRenderer',
      message: `"${b.canonicalRenderer}" is not a renderer this ecosystem has. Known: ${CANONICAL_RENDERER_NAMES.join(', ')}. Guessing at an unknown owner is how a site ends up written from two places.`,
    })
  }
  if (!b.name?.trim()) problems.push({ path: 'name', message: 'Every bundle needs a name — it is what the import receipt is filed under.' })

  for (const key of Object.keys(b as object)) {
    const why = ILLEGAL_KEYS[key]
    if (why) problems.push({ path: key, message: `"${key}" cannot travel in a bundle.`, supportedPath: why })
  }

  const seenValueKeys = new Set<string>()
  for (const [i, cv] of (b.customValues ?? []).entries()) {
    if (!cv?.key?.trim()) problems.push({ path: `customValues[${i}].key`, message: 'A custom value with no key cannot be referenced or matched on a re-import.' })
    else if (seenValueKeys.has(cv.key)) problems.push({ path: `customValues[${i}].key`, message: `Duplicate key "${cv.key}" — the second one would silently win.` })
    else seenValueKeys.add(cv.key)
  }

  const sectionKeys = new Set(Object.keys(b.sections ?? {}))
  const seenIds = new Set<string>()

  for (const [name, col] of Object.entries(b.collections ?? {})) {
    if (!col?.template?.trim()) {
      problems.push({ path: `collections.${name}.template`, message: 'A collection with no template has nothing to render its items with.' })
    }
    for (const [i, item] of (col?.items ?? []).entries()) {
      const at = `collections.${name}.items[${i}]`
      if (!item?.externalId?.trim()) {
        problems.push({ path: `${at}.externalId`, message: 'No external id. Import is create-if-missing keyed on this; without it a re-import duplicates the record.' })
      } else if (seenIds.has(item.externalId)) {
        problems.push({ path: `${at}.externalId`, message: `Duplicate external id "${item.externalId}" — two records claiming to be the same one.` })
      } else {
        seenIds.add(item.externalId)
      }
      if (!item?.title?.trim()) problems.push({ path: `${at}.title`, message: 'Every item needs a title.' })

      // A reference to a section that does not exist renders as literal
      // braces on someone's live page.
      for (const m of String(item?.content ?? '').matchAll(/\{\{\s*sections\.([\w-]+)\s*\}\}/g)) {
        if (!sectionKeys.has(m[1])) {
          problems.push({ path: `${at}.content`, message: `References section "${m[1]}", which this bundle does not define.` })
        }
      }
    }
  }

  return { ok: problems.length === 0, problems }
}

/**
 * M4, the half the importer runs. `null` means this renderer owns the site and
 * may write; a Problem means it must refuse the WHOLE bundle — not skip a
 * record, not import "the safe parts". A partial import under the wrong owner
 * is exactly the divergence this rule exists to prevent, and it is harder to
 * spot than a clean refusal.
 *
 * Lives here, next to the field and the validator, so the rule has one
 * implementation. Two would drift, and the one that drifted would be the one
 * saying yes.
 */
export function rendererRefusal(
  bundle: Pick<Bundle, 'canonicalRenderer' | 'name'>,
  thisRenderer: CanonicalRenderer,
): Problem | null {
  const declared = bundle.canonicalRenderer
  if (declared === thisRenderer) return null

  const owner = CANONICAL_RENDERERS[declared as CanonicalRenderer]
  const me = CANONICAL_RENDERERS[thisRenderer]
  if (!owner) {
    return {
      path: 'canonicalRenderer',
      message: `This bundle names "${declared}" as the owner of "${bundle.name}", which is not a renderer this ecosystem has. ${me.label} will not write content for an owner it cannot identify.`,
    }
  }
  return {
    path: 'canonicalRenderer',
    message: `"${bundle.name}" is owned by ${owner.label}. ${owner.owns} ${me.label} refuses to write it: the site would then have two sources of truth, and the copy nobody edits is the one your customer reads.`,
    supportedPath: owner.instead,
  }
}

/** Every {{custom_values.x}} a bundle expects the target to hold. */
export function referencedValueKeys(b: Bundle): string[] {
  const found = new Set<string>()
  const scan = (s?: string) => {
    for (const m of String(s ?? '').matchAll(/\{\{\s*custom_values\.([\w-]+)\s*\}\}/g)) found.add(m[1])
  }
  Object.values(b.sections ?? {}).forEach(scan)
  Object.values(b.collections ?? {}).forEach((c) => c.items?.forEach((i) => scan(i.content)))
  return [...found]
}
