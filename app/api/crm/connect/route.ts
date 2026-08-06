import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SUBACCOUNT_SCOPES, scopeString } from '@/lib/crm/scopes'

// GET /api/crm/connect — Generate the marketplace (sub-account) OAuth install
// URL so a user can install FROM the 0nCore dashboard.
//
// SUB-ACCOUNT ONLY. The agency install is a different app AND a different flow:
// it must carry `state=agency` so the shared callback exchanges the code with
// the agency app's credentials rather than trying each app in turn — and an
// auth code is single-use, so a wrong first try burns it. That logic already
// lives in GET /api/oauth/install/agency. Do not reproduce it here; a second
// agency path that omits `state` is how the code gets burned.
export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = process.env.CRM_MARKETPLACE_APP_CLIENT_ID || '69c762225a31e1cd2f28dd4c-mnu5pazi'
  // app.0ncore.com — the redirect the live sub-account app allows. Must match
  // the callback's exchange redirect exactly or the token swap 400s.
  const redirectUri = encodeURIComponent('https://app.0ncore.com/api/oauth/callback')
  const scopes = scopeString(SUBACCOUNT_SCOPES)

  const installUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=${redirectUri}&client_id=${clientId}&scope=${scopes}`

  return NextResponse.json({ url: installUrl })
}
