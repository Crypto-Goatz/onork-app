/**
 * Generate a featured image for a blog post and store it in the public Supabase
 * `blog-images` bucket; returns the permanent public URL (owned + persistent).
 *
 * Uses Flux via Pollinations (free, no API key) because the OpenAI account is at
 * its billing hard limit. To switch back to OpenAI later, set OPENAI_IMAGES=1 and
 * raise the OpenAI billing limit — the OpenAI branch below will take over.
 *
 * Returns null on failure (caller keeps going; a post without an image is valid).
 */

import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function seedFrom(slug: string): number {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 1_000_000
  return h
}

async function fetchImageBytes(title: string, category: string, slug: string): Promise<Uint8Array | null> {
  const prompt =
    `Editorial featured image for a B2B SaaS AI CRM brand 0nCore. Topic: ${title}. ` +
    `Category ${category}. Sleek dark UI aesthetic, near-black background, lime green accent, ` +
    `abstract technology and data-flow visualization, depth and glow, premium modern, no text no words no letters`

  const key = process.env.OPENAI_API_KEY
  if (process.env.OPENAI_IMAGES === '1' && key) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-1', prompt: prompt.slice(0, 3900), size: '1536x1024', n: 1 }),
      })
      if (res.ok) {
        const d = await res.json()
        const b64 = d?.data?.[0]?.b64_json
        if (b64) return new Uint8Array(Buffer.from(b64, 'base64'))
        const url = d?.data?.[0]?.url
        if (url) return new Uint8Array(await (await fetch(url)).arrayBuffer())
      } else {
        console.error('[blog-image] OpenAI', res.status, (await res.text()).slice(0, 160))
      }
    } catch (e) { console.error('[blog-image] OpenAI threw:', e) }
  }

  // Free fallback: Flux via Pollinations.
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1536&height=1024&nologo=true&model=flux&seed=${seedFrom(slug)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(55_000) })
    if (!res.ok) { console.error('[blog-image] pollinations', res.status); return null }
    const buf = new Uint8Array(await res.arrayBuffer())
    return buf.length > 1000 ? buf : null
  } catch (e) {
    console.error('[blog-image] pollinations threw:', e)
    return null
  }
}

export async function generateAndStoreFeaturedImage(
  slug: string,
  title: string,
  category: string,
): Promise<string | null> {
  const bytes = await fetchImageBytes(title, category, slug)
  if (!bytes) return null
  const path = `${slug}.png`
  const { error: upErr } = await admin.storage
    .from('blog-images')
    .upload(path, bytes, { contentType: 'image/png', upsert: true })
  if (upErr) {
    console.error('[blog-image] upload failed:', upErr.message)
    return null
  }
  return admin.storage.from('blog-images').getPublicUrl(path).data.publicUrl
}
