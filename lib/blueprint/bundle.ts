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
