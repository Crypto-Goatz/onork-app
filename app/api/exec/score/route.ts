import { NextRequest, NextResponse } from 'next/server'
import { scoreContact } from '@/lib/exec/formula-runtime'

export async function POST(req: NextRequest) {
  const { contactId } = await req.json()
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })
  await scoreContact(contactId)
  return NextResponse.json({ success: true })
}
