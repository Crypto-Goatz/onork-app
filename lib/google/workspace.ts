import { google, Auth } from 'googleapis'
import { getOAuthClient } from './auth'

// All Google Workspace scopes we'll request
export const WORKSPACE_SCOPES = [
  // Gmail
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  // Drive
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  // Sheets
  'https://www.googleapis.com/auth/spreadsheets',
  // Calendar
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  // Docs
  'https://www.googleapis.com/auth/documents',
  // Slides
  'https://www.googleapis.com/auth/presentations',
  // People (Contacts)
  'https://www.googleapis.com/auth/contacts.readonly',
  // Analytics
  'https://www.googleapis.com/auth/analytics.readonly',
  // Search Console
  'https://www.googleapis.com/auth/webmasters.readonly',
  // Tasks
  'https://www.googleapis.com/auth/tasks',
  // User info
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

// Generate OAuth URL for workspace connect
export function getWorkspaceAuthUrl(state: string): string {
  const oauth = getOAuthClient()
  return oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: WORKSPACE_SCOPES,
    state,
  })
}

// Exchange code for tokens
export async function exchangeCode(code: string) {
  const oauth = getOAuthClient()
  const { tokens } = await oauth.getToken(code)
  return tokens
}

// Create authenticated client from stored tokens
export function getAuthenticatedClient(tokens: { access_token: string; refresh_token?: string; expiry_date?: number }): Auth.OAuth2Client {
  const oauth = getOAuthClient()
  oauth.setCredentials(tokens)
  return oauth
}

// ── Gmail helpers ──────────────────────────────────────
export function getGmail(auth: Auth.OAuth2Client) {
  return google.gmail({ version: 'v1', auth })
}

export async function listEmails(auth: Auth.OAuth2Client, opts: { maxResults?: number; q?: string; labelIds?: string[] } = {}) {
  const gmail = getGmail(auth)
  const res = await gmail.users.messages.list({
    userId: 'me',
    maxResults: opts.maxResults || 20,
    q: opts.q,
    labelIds: opts.labelIds,
  })
  return res.data.messages || []
}

export async function getEmail(auth: Auth.OAuth2Client, messageId: string) {
  const gmail = getGmail(auth)
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })
  return res.data
}

export async function sendEmail(auth: Auth.OAuth2Client, to: string, subject: string, body: string) {
  const gmail = getGmail(auth)
  const raw = Buffer.from(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
  ).toString('base64url')

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })
  return res.data
}

// ── Drive helpers ──────────────────────────────────────
export function getDrive(auth: Auth.OAuth2Client) {
  return google.drive({ version: 'v3', auth })
}

export async function listFiles(auth: Auth.OAuth2Client, opts: { q?: string; pageSize?: number; folderId?: string } = {}) {
  const drive = getDrive(auth)
  const query = opts.folderId ? `'${opts.folderId}' in parents` : opts.q || ''
  const res = await drive.files.list({
    q: query || undefined,
    pageSize: opts.pageSize || 20,
    fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, parents)',
    orderBy: 'modifiedTime desc',
  })
  return res.data.files || []
}

export async function createFolder(auth: Auth.OAuth2Client, name: string, parentId?: string) {
  const drive = getDrive(auth)
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id, name, webViewLink',
  })
  return res.data
}

// ── Sheets helpers ────────────────────────────────────
export function getSheets(auth: Auth.OAuth2Client) {
  return google.sheets({ version: 'v4', auth })
}

export async function readSheet(auth: Auth.OAuth2Client, spreadsheetId: string, range: string) {
  const sheets = getSheets(auth)
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range })
  return res.data.values || []
}

export async function writeSheet(auth: Auth.OAuth2Client, spreadsheetId: string, range: string, values: string[][]) {
  const sheets = getSheets(auth)
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
  return res.data
}

export async function createSpreadsheet(auth: Auth.OAuth2Client, title: string) {
  const sheets = getSheets(auth)
  const res = await sheets.spreadsheets.create({
    requestBody: { properties: { title } },
  })
  return res.data
}

// ── Calendar helpers ──────────────────────────────────
export function getCalendar(auth: Auth.OAuth2Client) {
  return google.calendar({ version: 'v3', auth })
}

export async function listEvents(auth: Auth.OAuth2Client, opts: { maxResults?: number; timeMin?: string; timeMax?: string } = {}) {
  const calendar = getCalendar(auth)
  const res = await calendar.events.list({
    calendarId: 'primary',
    maxResults: opts.maxResults || 20,
    timeMin: opts.timeMin || new Date().toISOString(),
    timeMax: opts.timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  })
  return res.data.items || []
}

export async function createEvent(auth: Auth.OAuth2Client, event: {
  summary: string
  description?: string
  start: { dateTime: string; timeZone?: string }
  end: { dateTime: string; timeZone?: string }
  attendees?: { email: string }[]
}) {
  const calendar = getCalendar(auth)
  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: 'all',
  })
  return res.data
}

// ── Docs helpers ──────────────────────────────────────
export function getDocs(auth: Auth.OAuth2Client) {
  return google.docs({ version: 'v1', auth })
}

export async function createDoc(auth: Auth.OAuth2Client, title: string, content?: string) {
  const docs = getDocs(auth)
  const doc = await docs.documents.create({ requestBody: { title } })

  if (content && doc.data.documentId) {
    await docs.documents.batchUpdate({
      documentId: doc.data.documentId,
      requestBody: {
        requests: [{
          insertText: {
            location: { index: 1 },
            text: content,
          },
        }],
      },
    })
  }

  return doc.data
}

// ── Tasks helpers ─────────────────────────────────────
export function getTasks(auth: Auth.OAuth2Client) {
  return google.tasks({ version: 'v1', auth })
}

export async function listTaskLists(auth: Auth.OAuth2Client) {
  const tasks = getTasks(auth)
  const res = await tasks.tasklists.list({ maxResults: 20 })
  return res.data.items || []
}

export async function listTaskItems(auth: Auth.OAuth2Client, taskListId: string) {
  const tasks = getTasks(auth)
  const res = await tasks.tasks.list({ tasklist: taskListId, maxResults: 100, showCompleted: true })
  return res.data.items || []
}

export async function createTask(auth: Auth.OAuth2Client, taskListId: string, task: { title: string; notes?: string; due?: string }) {
  const tasks = getTasks(auth)
  const res = await tasks.tasks.insert({ tasklist: taskListId, requestBody: task })
  return res.data
}
