import { NextResponse } from 'next/server'
import { readProspectSite } from '@/lib/prospect/site'

/**
 * Serve a generated prospect page.
 *
 * A route handler rather than a React page: what was stored is a complete HTML
 * document, and the whole point is that the bytes we send are the bytes that
 * were reviewed. Wrapping it in a layout would put our chrome on a page that is
 * meant to look like theirs.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const site = await readProspectSite(slug)

  if (!site) {
    return new NextResponse(
      '<!doctype html><meta charset="utf-8"><title>Not found</title><body style="font:16px system-ui;padding:3rem;max-width:32rem;margin:auto"><h1>This preview has expired</h1><p>Generated previews are kept for 90 days. Ask whoever sent it for a fresh link.</p></body>',
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  return new NextResponse(site.html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Not indexable. It is a page about someone else's business that they did
      // not ask for; it should not compete with their real site in search.
      'x-robots-tag': 'noindex, nofollow',
      'cache-control': 'public, max-age=300',
    },
  })
}
