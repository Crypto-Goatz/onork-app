/**
 * Form Embed Config
 * GET /api/forms/[id]/embed — returns form config for the embed script
 * Public endpoint — no auth required
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: form } = await admin
    .from('forms')
    .select('id, name, fields, settings, status')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404, headers: corsHeaders() })
  }

  return NextResponse.json({ form }, { headers: corsHeaders() })
}
