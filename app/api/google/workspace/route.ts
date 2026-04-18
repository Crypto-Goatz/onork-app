import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getAuthenticatedClient,
  listEmails, getEmail, sendEmail,
  listFiles, createFolder,
  readSheet, writeSheet, createSpreadsheet,
  listEvents, createEvent,
  createDoc,
  listTaskLists, listTaskItems, createTask,
} from '@/lib/google/workspace'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserTokens(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('google_tokens')
    .eq('id', userId)
    .single()

  if (!data?.google_tokens?.access_token) {
    throw new Error('Google Workspace not connected. Go to Analytics → connect your Google account.')
  }

  return data.google_tokens
}

// POST /api/google/workspace — Unified Google Workspace API
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(authHeader)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, ...params } = await req.json()
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  let tokens
  try {
    tokens = await getUserTokens(user.id)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  const auth = getAuthenticatedClient(tokens)

  try {
    switch (action) {
      // ── Gmail ──
      case 'gmail.list':
        return NextResponse.json({ messages: await listEmails(auth, params) })

      case 'gmail.get':
        if (!params.messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })
        return NextResponse.json({ message: await getEmail(auth, params.messageId) })

      case 'gmail.send':
        if (!params.to || !params.subject || !params.body) {
          return NextResponse.json({ error: 'to, subject, body required' }, { status: 400 })
        }
        return NextResponse.json({ result: await sendEmail(auth, params.to, params.subject, params.body) })

      // ── Drive ──
      case 'drive.list':
        return NextResponse.json({ files: await listFiles(auth, params) })

      case 'drive.createFolder':
        if (!params.name) return NextResponse.json({ error: 'name required' }, { status: 400 })
        return NextResponse.json({ folder: await createFolder(auth, params.name, params.parentId) })

      // ── Sheets ──
      case 'sheets.read':
        if (!params.spreadsheetId || !params.range) {
          return NextResponse.json({ error: 'spreadsheetId and range required' }, { status: 400 })
        }
        return NextResponse.json({ values: await readSheet(auth, params.spreadsheetId, params.range) })

      case 'sheets.write':
        if (!params.spreadsheetId || !params.range || !params.values) {
          return NextResponse.json({ error: 'spreadsheetId, range, values required' }, { status: 400 })
        }
        return NextResponse.json({ result: await writeSheet(auth, params.spreadsheetId, params.range, params.values) })

      case 'sheets.create':
        if (!params.title) return NextResponse.json({ error: 'title required' }, { status: 400 })
        return NextResponse.json({ spreadsheet: await createSpreadsheet(auth, params.title) })

      // ── Calendar ──
      case 'calendar.list':
        return NextResponse.json({ events: await listEvents(auth, params) })

      case 'calendar.create':
        if (!params.summary || !params.start || !params.end) {
          return NextResponse.json({ error: 'summary, start, end required' }, { status: 400 })
        }
        return NextResponse.json({ event: await createEvent(auth, params) })

      // ── Docs ──
      case 'docs.create':
        if (!params.title) return NextResponse.json({ error: 'title required' }, { status: 400 })
        return NextResponse.json({ document: await createDoc(auth, params.title, params.content) })

      // ── Tasks ──
      case 'tasks.lists':
        return NextResponse.json({ taskLists: await listTaskLists(auth) })

      case 'tasks.list':
        if (!params.taskListId) return NextResponse.json({ error: 'taskListId required' }, { status: 400 })
        return NextResponse.json({ tasks: await listTaskItems(auth, params.taskListId) })

      case 'tasks.create':
        if (!params.taskListId || !params.title) {
          return NextResponse.json({ error: 'taskListId, title required' }, { status: 400 })
        }
        return NextResponse.json({ task: await createTask(auth, params.taskListId, params) })

      // ── Status ──
      case 'status':
        return NextResponse.json({
          connected: true,
          scopes: tokens.scope?.split(' ') || [],
          connectedAt: tokens.connected_at,
        })

      default:
        return NextResponse.json({ error: `Unknown action: ${action}`, available: [
          'gmail.list', 'gmail.get', 'gmail.send',
          'drive.list', 'drive.createFolder',
          'sheets.read', 'sheets.write', 'sheets.create',
          'calendar.list', 'calendar.create',
          'docs.create',
          'tasks.lists', 'tasks.list', 'tasks.create',
          'status',
        ]}, { status: 400 })
    }
  } catch (err: any) {
    console.error(`[workspace] ${action} error:`, err.message)

    // Handle token refresh
    if (err.message?.includes('invalid_grant') || err.message?.includes('Token has been expired')) {
      return NextResponse.json({
        error: 'Google token expired. Reconnect your Google account.',
        reconnect: true,
      }, { status: 401 })
    }

    return NextResponse.json({
      error: `${action} failed: ${err.message?.slice(0, 200)}`,
    }, { status: 500 })
  }
}
