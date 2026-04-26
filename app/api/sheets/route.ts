// POST /api/sheets — Google Sheets read/write/append
// Actions: read, write, append
// Uses GOOGLE_SA_KEY service account — sheet must be shared with the SA email

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient as createServerClient } from '@/lib/supabase/server'

async function getAuth() {
  const saKey = process.env.GOOGLE_SA_KEY
  if (!saKey) return null
  try {
    const credentials = JSON.parse(saKey)
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  // Auth check
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, spreadsheetId, range, values } = await req.json()

  if (!spreadsheetId || !range) {
    return NextResponse.json({ error: 'spreadsheetId and range required' }, { status: 400 })
  }

  const auth = await getAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Google service account not configured' }, { status: 500 })
  }

  const sheets = google.sheets({ version: 'v4', auth })

  try {
    switch (action) {
      case 'read': {
        const res = await sheets.spreadsheets.values.get({ spreadsheetId, range })
        return NextResponse.json({ values: res.data.values || [] })
      }

      case 'write': {
        if (!values) return NextResponse.json({ error: 'values required for write' }, { status: 400 })
        await sheets.spreadsheets.values.update({
          spreadsheetId, range,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values },
        })
        return NextResponse.json({ updated: true })
      }

      case 'append': {
        if (!values) return NextResponse.json({ error: 'values required for append' }, { status: 400 })
        await sheets.spreadsheets.values.append({
          spreadsheetId, range,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values },
        })
        return NextResponse.json({ appended: true })
      }

      case 'info': {
        const res = await sheets.spreadsheets.get({ spreadsheetId })
        return NextResponse.json({
          title: res.data.properties?.title,
          sheets: res.data.sheets?.map(s => ({
            id: s.properties?.sheetId,
            title: s.properties?.title,
            rows: s.properties?.gridProperties?.rowCount,
            cols: s.properties?.gridProperties?.columnCount,
          })),
        })
      }

      default:
        return NextResponse.json({ error: 'action must be: read, write, append, or info' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
