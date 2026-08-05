import { NextResponse } from 'next/server'
import { renderPage, type RenderTarget } from '@/lib/render'

/**
 * PageSpec → HTML. Pure: touches no client account.
 *
 * Kept as its own route rather than folded into the burst plan/run flow
 * precisely BECAUSE it writes nothing. Forcing a render through the approval
 * gate would train people to approve plans that do not need approving, and an
 * approval habit is the thing protecting every route that does write.
 */
export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 })
  }

  const spec = body?.spec
  if (!spec?.blocks?.length) {
    return NextResponse.json(
      { error: 'Give me a page design with at least one block.' },
      { status: 400 }
    )
  }

  const target: RenderTarget = ['document', 'widget', 'blog'].includes(body?.target)
    ? body.target
    : 'document'

  try {
    const r = renderPage(
      {
        id: spec.id || 'spec',
        name: spec.name || spec.brand?.business || 'Untitled page',
        blocks: spec.blocks,
        brand: spec.brand || { business: 'Untitled' },
      },
      {
        target,
        canonical: typeof body?.canonical === 'string' ? body.canonical : undefined,
        personaliseEndpoint: target === 'blog' ? undefined : '/api/personalize',
        classPrefix: typeof body?.classPrefix === 'string' ? body.classPrefix : undefined,
      }
    )

    return NextResponse.json({
      target,
      html: r.html,
      css: r.css,
      // Warnings are returned, never swallowed. An empty live block or a skipped
      // section is exactly what the person publishing needs to see.
      warnings: r.warnings,
      stats: r.stats,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Render failed.' }, { status: 500 })
  }
}
