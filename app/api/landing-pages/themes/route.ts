import { NextResponse } from 'next/server'
import { listThemes } from '@/lib/landing-pages/0nmcp-bridge'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ themes: listThemes() })
}
