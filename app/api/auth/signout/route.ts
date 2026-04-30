/**
 * GET /api/auth/signout — clear the Supabase session and redirect home.
 *
 * Used by the "Sign out" link on /welcome and anywhere else we need a
 * one-click logout. GET so a plain <a href> works (no fetch needed).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const url = new URL('/login', new URL(req.url).origin)
  return NextResponse.redirect(url)
}

export const POST = GET
