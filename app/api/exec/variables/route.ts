import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export async function GET() {
  const { data } = await db().from('exec_variables').select('*').or('is_system.eq.true').order('category').order('label')
  return NextResponse.json({ variables: data || [] })
}
