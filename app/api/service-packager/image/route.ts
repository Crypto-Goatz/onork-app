/**
 * POST /api/service-packager/image — multipart/form-data
 *   Fields:
 *     file       — image (png/jpeg/webp/gif, ≤8 MB)
 *     package_id — optional; the package this image is for
 *     kind       — 'cover' | 'gallery' | 'fiverr' (default 'gallery')
 *
 * Returns: { url, path }
 *
 * Storage: bucket "portfolio", path "<user_id>/<package_id|loose>/<kind>-<ts>.<ext>"
 * Auth: Supabase session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function extOf(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'bin'
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'expected multipart/form-data' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 })
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: `unsupported type ${file.type} — png|jpeg|webp|gif only` },
      { status: 400 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `file too large (${file.size} > ${MAX_BYTES})` }, { status: 400 })
  }

  const packageId = (form.get('package_id') as string | null) || 'loose'
  const kind = ((form.get('kind') as string | null) || 'gallery').toLowerCase()
  const safeKind = ['cover', 'gallery', 'fiverr'].includes(kind) ? kind : 'gallery'

  // If a package_id was supplied, verify ownership
  if (packageId !== 'loose') {
    const { data: pkg } = await supabase
      .from('service_packages')
      .select('id')
      .eq('id', packageId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!pkg) {
      return NextResponse.json({ error: 'package not found' }, { status: 404 })
    }
  }

  const path = `${user.id}/${packageId}/${safeKind}-${Date.now()}.${extOf(file.type)}`

  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin()
    .storage.from('portfolio')
    .upload(path, buf, {
      contentType: file.type,
      cacheControl: '31536000, immutable',
      upsert: false,
    })

  if (upErr) {
    return NextResponse.json({ error: `upload failed: ${upErr.message}` }, { status: 500 })
  }

  const { data: pub } = admin().storage.from('portfolio').getPublicUrl(path)
  const url = pub.publicUrl

  // If targeted at a package + kind=cover, replace the cover
  if (packageId !== 'loose' && safeKind === 'cover') {
    await supabase
      .from('service_packages')
      .update({ images: [url], updated_at: new Date().toISOString() })
      .eq('id', packageId)
      .eq('user_id', user.id)
  } else if (packageId !== 'loose' && safeKind === 'gallery') {
    const { data: cur } = await supabase
      .from('service_packages')
      .select('images')
      .eq('id', packageId)
      .eq('user_id', user.id)
      .maybeSingle()
    const list: string[] = Array.isArray(cur?.images) ? (cur!.images as string[]) : []
    list.push(url)
    await supabase
      .from('service_packages')
      .update({ images: list, updated_at: new Date().toISOString() })
      .eq('id', packageId)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ url, path, size: file.size, type: file.type })
}
