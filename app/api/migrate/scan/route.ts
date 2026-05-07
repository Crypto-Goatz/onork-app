import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/migrate/scan
 * Scans a user's existing platform account and returns counts of importable data.
 * Body: { platform: 'brevo' | 'hubspot' | etc, apiKey: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform, apiKey } = await req.json()
  if (!platform || !apiKey) return NextResponse.json({ error: 'Missing platform or apiKey' }, { status: 400 })

  try {
    const scanner = SCANNERS[platform]
    if (!scanner) return NextResponse.json({ error: `Platform "${platform}" not supported yet` }, { status: 400 })

    const counts = await scanner(apiKey)
    return NextResponse.json({ platform, counts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scan failed' }, { status: 502 })
  }
}

// ─── Platform Scanners ───

type ScanFn = (apiKey: string) => Promise<Record<string, number>>

const SCANNERS: Record<string, ScanFn> = {
  brevo: scanBrevo,
}

async function scanBrevo(apiKey: string): Promise<Record<string, number>> {
  const headers = { 'api-key': apiKey, 'Content-Type': 'application/json' }
  const base = 'https://api.brevo.com/v3'

  const [contacts, lists, campaigns, templates, folders] = await Promise.allSettled([
    fetch(`${base}/contacts?limit=1&offset=0`, { headers }).then(r => r.json()),
    fetch(`${base}/contacts/lists?limit=50&offset=0`, { headers }).then(r => r.json()),
    fetch(`${base}/emailCampaigns?limit=1&offset=0&status=sent`, { headers }).then(r => r.json()),
    fetch(`${base}/smtp/templates?limit=1&offset=0`, { headers }).then(r => r.json()),
    fetch(`${base}/contacts/folders?limit=50&offset=0`, { headers }).then(r => r.json()),
  ])

  return {
    contacts: contacts.status === 'fulfilled' ? (contacts.value.count || 0) : 0,
    lists: lists.status === 'fulfilled' ? (lists.value.count || lists.value.lists?.length || 0) : 0,
    campaigns: campaigns.status === 'fulfilled' ? (campaigns.value.count || 0) : 0,
    templates: templates.status === 'fulfilled' ? (templates.value.count || 0) : 0,
    folders: folders.status === 'fulfilled' ? (folders.value.count || folders.value.folders?.length || 0) : 0,
  }
}
