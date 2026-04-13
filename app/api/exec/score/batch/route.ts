import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scoreContact } from '@/lib/exec/formula-runtime'

export async function POST(req: NextRequest) {
  const { orbitId } = await req.json()
  if (!orbitId) return NextResponse.json({ error: 'orbitId required' }, { status: 400 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: contacts } = await db.from('exec_contacts').select('id').eq('orbit_id', orbitId)
  if (!contacts?.length) return NextResponse.json({ scored: 0 })

  for (let i = 0; i < contacts.length; i += 10) {
    await Promise.all(contacts.slice(i, i + 10).map(c => scoreContact(c.id)))
  }

  return NextResponse.json({ success: true, scored: contacts.length })
}
