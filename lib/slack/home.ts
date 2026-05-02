/**
 * App Home view — renders + publishes a personalized dashboard for one Slack
 * user. Re-published on every `app_home_opened`. 30s in-memory cache per user
 * to avoid hammering DB + CRM when the user toggles the home tab repeatedly.
 *
 * Spec: docs/slack-phase-2-interactive-spec.md §"APP HOME TAB".
 */

import { createClient } from '@supabase/supabase-js'
import { publishHome as slackPublishHome } from './client'
import { resolveCaller } from './auth'
import {
  header,
  section,
  context,
  divider,
  actionsRow,
  button,
  alertBlock,
  type Block,
  type AlertSeverity,
} from './block-patterns'

const HOME_CACHE_MS = 30_000
type CacheEntry = { blocks: Block[]; expiresAt: number }
const homeCache = new Map<string, CacheEntry>()

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'just now'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

interface HomeData {
  caller: NonNullable<Awaited<ReturnType<typeof resolveCaller>>>
  vpisHistory: Array<{ id: string; score: number; excerpt: string; created_at: string }>
  scans: Array<{ id: string; hostname: string; gaps: string[]; stack_gap_score: number }>
  gigs: Array<{ id: string; name: string; updated_at: string }>
  execAlerts: Array<{ id: string; severity: AlertSeverity; dept: string; days: number; company: string; contact: string; value: string; assignedTo: string }>
  execCounts: { critical: number; warning: number; ontrack: number }
  services: { crm: boolean; slack: boolean; linkedin: boolean; groq: boolean; analytics: boolean; fiverr: boolean }
}

async function loadHomeData(slackUserId: string, teamId: string): Promise<HomeData | null> {
  const caller = await resolveCaller(slackUserId, teamId)
  if (!caller) return null

  const sb = admin()

  // VPIS history (table may not exist on every install; soft-fail to empty)
  const vpisHistory: HomeData['vpisHistory'] = []
  try {
    const { data } = await sb
      .from('vpis_history')
      .select('id, score, excerpt, created_at')
      .eq('user_id', caller.user_id)
      .order('created_at', { ascending: false })
      .limit(3)
    if (Array.isArray(data)) {
      for (const r of data) {
        vpisHistory.push({
          id: String(r.id),
          score: Number(r.score) || 0,
          excerpt: String(r.excerpt || '').slice(0, 120),
          created_at: r.created_at as string,
        })
      }
    }
  } catch { /* table optional */ }

  // Recent stack scans
  const scans: HomeData['scans'] = []
  try {
    const { data } = await sb
      .from('stack_scans')
      .select('id, hostname, gaps, stack_gap_score')
      .eq('user_id', caller.user_id)
      .order('created_at', { ascending: false })
      .limit(3)
    if (Array.isArray(data)) {
      for (const r of data) {
        scans.push({
          id: String(r.id),
          hostname: String(r.hostname || ''),
          gaps: Array.isArray(r.gaps) ? (r.gaps as string[]) : [],
          stack_gap_score: Number(r.stack_gap_score) || 0,
        })
      }
    }
  } catch { /* */ }

  // Active fiverr templates
  const gigs: HomeData['gigs'] = []
  try {
    const { data } = await sb
      .from('fiverr_templates')
      .select('id, name, updated_at')
      .eq('user_id', caller.user_id)
      .order('updated_at', { ascending: false })
      .limit(3)
    if (Array.isArray(data)) {
      for (const r of data) {
        gigs.push({
          id: String(r.id),
          name: String(r.name || 'Untitled gig'),
          updated_at: r.updated_at as string,
        })
      }
    }
  } catch { /* */ }

  // Exec alerts (Phase 2 reads top 3 critical only)
  const execAlerts: HomeData['execAlerts'] = []
  const execCounts = { critical: 0, warning: 0, ontrack: 0 }
  try {
    const { data } = await sb
      .from('exec_columns')
      .select('id, severity, dept, days_in_stage, company, contact, value, assigned_to')
      .eq('user_id', caller.user_id)
      .order('days_in_stage', { ascending: false })
      .limit(50)
    if (Array.isArray(data)) {
      for (const row of data) {
        const sev = (row.severity as AlertSeverity) || 'ontrack'
        if (sev === 'critical') execCounts.critical++
        else if (sev === 'warning') execCounts.warning++
        else execCounts.ontrack++
        if (sev === 'critical' && execAlerts.length < 3) {
          execAlerts.push({
            id: String(row.id),
            severity: sev,
            dept: String(row.dept || '—'),
            days: Number(row.days_in_stage) || 0,
            company: String(row.company || ''),
            contact: String(row.contact || ''),
            value: String(row.value || ''),
            assignedTo: String(row.assigned_to || ''),
          })
        }
      }
    }
  } catch { /* */ }

  // Connected services
  let crmConnected = false
  try {
    const { count } = await sb
      .from('crm_installations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', caller.user_id)
      .eq('active', true)
    crmConnected = (count ?? 0) > 0
  } catch { /* */ }

  return {
    caller,
    vpisHistory,
    scans,
    gigs,
    execAlerts,
    execCounts,
    services: {
      crm: crmConnected,
      slack: true,
      linkedin: false,
      groq: !!process.env.GROQ_API_KEY,
      analytics: false,
      fiverr: gigs.length > 0,
    },
  }
}

function buildHomeBlocks(data: HomeData): Block[] {
  const { caller } = data
  const firstName = (caller.full_name || caller.email || 'there').split(' ')[0]
  const planBadge = caller.plan ? caller.plan.toUpperCase() : 'FREE'
  const lastActive = relativeTime(null)
  const blocks: Block[] = []

  // 1. Welcome
  blocks.push(header(`Welcome back, ${firstName}`))
  blocks.push(context(`*${planBadge}*`, `Last active ${lastActive}`))
  blocks.push(divider())

  // 2. Quick Actions
  blocks.push(
    actionsRow([
      button({ text: 'Score Text', action_id: 'home_quick_scorer', style: 'primary' }),
      button({ text: 'Scan URL', action_id: 'home_quick_scanner' }),
      button({ text: 'Search CRM', action_id: 'home_quick_crm' }),
      button({ text: 'Generate Post', action_id: 'home_quick_post' }),
    ]),
  )
  blocks.push(divider())

  // 3. Company Pulse — only if exec alerts exist
  if (data.execAlerts.length > 0 || data.execCounts.critical + data.execCounts.warning > 0) {
    blocks.push(header('Company Pulse'))
    blocks.push(
      section(
        `*${data.execCounts.critical}* critical · *${data.execCounts.warning}* warning · *${data.execCounts.ontrack}* on track`,
      ),
    )
    for (const alert of data.execAlerts) {
      blocks.push(
        ...alertBlock({
          severity: alert.severity,
          dept: alert.dept,
          daysInStage: alert.days,
          company: alert.company,
          contact: alert.contact,
          value: alert.value,
          assignedTo: alert.assignedTo,
          cardId: alert.id,
        }),
      )
    }
  }

  // 4. Recent VPIS Scores
  if (data.vpisHistory.length > 0) {
    blocks.push(header('Recent VPIS Scores'))
    for (const v of data.vpisHistory) {
      blocks.push(
        section(`*${v.score}/100* · ${v.excerpt || '(no excerpt)'}`),
      )
      blocks.push(context(relativeTime(v.created_at)))
    }
    blocks.push(
      actionsRow([button({ text: 'Score New', action_id: 'home_quick_scorer', style: 'primary' })]),
    )
    blocks.push(divider())
  }

  // 5. Connected Services
  blocks.push(header('Connected Services'))
  const dot = (on: boolean) => (on ? ':large_green_circle:' : ':white_circle:')
  blocks.push(
    section(
      [
        `${dot(data.services.crm)} *CRM*`,
        `${dot(data.services.slack)} *Slack*`,
        `${dot(data.services.linkedin)} *LinkedIn*`,
      ].join('  ·  ') +
        '\n' +
        [
          `${dot(data.services.groq)} *Groq*`,
          `${dot(data.services.analytics)} *Analytics*`,
          `${dot(data.services.fiverr)} *Fiverr*`,
        ].join('  ·  '),
    ),
  )
  blocks.push(
    actionsRow([
      button({
        text: 'Manage connections',
        action_id: 'home_open_connections',
        url: 'https://www.0ncore.com/welcome',
      }),
    ]),
  )
  blocks.push(divider())

  // 6. Active Fiverr Gigs
  if (data.gigs.length > 0) {
    blocks.push(header('Active Fiverr Gigs'))
    for (const g of data.gigs) {
      blocks.push(section(`*${g.name}*\nupdated ${relativeTime(g.updated_at)}`))
    }
    blocks.push(
      actionsRow([button({ text: 'Generate New Gig', action_id: 'home_quick_post', style: 'primary' })]),
    )
    blocks.push(divider())
  }

  // 7. Recent Scans
  if (data.scans.length > 0) {
    blocks.push(header('Recent Scans'))
    for (const s of data.scans) {
      blocks.push(
        section(
          `*${s.hostname}* · gap-score ${s.stack_gap_score} · ${s.gaps.length} gaps`,
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Report' },
            action_id: `home_view_scan:${s.id}`,
            value: s.id,
          },
        ),
      )
    }
    blocks.push(divider())
  }

  // 8. Settings
  blocks.push(
    actionsRow([
      button({ text: 'Settings', action_id: 'home_open_settings' }),
    ]),
  )

  return blocks
}

export async function publishHome(slackUserId: string, teamId: string): Promise<void> {
  const cacheKey = `${teamId}:${slackUserId}`
  const cached = homeCache.get(cacheKey)
  let blocks: Block[]

  if (cached && cached.expiresAt > Date.now()) {
    blocks = cached.blocks
  } else {
    const data = await loadHomeData(slackUserId, teamId)
    if (!data) {
      // Not linked yet — show a connect prompt
      blocks = [
        header('Welcome to 0nCore'),
        section(
          "We couldn't match your Slack identity to a 0nCore account.\nFinish linking by signing in with the same email used here.",
        ),
        actionsRow([
          button({
            text: 'Open 0nCore',
            action_id: 'home_open_oncore',
            url: 'https://www.0ncore.com/welcome',
            style: 'primary',
          }),
        ]),
      ]
    } else {
      blocks = buildHomeBlocks(data)
    }
    homeCache.set(cacheKey, { blocks, expiresAt: Date.now() + HOME_CACHE_MS })
  }

  await slackPublishHome(
    slackUserId,
    { type: 'home', blocks },
    { teamId },
  )
}

export function invalidateHomeCache(slackUserId: string, teamId: string): void {
  homeCache.delete(`${teamId}:${slackUserId}`)
}
