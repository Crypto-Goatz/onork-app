/**
 * GET  /api/recap  — the user's daily briefing (cached once per day).
 * POST /api/recap  — mark today's recap as seen (stamps profiles.last_recap_at).
 *
 * Aggregates REAL account activity (CRM + Supabase), detects issues, and asks
 * Groq for a smart morning summary. Cached in daily_recaps so it's generated
 * once per user per day, not on every dashboard hit.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getAuthContext } from '@/lib/auth-context'
import { crmGet } from '@/lib/crm'
import { askAI } from '@/lib/ai-call'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 45

function admin() {
  return createAdmin(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
const todayUTC = () => new Date().toISOString().slice(0, 10)
const since24h = () => Date.now() - 24 * 60 * 60 * 1000

type Issue = { severity: 'critical' | 'warning' | 'info'; title: string; detail: string; href?: string; cta?: string }
type Highlight = { label: string; value: string; sub?: string }

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId, locationId, businessName } = ctx
  const db = admin()
  const date = todayUTC()

  // 1. Cached recap for today?
  const { data: cached } = await db.from('daily_recaps').select('*').eq('user_id', userId).eq('recap_date', date).maybeSingle()
  if (cached) {
    return NextResponse.json({ cached: true, businessName, date, summary: cached.summary, highlights: cached.highlights, issues: cached.issues, actions: cached.actions, data: cached.data })
  }

  // 2. Profile (issues source)
  const { data: profile } = await db.from('profiles').select('crm_location_id, provisioning_error, last_recap_at, plan').eq('id', userId).maybeSingle()

  const data: Record<string, number> = { contacts: 0, newContacts24h: 0, opportunities: 0, pipelineValue: 0, wonDeals: 0, conversations: 0, unread: 0, balanceCents: 0, connections: 0, automationRuns24h: 0, automationFails24h: 0 }
  const issues: Issue[] = []

  // 3. CRM data (best-effort each)
  if (locationId) {
    try {
      const r = await crmGet('/contacts/?limit=20&sortBy=date_added&order=desc', locationId)
      if (r.ok) {
        const j = await r.json()
        data.contacts = j.meta?.total || j.total || (j.contacts?.length ?? 0)
        const cutoff = since24h()
        data.newContacts24h = (j.contacts || []).filter((c: { dateAdded?: string }) => c.dateAdded && new Date(c.dateAdded).getTime() > cutoff).length
      }
    } catch { /* skip */ }
    try {
      const pr = await crmGet('/opportunities/pipelines', locationId)
      if (pr.ok) {
        const pj = await pr.json()
        const pid = pj.pipelines?.[0]?.id
        if (pid) {
          const or = await crmGet(`/opportunities/search?pipeline_id=${pid}&limit=100`, locationId)
          if (or.ok) {
            const oj = await or.json()
            const opps = oj.opportunities || []
            data.opportunities = oj.meta?.total || opps.length
            data.pipelineValue = Math.round(opps.reduce((s: number, o: { monetaryValue?: number }) => s + (o.monetaryValue || 0), 0))
            data.wonDeals = opps.filter((o: { status?: string }) => o.status === 'won').length
          }
        }
      }
    } catch { /* skip */ }
    try {
      const cr = await crmGet('/conversations/search?limit=20', locationId)
      if (cr.ok) {
        const cj = await cr.json()
        data.conversations = cj.total || (cj.conversations?.length ?? 0)
        data.unread = (cj.conversations || []).filter((c: { unreadCount?: number }) => (c.unreadCount || 0) > 0).length
      }
    } catch { /* skip */ }
  }

  // 4. Supabase data (best-effort)
  try {
    const { data: w } = await db.from('user_wallets').select('balance_cents').eq('user_id', userId).maybeSingle()
    data.balanceCents = w?.balance_cents ?? 0
  } catch { /* skip */ }
  let googleConnected = false
  try {
    const { data: conns } = await db.from('user_connections').select('provider').eq('user_id', userId)
    data.connections = conns?.length ?? 0
    googleConnected = (conns || []).some((c: { provider?: string }) => c.provider === 'google')
  } catch { /* skip */ }
  try {
    const sinceIso = new Date(since24h()).toISOString()
    const { data: runs } = await db.from('workflow_executions').select('status, created_at').eq('user_id', userId).gte('created_at', sinceIso)
    data.automationRuns24h = runs?.length ?? 0
    data.automationFails24h = (runs || []).filter((r: { status?: string }) => r.status === 'error' || r.status === 'failed').length
  } catch { /* table/column may differ — skip */ }

  // 5. Issue detection (deterministic, real)
  if (!profile?.crm_location_id) issues.push({ severity: 'critical', title: 'Workspace still setting up', detail: "Your CRM workspace is finishing provisioning. Most features stay empty until it's ready.", href: '/dashboard/settings', cta: 'Check status' })
  if (profile?.provisioning_error) issues.push({ severity: 'warning', title: 'Setup hit a snag', detail: 'Your workspace setup reported an error — our system auto-retries, but reach out if it persists.', href: '/dashboard/settings', cta: 'Review' })
  if (locationId && !googleConnected) issues.push({ severity: 'info', title: 'Connect Google', detail: 'Connect Google to unlock Analytics, Search Console, and Business Profile insights.', href: '/api/auth/connect/google', cta: 'Connect Google' })
  if (data.balanceCents <= 50) issues.push({ severity: 'warning', title: 'Low execution balance', detail: `Your balance is $${(data.balanceCents / 100).toFixed(2)}. Top up to keep automations and AI running.`, href: '/dashboard/billing', cta: 'Add funds' })
  if (data.automationFails24h > 0) issues.push({ severity: 'warning', title: `${data.automationFails24h} automation${data.automationFails24h > 1 ? 's' : ''} failed`, detail: 'One or more automations errored in the last 24 hours.', href: '/dashboard/automations/runs', cta: 'View runs' })
  if (data.unread > 0) issues.push({ severity: 'info', title: `${data.unread} unread conversation${data.unread > 1 ? 's' : ''}`, detail: 'Leads are waiting on a reply.', href: '/dashboard/email', cta: 'Open inbox' })

  // 6. Highlights
  const highlights: Highlight[] = [
    { label: 'New contacts (24h)', value: String(data.newContacts24h), sub: `${data.contacts.toLocaleString()} total` },
    { label: 'Open opportunities', value: String(data.opportunities), sub: data.pipelineValue ? `$${data.pipelineValue.toLocaleString()} in pipeline` : undefined },
    { label: 'Conversations', value: String(data.conversations), sub: data.unread ? `${data.unread} unread` : 'all caught up' },
    { label: 'Automations run (24h)', value: String(data.automationRuns24h), sub: data.automationFails24h ? `${data.automationFails24h} failed` : 'no failures' },
  ]

  // 7. AI briefing (Groq) — narrative over the real numbers; never throws
  const prompt = `You are the daily briefing assistant for "${businessName || 'this business'}" inside their AI CRM.
Here is their REAL account activity in the last 24 hours (JSON): ${JSON.stringify(data)}.
Open issues: ${JSON.stringify(issues.map((i) => i.title))}.
Write a concise, energetic 2–3 sentence morning briefing. Lead with what matters most, cite the specific numbers, and if there are issues, nudge them to act. No greetings like "Good morning", no markdown, no lists — just the briefing prose.`
  const ai = await askAI(prompt, { maxTokens: 220, temperature: 0.4, fallbackText: '' })
  let summary = ai.text?.trim() || ''
  if (!summary) {
    summary = data.newContacts24h
      ? `${data.newContacts24h} new contact${data.newContacts24h > 1 ? 's' : ''} came in over the last 24 hours, with ${data.opportunities} open opportunities worth $${data.pipelineValue.toLocaleString()}. ${issues.length ? `${issues.length} item${issues.length > 1 ? 's' : ''} need your attention below.` : 'Everything looks healthy.'}`
      : `Quiet last 24 hours — no new contacts yet. ${issues.length ? `${issues.length} item${issues.length > 1 ? 's' : ''} below could help you get moving.` : 'Your workspace is healthy and ready.'}`
  }

  // 8. Actions (from issues + a default)
  const actions = issues.slice(0, 3).map((i) => ({ title: i.cta || i.title, href: i.href || '/dashboard' }))
  if (actions.length < 3) actions.push({ title: 'Open your pipeline', href: '/dashboard/pipeline' })

  // 9. Cache for today
  await db.from('daily_recaps').upsert({ user_id: userId, recap_date: date, summary, highlights, issues, actions, data }, { onConflict: 'user_id,recap_date' })
  await db.from('profiles').update({ last_recap_at: new Date().toISOString() }).eq('id', userId)

  return NextResponse.json({ cached: false, businessName, date, summary, highlights, issues, actions, data, aiSource: ai.source })
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await admin().from('profiles').update({ last_recap_at: new Date().toISOString() }).eq('id', ctx.userId)
  return NextResponse.json({ ok: true })
}
