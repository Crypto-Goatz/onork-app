// POST /api/changelog — Log every change to Google Sheets + Supabase
// Called after every deploy, skill update, or significant change
// Appends a row: timestamp, repo, commit_msg, files_changed, author, type, details

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const SPREADSHEET_ID = '13MzG2NuvXH8UONTOabd9GTJYM5Xbf4tcz_t9SNIGoB8'
const SHEET_RANGE = 'Sheet1!A:G'

async function getGoogleAuth() {
  const saKey = process.env.GOOGLE_SA_KEY
  if (!saKey) return null
  try {
    const credentials = JSON.parse(saKey)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    return auth
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { repo, commit, files_changed, author, type, details } = await req.json()

    const timestamp = new Date().toISOString()
    const row = {
      timestamp,
      repo: repo || 'onork-app',
      commit: (commit || '').slice(0, 200),
      files_changed: files_changed || 0,
      author: author || 'Claude Code',
      type: type || 'commit',
      details: (details || '').slice(0, 500),
    }

    // Append to Google Sheets via service account
    const auth = await getGoogleAuth()
    let sheetsLogged = false
    if (auth) {
      try {
        const sheets = google.sheets({ version: 'v4', auth })
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: SHEET_RANGE,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              row.timestamp,
              row.repo,
              row.commit,
              row.files_changed,
              row.author,
              row.type,
              row.details,
            ]],
          },
        })
        sheetsLogged = true
      } catch (err) {
        console.warn('[changelog] Google Sheets append failed:', err)
      }
    }

    // Also log to Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    try { await supabase.from('changelog').insert(row) } catch {}

    return NextResponse.json({ logged: true, sheetsLogged, row })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// GET /api/changelog — Initialize headers if sheet is empty
export async function GET(req: NextRequest) {
  const auth = await getGoogleAuth()
  if (!auth) return NextResponse.json({ error: 'Google SA not configured' }, { status: 500 })

  try {
    const sheets = google.sheets({ version: 'v4', auth })

    // Check if headers exist
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:G1',
    })

    if (!existing.data.values?.length) {
      // Write headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A1:G1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Timestamp', 'Repo', 'Commit', 'Files Changed', 'Author', 'Type', 'Details']],
        },
      })
      return NextResponse.json({ initialized: true })
    }

    return NextResponse.json({ already_initialized: true, headers: existing.data.values[0] })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
