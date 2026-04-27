import { NextRequest, NextResponse } from 'next/server'
import { getTheme } from '@/lib/landing-pages/0nmcp-bridge'
import { renderThemeToHTML } from '@/lib/landing-pages/render'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const themeId = body.theme_id as string
    const content = body.content
    const domain = body.domain as string | undefined

    if (!themeId || !content) {
      return NextResponse.json({ error: 'theme_id and content required' }, { status: 400 })
    }
    const theme = getTheme(themeId)
    if (!theme) {
      return NextResponse.json({ error: `Unknown theme: ${themeId}` }, { status: 404 })
    }

    const html = renderThemeToHTML({ theme, content, domain })
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Render error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
