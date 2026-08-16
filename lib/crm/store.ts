import { crmPost, crmPostRaw } from '@/lib/crm'

/**
 * Provisioning a real store from a generated site.
 *
 * THE SURPRISE HERE. Funnels and funnel pages are read-only across the whole
 * API, which makes "build a website" awkward — but PRODUCTS AND THE STORE ARE
 * FULLY WRITABLE. `POST /products/`, `POST /products/{id}/price`,
 * `POST /products/collections`, inventory, shipping zones and store settings
 * are all open. Verified against products-v3.json and store-v3.json.
 *
 * That inverts the product strategy. We cannot hand an agency a native landing
 * page through the API, but we CAN hand them a stocked, priced, categorised
 * store — which is worth considerably more and takes far longer by hand.
 *
 * PRICE IS A SEPARATE CALL. `POST /products/` takes name, locationId and
 * productType only; money lives on `POST /products/{id}/price`. A product
 * created without that second call exists and is unsellable, so `createProduct`
 * always does both and reports the price step separately.
 */

export type ProductType = 'DIGITAL' | 'PHYSICAL' | 'SERVICE' | 'PHYSICAL/DIGITAL'

export interface SourceProduct {
  name: string
  /** Free text from the generator — '$49', '49.00', 'From $49'. Parsed below. */
  price?: string
  description?: string
  image?: string
  category?: string
  productType?: ProductType
  recurring?: boolean
}

export interface ProductResult {
  name: string
  ok: boolean
  productId?: string
  priceId?: string
  amount?: number
  error?: string
  /** True when the product was made but the price call failed — it is unsellable. */
  unsellable?: boolean
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { _raw: text.slice(0, 300) }
  }
}

/**
 * Turn generator copy into a number the API will accept.
 *
 * Returns null rather than guessing when there is no number: creating a
 * $0.00 product on a real store because the text said "Call for pricing" is a
 * worse outcome than refusing and saying so.
 */
export function parsePrice(input?: string): number | null {
  if (!input) return null
  const m = String(input).replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'collection'
}

/** Create a product AND its price. Both, or the product cannot be sold. */
export async function createProduct(
  locationId: string,
  p: SourceProduct,
  currency = 'USD'
): Promise<ProductResult> {
  /**
   * A nameless product is a REFUSAL, not a crash.
   *
   * This threw `Cannot read properties of undefined (reading 'slice')` in
   * production on 2026-08-16, which surfaced to the user as "That step did not
   * complete." — a message that says nothing and points nowhere. A planner can
   * always emit an incomplete product; the executor's job is to say which field
   * is missing, not to fall over.
   */
  const name = typeof p.name === 'string' ? p.name.trim() : ''
  if (!name) {
    return {
      ok: false,
      name: '(unnamed)',
      error: 'This product has no name, so it was skipped. Say what the product is called.',
    } as ProductResult
  }

  const productRes = await crmPost('/products/', locationId, {
    name: name.slice(0, 120),
    productType: p.productType || 'PHYSICAL',
    ...(p.description ? { description: p.description.slice(0, 500) } : {}),
    ...(p.image ? { image: p.image } : {}),
  })

  const created = await readJson(productRes)
  if (!productRes.ok) {
    return { name: p.name, ok: false, error: `${productRes.status}: ${created?.message || created?._raw || 'create failed'}` }
  }

  const productId = created?._id || created?.id || created?.data?._id
  if (!productId) {
    return { name: p.name, ok: false, error: 'Product created but no id was returned.' }
  }

  const amount = parsePrice(p.price)
  if (amount === null) {
    return {
      name: p.name,
      ok: false,
      productId,
      unsellable: true,
      error: `No usable price in "${p.price ?? ''}" — product created but has no price, so it cannot be sold.`,
    }
  }

  // locationId is a REQUIRED body field on the price endpoint, and this is a
  // sub-resource, so crmPostRaw with an explicit locationId is the correct call.
  const priceRes = await crmPostRaw(`/products/${productId}/price`, locationId, {
    name: name.slice(0, 120),
    type: p.recurring ? 'recurring' : 'one_time',
    currency,
    amount,
    locationId,
  })
  const priced = await readJson(priceRes)

  if (!priceRes.ok) {
    return {
      name: p.name,
      ok: false,
      productId,
      unsellable: true,
      error: `Price rejected (${priceRes.status}): ${priced?.message || priced?._raw || ''}`.trim(),
    }
  }

  return { name: p.name, ok: true, productId, priceId: priced?._id || priced?.id, amount }
}

export interface CollectionResult {
  name: string
  ok: boolean
  collectionId?: string
  error?: string
}

export async function createCollection(locationId: string, name: string): Promise<CollectionResult> {
  // This endpoint uses altId/altType instead of locationId — a different
  // convention from every other products route, and sending locationId here
  // fails validation.
  const res = await crmPostRaw('/products/collections', locationId, {
    altId: locationId,
    altType: 'location',
    name: name.slice(0, 80),
    slug: slugify(name),
  })
  const data = await readJson(res)
  if (!res.ok) {
    return { name, ok: false, error: `${res.status}: ${data?.message || data?._raw || 'collection failed'}` }
  }
  return { name, ok: true, collectionId: data?.data?._id || data?._id || data?.id }
}

export interface StoreProvisionResult {
  products: ProductResult[]
  collections: CollectionResult[]
  summary: { created: number; failed: number; unsellable: number; collections: number }
}

/** How many writes a single provisioning run may make. */
export const STORE_BLAST_RADIUS = 50

/**
 * Build out a store from generated products.
 *
 * Capped, and sequential rather than parallel. These are live writes to a real
 * client's storefront; a generator that hallucinated two hundred products would
 * otherwise create two hundred of them, and there is no bulk delete to undo it.
 */
export async function provisionStore(
  locationId: string,
  products: SourceProduct[],
  opts: { currency?: string; createCollections?: boolean } = {}
): Promise<StoreProvisionResult> {
  const capped = products.slice(0, STORE_BLAST_RADIUS)
  const collections: CollectionResult[] = []

  if (opts.createCollections) {
    const names = [...new Set(capped.map((p) => p.category).filter(Boolean) as string[])]
    for (const name of names) collections.push(await createCollection(locationId, name))
  }

  const results: ProductResult[] = []
  for (const p of capped) {
    results.push(await createProduct(locationId, p, opts.currency || 'USD'))
  }

  return {
    products: results,
    collections,
    summary: {
      created: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok && !r.unsellable).length,
      unsellable: results.filter((r) => r.unsellable).length,
      collections: collections.filter((c) => c.ok).length,
    },
  }
}
