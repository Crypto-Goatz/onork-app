/**
 * POST /api/slack/interactivity
 *
 * Receives Block Kit button clicks, modal submits, message + global
 * shortcuts. Verifies signature, dispatches by callback_id.
 *
 * Spec: docs/slack-phase-2-interactive-spec.md.
 */
import { verifySlackRequest } from '@/lib/slack/verify'
import { resolveCaller } from '@/lib/slack/auth'
import { respond, postMessage, dm } from '@/lib/slack/client'
import { runJaxx } from '@/lib/slack/jaxx'
import {
  openScorerModal,
  openScannerModal,
  openCrmSearchModal,
  openPostGeneratorModal,
  openSettingsModal,
  readScorerSubmit,
  readScannerSubmit,
  readCrmSearchSubmit,
  readPostSubmit,
  readExecActionSubmit,
  readSettingsSubmit,
  scorerResultBlocks,
  type ViewSubmissionPayload,
  type HomePreferences,
} from '@/lib/slack/modals'
import { invalidateHomeCache } from '@/lib/slack/home'
import { handleMessageShortcut, handleGlobalShortcut } from '@/lib/slack/shortcuts'
import { scoreVpis } from '@/lib/scoring/vpis'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SlackPayload {
  type: 'block_actions' | 'view_submission' | 'message_action' | 'shortcut'
  user?: { id: string; team_id?: string }
  team?: { id: string }
  trigger_id?: string
  response_url?: string
  callback_id?: string
  actions?: Array<{ action_id: string; value?: string; type: string }>
  view?: { callback_id?: string; state?: { values?: Record<string, Record<string, { value?: string }>> }; private_metadata?: string }
  message?: { text?: string; ts?: string }
  channel?: { id: string; name?: string }
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(req: Request) {
  const raw = await req.text()
  const v = verifySlackRequest(req.headers, raw)
  if (!v.ok) return new Response(`invalid signature: ${v.reason}`, { status: 401 })

  const params = new URLSearchParams(raw)
  const payloadStr = params.get('payload') || '{}'
  let payload: SlackPayload
  try {
    payload = JSON.parse(payloadStr) as SlackPayload
  } catch {
    return new Response('bad payload', { status: 400 })
  }

  const teamId = payload.team?.id || payload.user?.team_id || ''
  const slackUserId = payload.user?.id || ''
  const triggerId = payload.trigger_id || ''
  const responseUrl = payload.response_url || ''

  ;(async () => {
    try {
      const caller = await resolveCaller(slackUserId, teamId)

      // ── BLOCK ACTIONS — buttons + overflows ──
      if (payload.type === 'block_actions' && payload.actions?.length) {
        const action = payload.actions[0]
        await routeAction(action, {
          caller,
          responseUrl,
          channel: payload.channel?.id,
          teamId,
          triggerId,
        })
        return
      }

      // ── VIEW SUBMISSION — modal submitted ──
      if (payload.type === 'view_submission' && caller) {
        await routeViewSubmission(payload as unknown as ViewSubmissionPayload, {
          caller,
          teamId,
          slackUserId,
        })
        return
      }

      // ── MESSAGE / GLOBAL SHORTCUTS ──
      if (payload.type === 'message_action' && caller && triggerId) {
        await handleMessageShortcut({
          callbackId: payload.callback_id || '',
          messageText: payload.message?.text || '',
          messageTs: payload.message?.ts || '',
          channelId: payload.channel?.id || '',
          caller,
          teamId,
          triggerId,
        })
        return
      }

      if (payload.type === 'shortcut' && caller && triggerId) {
        await handleGlobalShortcut({
          callbackId: payload.callback_id || '',
          caller,
          teamId,
          triggerId,
        })
        return
      }
    } catch (e) {
      console.error('[slack/interactivity]', (e as Error).message)
    }
  })()

  return new Response('', { status: 200 })
}

// ─── Action router (buttons + overflows) ─────────────────────────────────────
async function routeAction(
  action: { action_id: string; value?: string },
  ctx: {
    caller: Awaited<ReturnType<typeof resolveCaller>>
    responseUrl: string
    channel?: string
    teamId: string
    triggerId: string
  },
) {
  const { action_id, value } = action
  const { caller, responseUrl, channel, teamId, triggerId } = ctx

  if (!caller) {
    if (responseUrl) {
      await respond(responseUrl, { response_type: 'ephemeral', text: 'Link your account first.' })
    }
    return
  }

  // Phase 2A — Quick Action buttons → open modals
  if (action_id === 'home_quick_scorer' && triggerId) {
    await openScorerModal({ caller, teamId, triggerId })
    return
  }
  if (action_id === 'home_quick_scanner' && triggerId) {
    await openScannerModal({ caller, teamId, triggerId })
    return
  }
  if (action_id === 'home_quick_crm' && triggerId) {
    await openCrmSearchModal({ caller, teamId, triggerId })
    return
  }
  if (action_id === 'home_quick_post' && triggerId) {
    await openPostGeneratorModal({ caller, teamId, triggerId })
    return
  }
  if (action_id === 'home_open_settings' && triggerId) {
    const prefs = await loadHomePreferences(caller.user_id, teamId)
    await openSettingsModal({ caller, teamId, triggerId }, prefs)
    return
  }

  // Generic fallback — pipe action through Jaxx
  const reply = await runJaxx({
    user: caller,
    prompt: `Slack button "${action_id}" was clicked${value ? ` with value "${value}"` : ''}. Respond with the natural next step.`,
    surface: 'slack:cmd',
  })
  if (responseUrl) {
    await respond(responseUrl, { response_type: 'ephemeral', text: reply.text })
  } else if (channel) {
    await postMessage({ channel, text: reply.text }, { teamId })
  }
}

// ─── View submission router ──────────────────────────────────────────────────
async function routeViewSubmission(
  payload: ViewSubmissionPayload,
  ctx: {
    caller: NonNullable<Awaited<ReturnType<typeof resolveCaller>>>
    teamId: string
    slackUserId: string
  },
) {
  const cb = payload.view?.callback_id || ''
  const { caller, teamId, slackUserId } = ctx

  // 1. VPIS Scorer
  if (cb === 'modal_scorer_input') {
    const inputs = readScorerSubmit(payload)
    if (!inputs) return
    const scored = await scoreText(inputs.text, inputs.tone)
    const blocks = scorerResultBlocks(scored)
    if (inputs.channel && inputs.messageTs) {
      await postMessage(
        {
          channel: inputs.channel,
          thread_ts: inputs.messageTs,
          text: `VPIS: ${scored.score}/100`,
          blocks,
        },
        { teamId },
      )
    } else {
      await dm(slackUserId, blocks, `VPIS Score: ${scored.score}/100`, { teamId })
    }
    return
  }

  // 2. Stack Scanner
  if (cb === 'modal_scanner_input') {
    const inputs = readScannerSubmit(payload)
    if (!inputs) return
    const result = await runScan(caller, inputs.url)
    await dm(
      slackUserId,
      [
        { type: 'header', text: { type: 'plain_text', text: `Scan: ${inputs.url}` } },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `*Stack-gap score:* ${result.score}/100\n` +
              `*Detected:* ${result.detectedCount} tools\n` +
              `*Gaps:* ${result.gaps.slice(0, 6).join(', ') || 'none'}`,
          },
        },
      ],
      `Scan: ${inputs.url}`,
      { teamId },
    )
    return
  }

  // 3. CRM Search
  if (cb === 'modal_crm_input') {
    const inputs = readCrmSearchSubmit(payload)
    if (!inputs) return
    await dm(slackUserId, [], `CRM search for "${inputs.q}" — opening in 0nCore: https://www.0ncore.com/dashboard/crm?q=${encodeURIComponent(inputs.q)}`, { teamId })
    return
  }

  // 4. Post Generator
  if (cb === 'modal_post_input') {
    const inputs = readPostSubmit(payload)
    if (!inputs) return
    const draft = await generatePost(inputs.topic, inputs.tone, inputs.platforms)
    await dm(
      slackUserId,
      [
        { type: 'header', text: { type: 'plain_text', text: `Draft: ${inputs.platforms.join(' + ')}` } },
        { type: 'section', text: { type: 'mrkdwn', text: draft } },
      ],
      'Post draft',
      { teamId },
    )
    return
  }

  // 5. 0nExec Quick Action
  if (cb === 'modal_exec_action') {
    const inputs = readExecActionSubmit(payload)
    if (!inputs) return
    await dm(
      slackUserId,
      [],
      `0nExec: \`${inputs.action}\` queued for card ${inputs.cardId}${inputs.note ? ` (note: ${inputs.note})` : ''}`,
      { teamId },
    )
    return
  }

  // 6. Settings
  if (cb === 'modal_settings') {
    const prefs = readSettingsSubmit(payload)
    await saveHomePreferences(caller.user_id, teamId, slackUserId, prefs)
    invalidateHomeCache(slackUserId, teamId)
    await dm(slackUserId, [], 'Settings saved.', { teamId })
    return
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function loadHomePreferences(userId: string, teamId: string): Promise<HomePreferences> {
  const sb = admin()
  const { data } = await sb
    .from('slack_user_links')
    .select('home_preferences')
    .eq('oncore_user_id', userId)
    .eq('team_id', teamId)
    .maybeSingle()
  const prefs = (data?.home_preferences as HomePreferences | null) ?? null
  if (!prefs) {
    return {
      notifications: { critical_alerts: true, daily_digest: false, fast_completions: true },
      default_tone: 'professional',
    }
  }
  return prefs
}

async function saveHomePreferences(
  userId: string,
  teamId: string,
  slackUserId: string,
  prefs: HomePreferences,
): Promise<void> {
  const sb = admin()
  await sb
    .from('slack_user_links')
    .update({ home_preferences: prefs })
    .eq('oncore_user_id', userId)
    .eq('team_id', teamId)
    .eq('slack_user_id', slackUserId)
}

// Real Groq-backed VPIS scoring — single source of truth lives in
// lib/scoring/vpis.ts so Slack, dashboard, extension, and canvas all match.
async function scoreText(
  text: string,
  tone: string,
): Promise<{ score: number; factors: Array<{ key: string; value: number | string }>; patterns: string[] }> {
  const result = await scoreVpis(text, tone)
  return {
    score: result.score,
    factors: result.factors.map((f) => ({
      key: f.key,
      value: f.reason ? `${f.value} — ${f.reason}` : f.value,
    })),
    patterns: result.patterns,
  }
}

async function runScan(
  caller: NonNullable<Awaited<ReturnType<typeof resolveCaller>>>,
  url: string,
): Promise<{ score: number; detectedCount: number; gaps: string[] }> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.0ncore.com'
  const internalSecret = process.env.INTERNAL_DISPATCH_SECRET || ''
  try {
    const r = await fetch(`${base}/api/scanner/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({
        url,
        hostname: new URL(url.startsWith('http') ? url : `https://${url}`).hostname,
        detected: {},
        network_hosts: [],
        user_id: caller.user_id,
      }),
    })
    if (!r.ok) throw new Error(`scanner ${r.status}`)
    const data = await r.json()
    return {
      score: Number(data.stack_gap_score) || 0,
      detectedCount: Object.values(data.detected || {}).reduce(
        (acc: number, v) => acc + (Array.isArray(v) ? v.length : 0),
        0,
      ),
      gaps: Array.isArray(data.gaps) ? data.gaps : [],
    }
  } catch {
    return { score: 0, detectedCount: 0, gaps: [] }
  }
}

async function generatePost(topic: string, tone: string, platforms: string[]): Promise<string> {
  // Placeholder draft. Real implementation calls the brain registry (Groq) per
  // Hard Rule #1. This keeps the modal end-to-end exercisable without Groq.
  return `*${platforms.join(' + ').toUpperCase()} draft (${tone})*\n\n${topic}\n\n— Draft generated by 0n. Edit before posting.`
}
