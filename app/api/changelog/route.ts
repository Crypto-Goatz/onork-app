// POST /api/changelog — Log every change to Google Sheets
// Called after every deploy, skill update, or significant change
// Appends a row: timestamp, repo, commit_msg, files_changed, author, type

import { NextRequest, NextResponse } from 'next/server'

const SHEETS_APPEND_URL = process.env.GOOGLE_SHEETS_CHANGELOG_URL // Google Apps Script Web App URL

export async function POST(req: NextRequest) {
  try {
    const { repo, commit, files_changed, author, type, details } = await req.json()

    const row = {
      timestamp: new Date().toISOString(),
      repo: repo || 'onork-app',
      commit: (commit || '').slice(0, 200),
      files_changed: files_changed || 0,
      author: author || 'Claude Code',
      type: type || 'commit', // commit, skill_update, deploy, config_change
      details: (details || '').slice(0, 500),
    }

    // Log to Google Sheets if configured
    if (SHEETS_APPEND_URL) {
      await fetch(SHEETS_APPEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      }).catch(err => console.warn('[changelog] Sheets append failed:', err))
    }

    // Also log to Supabase as backup
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    try { await supabase.from('changelog').insert(row) } catch {}

    return NextResponse.json({ logged: true, row })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
