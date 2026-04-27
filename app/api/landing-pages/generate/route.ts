import { NextRequest, NextResponse } from 'next/server'
import { generateContent, KLayer } from '@/lib/landing-pages/0nmcp-bridge'
import { renderThemeToHTML } from '@/lib/landing-pages/render'
import { getTheme } from '@/lib/landing-pages/0nmcp-bridge'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const themeId = body.theme_id as string
    const k = (body.k_layer || {}) as KLayer
    const includeHtml = body.include_html !== false

    if (!themeId) {
      return NextResponse.json({ error: 'theme_id required' }, { status: 400 })
    }
    const theme = getTheme(themeId)
    if (!theme) {
      return NextResponse.json({ error: `Unknown theme: ${themeId}` }, { status: 404 })
    }

    const generated = await generateContent(themeId, k)

    let html: string | null = null
    if (includeHtml) {
      html = renderThemeToHTML({ theme, content: generated.content })
    }

    return NextResponse.json({
      ok: true,
      generated,
      html,
      theme: { id: theme.id, name: theme.name, primary_color: theme.primary_color },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
