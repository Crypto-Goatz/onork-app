import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  SUBACCOUNT_SCOPES,
  AGENCY_INSTALL_SCOPES,
  scopeString,
} from '@/lib/crm/scopes'

// GET /api/crm/connect — Generate a CRM OAuth install URL.
//
// Two install shapes, chosen by ?level=. They are genuinely different installs,
// not two views of one:
//
//   sub  (default) — the marketplace app, installed per location via
//                    `chooselocation`. Day-to-day scopes only.
//   agency         — the agency app, installed once at the company level via
//                    `chooseaccount`. Carries the agency-only scopes (menu
//                    links, SaaS configurator, snapshots, locations.write) that
//                    a sub-account install can never hold.
//
// The scope lists live in lib/crm/scopes.ts so they are reviewable in a diff
// rather than buried in this handler.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const level = req.nextUrl.searchParams.get('level') === 'agency' ? 'agency' : 'sub'
  const redirectUri = encodeURIComponent('https://0ncore.com/api/oauth/callback')

  const clientId =
    level === 'agency'
      ? process.env.CRM_AGENCY_APP_CLIENT_ID || '6a71919be8d7c3c038df0839-mnu5pazi'
      : process.env.CRM_MARKETPLACE_APP_CLIENT_ID || '69c762225a31e1cd2f28dd4c-mnu5pazi'

  // Agency installs choose a whole account; sub-account installs choose a
  // location. Requesting agency scopes through `chooselocation` is exactly how
  // they get silently dropped from the grant.
  const chooser = level === 'agency' ? 'chooseaccount' : 'chooselocation'
  const scopes = scopeString(level === 'agency' ? AGENCY_INSTALL_SCOPES : SUBACCOUNT_SCOPES)

  const installUrl = `https://marketplace.gohighlevel.com/oauth/${chooser}?response_type=code&redirect_uri=${redirectUri}&client_id=${clientId}&scope=${scopes}`

  return NextResponse.json({ url: installUrl, level })
}
