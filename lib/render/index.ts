import type { PageSpec } from '../builder/blocks'
import { Styler } from './html'
import { isKnownKind, renderBlock, type RenderCtx } from './blocks'
import { styleModeFor, wrap, type RenderTarget, type WrapOptions } from './wrap'

export type { RenderTarget } from './wrap'

export interface RenderOptions {
  target: RenderTarget
  canonical?: string
  /** Where the runtime personaliser posts. Ignored for the blog target. */
  personaliseEndpoint?: string
  classPrefix?: string
}

export interface RenderResult {
  html: string
  /** The stylesheet, for callers that host it separately. Empty when inlined. */
  css: string
  /** Non-fatal problems. A page still renders; the caller decides what to say. */
  warnings: string[]
  stats: { blocks: number; personalisableFields: number; bytes: number }
}

/**
 * PageSpec → HTML. The one function every delivery path goes through.
 *
 * Hosted pages, funnel widgets and blog posts differ only in their wrapper and
 * whether styles are classes or inline. Everything upstream of that — block
 * layout, escaping, the fallback rule — is shared, because the moment there are
 * two renderers they start disagreeing and the customer sees a page that does
 * not match the preview they approved.
 */
export function renderPage(page: PageSpec, options: RenderOptions): RenderResult {
  const warnings: string[] = []
  const target = options.target
  const styler = new Styler(styleModeFor(target), options.classPrefix || 'w0n')

  // The blog target cannot run script, so personalisation is unavailable there.
  // Saying so is the point: silently dropping it would leave someone waiting for
  // per-visitor copy that is never coming.
  const personalisable = target !== 'blog'
  if (!personalisable && page.blocks.some((b) => b.live)) {
    warnings.push(
      'Blog posts cannot run script, so per-visitor personalisation is disabled here. The published copy is each block’s fallback text.'
    )
  }

  const ctx: RenderCtx = { s: styler, page, personalisable }

  const parts: string[] = []
  let personalisableFields = 0

  for (const block of page.blocks) {
    if (!isKnownKind(block.kind)) {
      warnings.push(`Skipped block "${block.id}": unknown kind "${block.kind}".`)
      continue
    }
    // The fallback rule is a promise the renderer must be able to keep. A live
    // block with an empty fallback publishes a blank section to every crawler.
    if (block.live) {
      const missing = block.editable.filter((f) => !block.fallback[f.key]).map((f) => f.key)
      if (missing.length) {
        warnings.push(
          `Block "${block.id}" is live but has no fallback text for: ${missing.join(', ')}. Those areas will be empty until personalisation runs.`
        )
      }
      if (personalisable) personalisableFields += block.editable.length
    }
    parts.push(renderBlock(ctx, block))
  }

  const body = parts.join('\n')
  const css = styler.stylesheet()

  const wrapOptions: WrapOptions = {
    title: page.name || page.brand.business,
    description: page.brand.sells,
    canonical: options.canonical,
    personaliseEndpoint: personalisable ? options.personaliseEndpoint : undefined,
    bodyClassPrefix: options.classPrefix,
  }

  const html = wrap(target, body, css, wrapOptions)

  return {
    html,
    css,
    warnings,
    stats: { blocks: parts.length, personalisableFields, bytes: html.length },
  }
}
