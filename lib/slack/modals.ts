/**
 * Modal builders + submit dispatchers — 6 flows per
 * docs/slack-phase-2-interactive-spec.md §"MODAL FLOWS".
 *
 * Each flow exposes:
 *   - openX(triggerId, teamId, prefill?)        — initial views.open
 *   - handleXSubmit(payload)                    — view_submission router
 *
 * Long-running work (Groq, scanner) should ack the submit immediately and
 * follow up with views.update or a DM. For Phase 2A the submit-then-DM path
 * is wired; in-place views.update can be added per-flow as needed.
 */

import { openModal } from './client'
import {
  scoreBlock,
  resultBlock,
  type Block,
} from './block-patterns'
import type { OnCoreCaller } from './auth'

// ─── Shared types ────────────────────────────────────────────────────────────
type ViewState = { values: Record<string, Record<string, ViewElement>> }
type ViewElement = {
  value?: string
  selected_option?: { value: string }
  selected_options?: Array<{ value: string }>
  selected_date_time?: number
  selected_users?: string[]
  rich_text_value?: { elements: unknown[] }
}

export interface ViewSubmissionPayload {
  type: 'view_submission'
  user?: { id: string; team_id?: string }
  team?: { id: string }
  view?: {
    callback_id?: string
    state?: ViewState
    private_metadata?: string
  }
}

export interface ModalContext {
  caller: OnCoreCaller
  teamId: string
  triggerId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function plainTextInput(args: {
  block_id: string
  action_id: string
  label: string
  placeholder?: string
  multiline?: boolean
  initial?: string
  optional?: boolean
}): Block {
  return {
    type: 'input',
    block_id: args.block_id,
    optional: !!args.optional,
    label: { type: 'plain_text', text: args.label },
    element: {
      type: 'plain_text_input',
      action_id: args.action_id,
      multiline: !!args.multiline,
      ...(args.initial ? { initial_value: args.initial } : {}),
      ...(args.placeholder ? { placeholder: { type: 'plain_text', text: args.placeholder } } : {}),
    },
  }
}

function staticSelect(args: {
  block_id: string
  action_id: string
  label: string
  options: Array<{ value: string; label: string }>
  initial_value?: string
}): Block {
  const options = args.options.map((o) => ({
    text: { type: 'plain_text', text: o.label },
    value: o.value,
  }))
  return {
    type: 'input',
    block_id: args.block_id,
    label: { type: 'plain_text', text: args.label },
    element: {
      type: 'static_select',
      action_id: args.action_id,
      options,
      ...(args.initial_value
        ? {
            initial_option: options.find((o) => o.value === args.initial_value),
          }
        : {}),
    },
  }
}

function checkboxes(args: {
  block_id: string
  action_id: string
  label: string
  options: Array<{ value: string; label: string }>
  initial?: string[]
}): Block {
  const options = args.options.map((o) => ({
    text: { type: 'plain_text', text: o.label },
    value: o.value,
  }))
  return {
    type: 'input',
    block_id: args.block_id,
    optional: true,
    label: { type: 'plain_text', text: args.label },
    element: {
      type: 'checkboxes',
      action_id: args.action_id,
      options,
      ...(args.initial?.length
        ? { initial_options: options.filter((o) => args.initial!.includes(o.value)) }
        : {}),
    },
  }
}

function readState(payload: ViewSubmissionPayload, blockId: string, actionId: string): ViewElement | null {
  return payload.view?.state?.values?.[blockId]?.[actionId] ?? null
}

// ─── Modal 1: VPIS Scorer ────────────────────────────────────────────────────
export async function openScorerModal(
  ctx: ModalContext,
  prefill?: { text?: string; tone?: string; channel?: string; messageTs?: string },
): Promise<void> {
  const view = {
    type: 'modal',
    callback_id: 'modal_scorer_input',
    private_metadata: JSON.stringify({
      channel: prefill?.channel || '',
      messageTs: prefill?.messageTs || '',
    }),
    title: { type: 'plain_text', text: 'Score with VPIS' },
    submit: { type: 'plain_text', text: 'Score' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      plainTextInput({
        block_id: 'b_text',
        action_id: 'text',
        label: 'Text',
        multiline: true,
        initial: prefill?.text,
        placeholder: 'Paste the post, reply, or message you want scored',
      }),
      staticSelect({
        block_id: 'b_tone',
        action_id: 'tone',
        label: 'Tone',
        options: [
          { value: 'professional', label: 'Professional' },
          { value: 'casual', label: 'Casual' },
          { value: 'technical', label: 'Technical' },
        ],
        initial_value: prefill?.tone || 'professional',
      }),
    ],
  }
  await openModal(ctx.triggerId, view, { teamId: ctx.teamId })
}

export interface ScorerSubmitInputs {
  text: string
  tone: string
  channel: string
  messageTs: string
}

export function readScorerSubmit(payload: ViewSubmissionPayload): ScorerSubmitInputs | null {
  const text = readState(payload, 'b_text', 'text')?.value || ''
  const tone = readState(payload, 'b_tone', 'tone')?.selected_option?.value || 'professional'
  if (!text.trim()) return null
  let meta: { channel?: string; messageTs?: string } = {}
  try { meta = JSON.parse(payload.view?.private_metadata || '{}') } catch { /* */ }
  return { text, tone, channel: meta.channel || '', messageTs: meta.messageTs || '' }
}

export function scorerResultBlocks(args: {
  score: number
  factors: Array<{ key: string; value: number | string }>
  patterns?: string[]
}): Block[] {
  return scoreBlock({
    score: args.score,
    factors: args.factors,
    patterns: args.patterns,
    actions: [
      { text: 'Copy text', action_id: 'scorer_copy', style: 'primary' },
      { text: 'Post to LinkedIn', action_id: 'scorer_post_linkedin' },
      { text: 'Score Another', action_id: 'home_quick_scorer' },
    ],
  })
}

// ─── Modal 2: Stack Scanner ──────────────────────────────────────────────────
export async function openScannerModal(ctx: ModalContext, prefill?: { url?: string }): Promise<void> {
  const view = {
    type: 'modal',
    callback_id: 'modal_scanner_input',
    title: { type: 'plain_text', text: 'Stack Scanner' },
    submit: { type: 'plain_text', text: 'Scan' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      plainTextInput({
        block_id: 'b_url',
        action_id: 'url',
        label: 'URL',
        initial: prefill?.url,
        placeholder: 'https://example.com',
      }),
    ],
  }
  await openModal(ctx.triggerId, view, { teamId: ctx.teamId })
}

export function readScannerSubmit(payload: ViewSubmissionPayload): { url: string } | null {
  const url = readState(payload, 'b_url', 'url')?.value || ''
  if (!url.trim()) return null
  return { url: url.trim() }
}

// ─── Modal 3: CRM Search ─────────────────────────────────────────────────────
export async function openCrmSearchModal(ctx: ModalContext, prefill?: { q?: string }): Promise<void> {
  const view = {
    type: 'modal',
    callback_id: 'modal_crm_input',
    title: { type: 'plain_text', text: 'Search CRM' },
    submit: { type: 'plain_text', text: 'Search' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      plainTextInput({
        block_id: 'b_q',
        action_id: 'q',
        label: 'Query',
        initial: prefill?.q,
        placeholder: 'name / email / phone',
      }),
      staticSelect({
        block_id: 'b_filter',
        action_id: 'filter',
        label: 'Filter',
        options: [
          { value: 'all', label: 'All' },
          { value: 'contacts', label: 'Contacts' },
          { value: 'opportunities', label: 'Opportunities' },
        ],
        initial_value: 'all',
      }),
    ],
  }
  await openModal(ctx.triggerId, view, { teamId: ctx.teamId })
}

export function readCrmSearchSubmit(payload: ViewSubmissionPayload): { q: string; filter: string } | null {
  const q = readState(payload, 'b_q', 'q')?.value || ''
  const filter = readState(payload, 'b_filter', 'filter')?.selected_option?.value || 'all'
  if (!q.trim()) return null
  return { q: q.trim(), filter }
}

export function crmResultsBlocks(items: Array<{ id: string; title: string; subtitle?: string; meta?: string[] }>): Block[] {
  return resultBlock({
    title: 'CRM Results',
    items: items.map((it) => ({
      title: it.title,
      body: it.subtitle,
      meta: it.meta,
      accessory: {
        type: 'overflow',
        action_id: `crm_overflow:${it.id}`,
        options: [
          { text: { type: 'plain_text', text: 'View' }, value: `view:${it.id}` },
          { text: { type: 'plain_text', text: 'Edit' }, value: `edit:${it.id}` },
          { text: { type: 'plain_text', text: 'Add note' }, value: `note:${it.id}` },
          { text: { type: 'plain_text', text: 'Create task' }, value: `task:${it.id}` },
        ],
      },
    })),
  })
}

// ─── Modal 4: Post Generator ─────────────────────────────────────────────────
export async function openPostGeneratorModal(
  ctx: ModalContext,
  prefill?: { topic?: string; platform?: 'linkedin' | 'twitter' },
): Promise<void> {
  const view = {
    type: 'modal',
    callback_id: 'modal_post_input',
    title: { type: 'plain_text', text: 'Generate Post' },
    submit: { type: 'plain_text', text: 'Generate' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      plainTextInput({
        block_id: 'b_topic',
        action_id: 'topic',
        label: 'Topic',
        multiline: true,
        initial: prefill?.topic,
      }),
      staticSelect({
        block_id: 'b_tone',
        action_id: 'tone',
        label: 'Tone',
        options: [
          { value: 'professional', label: 'Professional' },
          { value: 'casual', label: 'Casual' },
          { value: 'bold', label: 'Bold' },
          { value: 'educational', label: 'Educational' },
        ],
        initial_value: 'professional',
      }),
      checkboxes({
        block_id: 'b_platform',
        action_id: 'platform',
        label: 'Platform',
        options: [
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'twitter', label: 'Twitter' },
        ],
        initial: prefill?.platform ? [prefill.platform] : ['linkedin'],
      }),
    ],
  }
  await openModal(ctx.triggerId, view, { teamId: ctx.teamId })
}

export function readPostSubmit(payload: ViewSubmissionPayload): { topic: string; tone: string; platforms: string[] } | null {
  const topic = readState(payload, 'b_topic', 'topic')?.value || ''
  const tone = readState(payload, 'b_tone', 'tone')?.selected_option?.value || 'professional'
  const platforms =
    readState(payload, 'b_platform', 'platform')?.selected_options?.map((o) => o.value) || ['linkedin']
  if (!topic.trim()) return null
  return { topic, tone, platforms }
}

// ─── Modal 5: 0nExec Quick Action ────────────────────────────────────────────
export async function openExecActionModal(
  ctx: ModalContext,
  card: { id: string; company: string; dept: string; daysInStage: number; contact: string; value: string; assignedTo: string },
): Promise<void> {
  const view = {
    type: 'modal',
    callback_id: 'modal_exec_action',
    private_metadata: JSON.stringify({ cardId: card.id }),
    title: { type: 'plain_text', text: '0nExec Action' },
    submit: { type: 'plain_text', text: 'Apply' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `${card.company} — ${card.dept}` } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*Contact:* ${card.contact}\n` +
            `*Value:* ${card.value}\n` +
            `*Days in stage:* ${card.daysInStage}\n` +
            `*Assigned to:* ${card.assignedTo}`,
        },
      },
      { type: 'divider' },
      {
        type: 'input',
        block_id: 'b_action',
        label: { type: 'plain_text', text: 'Action' },
        element: {
          type: 'static_select',
          action_id: 'action',
          options: [
            { text: { type: 'plain_text', text: 'Reassign' }, value: 'reassign' },
            { text: { type: 'plain_text', text: 'Escalate' }, value: 'escalate' },
            { text: { type: 'plain_text', text: 'Add note' }, value: 'note' },
            { text: { type: 'plain_text', text: 'Move stage' }, value: 'move_stage' },
            { text: { type: 'plain_text', text: 'Snooze' }, value: 'snooze' },
          ],
        },
      },
      plainTextInput({
        block_id: 'b_note',
        action_id: 'note',
        label: 'Note (optional)',
        multiline: true,
        optional: true,
      }),
    ],
  }
  await openModal(ctx.triggerId, view, { teamId: ctx.teamId })
}

export function readExecActionSubmit(payload: ViewSubmissionPayload): { cardId: string; action: string; note: string } | null {
  let cardId = ''
  try { cardId = (JSON.parse(payload.view?.private_metadata || '{}').cardId as string) || '' } catch { /* */ }
  const action = readState(payload, 'b_action', 'action')?.selected_option?.value || ''
  const note = readState(payload, 'b_note', 'note')?.value || ''
  if (!cardId || !action) return null
  return { cardId, action, note }
}

// ─── Modal 6: Settings ───────────────────────────────────────────────────────
export interface HomePreferences {
  notifications: { critical_alerts: boolean; daily_digest: boolean; fast_completions: boolean }
  default_tone: string
}

export const DEFAULT_HOME_PREFERENCES: HomePreferences = {
  notifications: { critical_alerts: true, daily_digest: false, fast_completions: true },
  default_tone: 'professional',
}

export async function openSettingsModal(
  ctx: ModalContext,
  prefs: HomePreferences = DEFAULT_HOME_PREFERENCES,
): Promise<void> {
  const initialNotifs: string[] = []
  if (prefs.notifications.critical_alerts) initialNotifs.push('critical_alerts')
  if (prefs.notifications.daily_digest) initialNotifs.push('daily_digest')
  if (prefs.notifications.fast_completions) initialNotifs.push('fast_completions')

  const view = {
    type: 'modal',
    callback_id: 'modal_settings',
    title: { type: 'plain_text', text: 'Settings' },
    submit: { type: 'plain_text', text: 'Save' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      checkboxes({
        block_id: 'b_notifs',
        action_id: 'notifications',
        label: 'Notifications',
        options: [
          { value: 'critical_alerts', label: 'Critical alerts' },
          { value: 'daily_digest', label: 'Daily digest' },
          { value: 'fast_completions', label: 'Fast completions' },
        ],
        initial: initialNotifs,
      }),
      staticSelect({
        block_id: 'b_tone',
        action_id: 'default_tone',
        label: 'Default tone',
        options: [
          { value: 'professional', label: 'Professional' },
          { value: 'casual', label: 'Casual' },
          { value: 'technical', label: 'Technical' },
          { value: 'bold', label: 'Bold' },
        ],
        initial_value: prefs.default_tone,
      }),
    ],
  }
  await openModal(ctx.triggerId, view, { teamId: ctx.teamId })
}

export function readSettingsSubmit(payload: ViewSubmissionPayload): HomePreferences {
  const notifs = readState(payload, 'b_notifs', 'notifications')?.selected_options?.map((o) => o.value) || []
  const tone = readState(payload, 'b_tone', 'default_tone')?.selected_option?.value || 'professional'
  return {
    notifications: {
      critical_alerts: notifs.includes('critical_alerts'),
      daily_digest: notifs.includes('daily_digest'),
      fast_completions: notifs.includes('fast_completions'),
    },
    default_tone: tone,
  }
}
