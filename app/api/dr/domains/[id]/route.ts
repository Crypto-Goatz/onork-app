import { NextRequest, NextResponse } from 'next/server'
import { drAdmin } from '@/lib/dr/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 })
  }

  // Soft-deactivate so historical events keep their site_id reference. The
  // tracking script will start failing the domain-lock check once is_active
  // is false because /api/dr/script/[siteId].js refuses to serve.
  const { error } = await drAdmin()
    .from('dr_domains')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
