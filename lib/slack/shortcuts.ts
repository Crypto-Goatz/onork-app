/**
 * Slack shortcut handlers — message-action (right-click on a message) and
 * global (lightning-bolt menu). Spec: docs/slack-phase-2-interactive-spec.md
 * §"MESSAGE SHORTCUTS" + "GLOBAL SHORTCUTS".
 *
 * Each shortcut either opens a modal (re-using Phase 2B builders) or fires
 * a quick action and posts a thread reply. Long-running work happens in a
 * detached promise so we ack the trigger within Slack's 3-second budget.
 */

import { openModal, postMessage, dm } from './client'
import {
  openScorerModal,
  openPostGeneratorModal,
} from './modals'
import type { OnCoreCaller } from './auth'

interface ShortcutCtx {
  caller: OnCoreCaller
  teamId: string
  triggerId: string
}

interface MessageShortcutCtx extends ShortcutCtx {
  callbackId: string
  messageText: string
  messageTs: string
  channelId: string
}

interface GlobalShortcutCtx extends ShortcutCtx {
  callbackId: string
}

// ─── Message shortcuts (callback IDs match the Slack app config) ─────────────
export async function handleMessageShortcut(ctx: MessageShortcutCtx): Promise<void> {
  switch (ctx.callbackId) {
    case 'vpis_score_message':
      return handleScoreMessage(ctx)
    case 'save_as_lead':
      return handleSaveAsLead(ctx)
    case 'generate_reply':
      return handleGenerateReply(ctx)
    case 'create_task':
      return handleCreateTask(ctx)
    default:
      return
  }
}

async function handleScoreMessage(ctx: MessageShortcutCtx) {
  // Open the scorer modal pre-filled with the message text. The modal's
  // private_metadata carries channel + ts so the result posts as a thread
  // reply on the original message.
  await openScorerModal(
    { caller: ctx.caller, teamId: ctx.teamId, triggerId: ctx.triggerId },
    {
      text: ctx.messageText,
      channel: ctx.channelId,
      messageTs: ctx.messageTs,
    },
  )
}

async function handleSaveAsLead(ctx: MessageShortcutCtx) {
  // Open a confirm modal with extracted fields. We extract a best-effort
  // email + name on the fly; a Groq-backed extractor can replace this.
  const extracted = extractLeadFromText(ctx.messageText)
  const view = {
    type: 'modal',
    callback_id: 'modal_save_lead_confirm',
    private_metadata: JSON.stringify({
      channel: ctx.channelId,
      messageTs: ctx.messageTs,
    }),
    title: { type: 'plain_text', text: 'Save as Lead' },
    submit: { type: 'plain_text', text: 'Save' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      inputBlock('b_name', 'name', 'Name', extracted.name),
      inputBlock('b_email', 'email', 'Email', extracted.email),
      inputBlock('b_phone', 'phone', 'Phone', extracted.phone || ''),
      inputBlock('b_company', 'company', 'Company', extracted.company || ''),
      inputBlock('b_notes', 'notes', 'Notes', ctx.messageText.slice(0, 400), true),
    ],
  }
  await openModal(ctx.triggerId, view, { teamId: ctx.teamId })
}

async function handleGenerateReply(ctx: MessageShortcutCtx) {
  // Open a modal with a rich_text_input pre-filled with a placeholder reply.
  // Real flow runs Jaxx async after submit; here we just stage the editor.
  const view = {
    type: 'modal',
    callback_id: 'modal_generate_reply_confirm',
    private_metadata: JSON.stringify({
      channel: ctx.channelId,
      messageTs: ctx.messageTs,
    }),
    title: { type: 'plain_text', text: 'Generate Reply' },
    submit: { type: 'plain_text', text: 'Post' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'b_reply',
        label: { type: 'plain_text', text: 'Reply' },
        element: {
          type: 'plain_text_input',
          action_id: 'reply',
          multiline: true,
          initial_value: defaultReplyDraft(ctx.messageText),
        },
      },
    ],
  }
  await openModal(ctx.triggerId, view, { teamId: ctx.teamId })
}

async function handleCreateTask(ctx: MessageShortcutCtx) {
  const firstLine = ctx.messageText.split(/\n/)[0].slice(0, 120)
  const view = {
    type: 'modal',
    callback_id: 'modal_create_task_confirm',
    private_metadata: JSON.stringify({
      channel: ctx.channelId,
      messageTs: ctx.messageTs,
    }),
    title: { type: 'plain_text', text: 'Create Task' },
    submit: { type: 'plain_text', text: 'Create' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      inputBlock('b_title', 'title', 'Title', firstLine),
      inputBlock('b_desc', 'description', 'Description', ctx.messageText, true),
      {
        type: 'input',
        block_id: 'b_due',
        label: { type: 'plain_text', text: 'Due date' },
        optional: true,
        element: { type: 'datepicker', action_id: 'due' },
      },
      {
        type: 'input',
        block_id: 'b_assign',
        label: { type: 'plain_text', text: 'Assign to' },
        optional: true,
        element: { type: 'users_select', action_id: 'assignee' },
      },
      {
        type: 'input',
        block_id: 'b_priority',
        label: { type: 'plain_text', text: 'Priority' },
        element: {
          type: 'radio_buttons',
          action_id: 'priority',
          initial_option: { text: { type: 'plain_text', text: 'Medium' }, value: 'medium' },
          options: [
            { text: { type: 'plain_text', text: 'Low' }, value: 'low' },
            { text: { type: 'plain_text', text: 'Medium' }, value: 'medium' },
            { text: { type: 'plain_text', text: 'High' }, value: 'high' },
            { text: { type: 'plain_text', text: 'Urgent' }, value: 'urgent' },
          ],
        },
      },
    ],
  }
  await openModal(ctx.triggerId, view, { teamId: ctx.teamId })
}

// ─── Global shortcuts ────────────────────────────────────────────────────────
export async function handleGlobalShortcut(ctx: GlobalShortcutCtx): Promise<void> {
  switch (ctx.callbackId) {
    case 'new_linkedin_post':
      return openPostGeneratorModal(
        { caller: ctx.caller, teamId: ctx.teamId, triggerId: ctx.triggerId },
        { platform: 'linkedin' },
      )
    case 'quick_score':
      return openScorerModal(
        { caller: ctx.caller, teamId: ctx.teamId, triggerId: ctx.triggerId },
      )
    case 'exec_pulse':
      return openExecPulseModal(ctx)
    default:
      return
  }
}

async function openExecPulseModal(ctx: GlobalShortcutCtx): Promise<void> {
  // Phase 2 v1: render a compact placeholder so the shortcut works end-to-end.
  // Full data wiring lives in /api/exec — we DM the user a deep link for now.
  await dm(
    ctx.caller.user_id,
    [],
    'Opening Company Pulse → https://www.0ncore.com/dashboard/exec',
    { teamId: ctx.teamId },
  )
  await postMessage(
    {
      channel: ctx.caller.user_id,
      text: 'Opening Company Pulse — full live view at https://www.0ncore.com/dashboard/exec',
    },
    { teamId: ctx.teamId },
  ).catch(() => {})
}

// ─── Tiny helpers ────────────────────────────────────────────────────────────
function inputBlock(
  block_id: string,
  action_id: string,
  label: string,
  initial_value?: string,
  multiline?: boolean,
) {
  return {
    type: 'input',
    block_id,
    optional: !initial_value,
    label: { type: 'plain_text', text: label },
    element: {
      type: 'plain_text_input',
      action_id,
      multiline: !!multiline,
      ...(initial_value ? { initial_value } : {}),
    },
  }
}

function extractLeadFromText(text: string): {
  name: string
  email: string
  phone: string
  company: string
} {
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  const phoneMatch = text.match(/\+?\d[\d\s().-]{8,}\d/)
  // First line that doesn't look like an email or phone is a guess at name
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const nameLine = lines.find((l) => !/[@\d]/.test(l)) || lines[0] || ''
  return {
    name: nameLine.slice(0, 80),
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
    company: '',
  }
}

function defaultReplyDraft(text: string): string {
  const first = text.split(/\n/)[0] || text
  return `Thanks for raising this. Quick thought on "${first.slice(0, 80)}…":\n\n— `
}
