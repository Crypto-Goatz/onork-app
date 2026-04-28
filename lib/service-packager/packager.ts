/**
 * 0n Service Packager — master orchestrator.
 *
 *   1. Ingest (URL, prompt, or MCP server)
 *   2. Run all 8 generators in parallel
 *   3. Save to service_packages table
 *   4. Return the complete ServicePackage
 */

import { createClient } from '@supabase/supabase-js'
import { ingestFromURL, ingestFromPrompt, ingestFromMCPServer } from './ingest'
import { generateFiverrGig } from './generators/fiverr'
import { generatePortfolioItem } from './generators/portfolio'
import { generateUpworkListing } from './generators/upwork'
import { generateMarketplaceApp } from './generators/marketplace'
import { generateCRMService } from './generators/crm-service'
import { generateLandingPage } from './generators/landing-page'
import { generateSocialPosts } from './generators/social'
import {
  ALL_OUTPUTS,
  type IngestResult,
  type OutputKey,
  type ServicePackage,
  type SourceType,
} from './types'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface PackageInput {
  mode: 'url' | 'prompt' | 'mcp_registry'
  url?: string
  prompt?: string
  mcp_server?: string
  user_id?: string
  outputs?: OutputKey[]
}

async function ingest(input: PackageInput): Promise<IngestResult> {
  if (input.mode === 'url') {
    if (!input.url) throw new Error('url required for url mode')
    return ingestFromURL(input.url)
  }
  if (input.mode === 'prompt') {
    if (!input.prompt) throw new Error('prompt required for prompt mode')
    return ingestFromPrompt(input.prompt)
  }
  if (input.mode === 'mcp_registry') {
    if (!input.mcp_server) throw new Error('mcp_server required for mcp_registry mode')
    return ingestFromMCPServer(input.mcp_server)
  }
  throw new Error(`Unsupported mode: ${input.mode as string}`)
}

export async function packageService(input: PackageInput): Promise<ServicePackage> {
  const ing = await ingest(input)

  const wanted = new Set<OutputKey>(input.outputs ?? ALL_OUTPUTS)

  // Run every requested generator in parallel; allSettled so a single
  // generator failure doesn't take down the whole package
  const tasks: Array<Promise<{ key: OutputKey; value: unknown } | null>> = []

  if (wanted.has('fiverr_gig')) {
    tasks.push(generateFiverrGig(ing).then((v) => ({ key: 'fiverr_gig' as OutputKey, value: v })).catch(() => null))
  }
  if (wanted.has('portfolio_item')) {
    tasks.push(generatePortfolioItem(ing).then((v) => ({ key: 'portfolio_item' as OutputKey, value: v })).catch(() => null))
  }
  if (wanted.has('upwork_listing')) {
    tasks.push(generateUpworkListing(ing).then((v) => ({ key: 'upwork_listing' as OutputKey, value: v })).catch(() => null))
  }
  if (wanted.has('on_marketplace_app') || wanted.has('ucp_product')) {
    tasks.push(
      generateMarketplaceApp(ing)
        .then((v) => ({ key: '__marketplace__' as unknown as OutputKey, value: v }))
        .catch(() => null)
    )
  }
  if (wanted.has('crm_service')) {
    tasks.push(generateCRMService(ing).then((v) => ({ key: 'crm_service' as OutputKey, value: v })).catch(() => null))
  }
  if (wanted.has('landing_page')) {
    tasks.push(generateLandingPage(ing).then((v) => ({ key: 'landing_page' as OutputKey, value: v })).catch(() => null))
  }
  if (wanted.has('social_posts')) {
    tasks.push(generateSocialPosts(ing).then((v) => ({ key: 'social_posts' as OutputKey, value: v })).catch(() => null))
  }

  const settled = await Promise.all(tasks)

  const outputs: ServicePackage['outputs'] = {}
  let vpisScore = 0
  for (const r of settled) {
    if (!r) continue
    if ((r.key as string) === '__marketplace__') {
      const v = r.value as { on_app: unknown; ucp_product: unknown }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      outputs.on_marketplace_app = v.on_app as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      outputs.ucp_product = v.ucp_product as any
      continue
    }
    if (r.key === 'social_posts') {
      const sp = r.value as { linkedin: { vpis_score: number } }
      vpisScore = sp.linkedin.vpis_score ?? 0
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(outputs as Record<string, unknown>)[r.key] = r.value
  }

  // Persist
  const sb = admin()
  const sourceType: SourceType =
    input.mode === 'url' ? 'url' : input.mode === 'prompt' ? 'prompt' : 'mcp_registry'

  const { data, error } = await sb
    .from('service_packages')
    .insert({
      user_id: input.user_id ?? null,
      source_type: sourceType,
      source_url: input.url ?? null,
      source_prompt: input.prompt ?? null,
      source_mcp_server: input.mcp_server ?? null,
      service_name: ing.service_name,
      service_description: ing.service_description,
      target_audience: ing.target_audience,
      primary_deliverable: ing.primary_deliverable,
      delivery_time: ing.delivery_time,
      price_anchor_cents: ing.price_anchor_cents,
      keywords: ing.keywords,
      category: ing.category,
      images: ing.images,
      fiverr_gig: outputs.fiverr_gig ?? null,
      portfolio_item: outputs.portfolio_item ?? null,
      upwork_listing: outputs.upwork_listing ?? null,
      on_marketplace_app: outputs.on_marketplace_app ?? null,
      ucp_product: outputs.ucp_product ?? null,
      crm_service: outputs.crm_service ?? null,
      landing_page: outputs.landing_page ?? null,
      social_posts: outputs.social_posts ?? null,
      status: 'generated',
      vpis_score: vpisScore,
    })
    .select('id, created_at')
    .single()

  if (error) {
    console.error('[service-packager] persist failed:', error)
  }

  return {
    id: data?.id,
    user_id: input.user_id,
    source: {
      type: sourceType,
      url: input.url,
      prompt: input.prompt,
      mcp_server: input.mcp_server,
    },
    ingest: ing,
    outputs,
    vpis_score: vpisScore,
    status: 'generated',
  }
}
