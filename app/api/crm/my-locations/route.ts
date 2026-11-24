import { NextResponse } from 'next/server'
import { sessionUserId } from '@/lib/auth/session-user'
import { ownedLocations } from '@/lib/crm/owned-locations'

export const dynamic = 'force-dynamic'

/** The CRM accounts the signed-in person can work in — feeds the account picker on Contacts / Tasks / Calendar / Forms. */
export async function GET() {
  const uid = await sessionUserId()
  if (!uid) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  const { locations, defaultId } = await ownedLocations(uid)
  return NextResponse.json({ locations, defaultId })
}
