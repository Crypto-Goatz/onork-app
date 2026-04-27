import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'list_products'
  const category = url.searchParams.get('category')
  const q = url.searchParams.get('q')
  const id = url.searchParams.get('id')
  const slug = url.searchParams.get('slug')

  const supabase = getSupabase()

  try {
    if (action === 'get_product') {
      if (!id && !slug) {
        return NextResponse.json({ error: 'id or slug required' }, { status: 400 })
      }
      const query = supabase.from('ucp_products').select('*').eq('status', 'active')
      const { data, error } = id
        ? await query.eq('id', id).single()
        : await query.eq('slug', slug!).single()
      if (error) return NextResponse.json({ error: error.message }, { status: 404 })
      return NextResponse.json({ product: data }, { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    if (action === 'search') {
      if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 })
      const { data, error } = await supabase
        .from('ucp_products')
        .select('*')
        .eq('status', 'active')
        .or(`name.ilike.%${q}%,description.ilike.%${q}%,tags.cs.{${q}}`)
        .order('featured', { ascending: false })
        .order('sort_order')
        .limit(50)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ products: data || [], count: data?.length || 0 }, { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    let query = supabase
      .from('ucp_products')
      .select('*')
      .eq('status', 'active')
      .order('featured', { ascending: false })
      .order('sort_order')

    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const categories = Array.from(new Set((data || []).map((p) => p.category)))

    return NextResponse.json({
      products: data || [],
      count: data?.length || 0,
      categories,
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Catalog error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
