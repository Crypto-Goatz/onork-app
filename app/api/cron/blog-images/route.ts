/**
 * GET /api/cron/blog-images?limit=5
 *
 * Backfills featured images for blog posts that don't have a real (raster) one —
 * i.e. image is null/empty or still a local /blog/*.svg placeholder. Generates
 * with OpenAI, stores in the blog-images bucket. Processes a small batch per call
 * (image gen is slow) and returns how many remain, so it can be looped.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAndStoreFeaturedImage } from '@/lib/blog/featured-image'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// A post "needs" an image if it has none or only a local SVG placeholder.
function needsImage(image: string | null): boolean {
  if (!image) return true
  if (image.startsWith('/blog/')) return true
  if (image.endsWith('.svg')) return true
  return false
}

export async function GET(req: NextRequest) {
  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '5', 10), 1), 8)

  const { data: posts, error } = await admin
    .from('blog_posts')
    .select('id, slug, title, category, image')
    .order('published_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const todo = (posts || []).filter((p) => needsImage(p.image))
  const batch = todo.slice(0, limit)

  const results = await Promise.all(
    batch.map(async (p) => {
      const url = await generateAndStoreFeaturedImage(p.slug, p.title, p.category || 'ai-automation')
      if (!url) return { slug: p.slug, ok: false }
      const { error: upErr } = await admin.from('blog_posts').update({ image: url }).eq('id', p.id)
      return { slug: p.slug, ok: !upErr }
    }),
  )

  const done = results.filter((r) => r.ok).length
  return NextResponse.json({
    processed: done,
    failed: results.length - done,
    remaining: Math.max(todo.length - done, 0),
    results,
  })
}
