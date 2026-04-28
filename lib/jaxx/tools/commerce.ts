/**
 * Jaxx commerce tool surface.
 *
 * 3 tools:
 *   - commerce_list_offers   (NON-mutating)  → /api/commerce/offers
 *   - commerce_create_checkout (MUTATING — confirmation gate) → /api/commerce/checkout
 *   - commerce_get_download   (NON-mutating, requires entitlement) → /api/commerce/download
 *
 * Capability gating: only emitted when config.allowed_actions includes
 * 'commerce' AND the per-category toggle is on.
 */

import type { GroqToolDef } from '../groq'
import type { JaxxConfig } from '../security'
import type { AuthedFetcher, DispatchResult } from './automation'

export const TOOL_COMMERCE_LIST_OFFERS: GroqToolDef = {
  type: 'function',
  function: {
    name: 'commerce_list_offers',
    description:
      'List available products, downloads, and plans the user can browse. Filters by category if provided. NON-MUTATING.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional category filter (e.g., "addons", "downloads", "templates").' },
        limit: { type: 'number' },
      },
    },
  },
}

export const TOOL_COMMERCE_CHECKOUT: GroqToolDef = {
  type: 'function',
  function: {
    name: 'commerce_create_checkout',
    description:
      'Create a Stripe Checkout session for a product. Returns the URL the user clicks to complete payment. MUTATING — requires explicit user confirmation first.',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Product slug from commerce_list_offers.' },
        quantity: { type: 'number', description: 'Quantity (default 1; max 10).' },
      },
      required: ['slug'],
    },
  },
}

export const TOOL_COMMERCE_DOWNLOAD: GroqToolDef = {
  type: 'function',
  function: {
    name: 'commerce_get_download',
    description:
      'Verify the user has paid for a product and return the download URL. NON-MUTATING — only succeeds if entitlement exists.',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Product slug to fetch the download link for.' },
      },
      required: ['slug'],
    },
  },
}

const COMMERCE_MUTATING = new Set(['commerce_create_checkout'])

export function isCommerceMutating(toolName: string): boolean {
  return COMMERCE_MUTATING.has(toolName)
}

export function getEnabledCommerceTools(config: JaxxConfig): GroqToolDef[] {
  if (!config.allowed_actions.includes('commerce')) return []
  const tools: GroqToolDef[] = []
  if (config.commerce_can_browse) tools.push(TOOL_COMMERCE_LIST_OFFERS)
  if (config.commerce_can_checkout) tools.push(TOOL_COMMERCE_CHECKOUT)
  if (config.commerce_can_download) tools.push(TOOL_COMMERCE_DOWNLOAD)
  return tools
}

export interface CommerceDispatchArgs {
  toolName: string
  arguments: Record<string, unknown>
  authedFetcher: AuthedFetcher
  baseUrl: string
}

export async function dispatchCommerceTool(args: CommerceDispatchArgs): Promise<DispatchResult> {
  const { toolName, arguments: a, authedFetcher, baseUrl } = args

  const get = async (path: string): Promise<DispatchResult> => {
    const res = await authedFetcher(`${baseUrl}${path}`, { method: 'GET' })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data, toolName }
  }

  const post = async (path: string, body: unknown): Promise<DispatchResult> => {
    const res = await authedFetcher(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data, toolName }
  }

  switch (toolName) {
    case 'commerce_list_offers': {
      const params = new URLSearchParams()
      if (a.category) params.set('category', String(a.category))
      if (a.limit) params.set('limit', String(a.limit))
      const qs = params.toString() ? `?${params}` : ''
      return get(`/api/commerce/offers${qs}`)
    }
    case 'commerce_create_checkout':
      return post('/api/commerce/checkout', { slug: a.slug, quantity: a.quantity })
    case 'commerce_get_download':
      return get(`/api/commerce/download?slug=${encodeURIComponent(String(a.slug))}`)
    default:
      return { ok: false, status: 400, data: { error: `unknown commerce tool: ${toolName}` }, toolName }
  }
}

export function describeCommercePlan(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'commerce_create_checkout':
      return `Plan: open a Stripe checkout for "${args.slug}" (qty ${args.quantity ?? 1}). I'll send you the payment link.`
    default:
      return `Plan: ${toolName} with ${JSON.stringify(args)}`
  }
}
