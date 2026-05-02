/**
 * Reusable Block Kit builders. Every Phase 2 surface assembles UI from these
 * primitives — never hand-roll blocks in route handlers (per spec §"BLOCK KIT
 * PATTERNS"). Block typings stay loose because Slack accepts a lot of shapes
 * and the SDK type churn makes strict typing brittle.
 */

export type Block = Record<string, unknown>

// ─── 1. Card Pattern ─────────────────────────────────────────────────────────
export interface CardBlockArgs {
  title: string
  body?: string
  meta?: string[]
  accessory?: Block | null
  divider?: boolean
}

export function cardBlock(args: CardBlockArgs): Block[] {
  const out: Block[] = []
  const sectionText = args.body ? `*${args.title}*\n${args.body}` : `*${args.title}*`
  const section: Block = {
    type: 'section',
    text: { type: 'mrkdwn', text: sectionText },
  }
  if (args.accessory) section.accessory = args.accessory
  out.push(section)
  if (args.meta?.length) {
    out.push({
      type: 'context',
      elements: args.meta.map((m) => ({ type: 'mrkdwn', text: m })),
    })
  }
  if (args.divider !== false) out.push({ type: 'divider' })
  return out
}

// ─── 2. Score Display Pattern ────────────────────────────────────────────────
export interface ScoreFactor {
  key: string
  value: number | string
}

export interface ScoreActionButton {
  text: string
  action_id: string
  value?: string
  style?: 'primary' | 'danger'
}

export interface ScoreBlockArgs {
  score: number
  factors: ScoreFactor[]
  patterns?: string[]
  actions?: ScoreActionButton[]
}

export function scoreBlock(args: ScoreBlockArgs): Block[] {
  const blocks: Block[] = [
    { type: 'header', text: { type: 'plain_text', text: `VPIS Score: ${args.score}/100` } },
  ]

  if (args.factors.length) {
    const lines = args.factors.map((f) => `• *${f.key}*: ${f.value}`).join('\n')
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: lines },
    })
  }

  if (args.patterns?.length) {
    const text = `Patterns fired:\n${args.patterns.map((p) => `• ${p}`).join('\n')}`
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text },
    })
  }

  if (args.actions?.length) {
    blocks.push({
      type: 'actions',
      elements: args.actions.map((a) => ({
        type: 'button',
        text: { type: 'plain_text', text: a.text },
        action_id: a.action_id,
        ...(a.value ? { value: a.value } : {}),
        ...(a.style ? { style: a.style } : {}),
      })),
    })
  }

  return blocks
}

// ─── 3. Alert Card Pattern ───────────────────────────────────────────────────
export type AlertSeverity = 'critical' | 'warning' | 'ontrack'

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  critical: ':red_circle:',
  warning: ':large_yellow_circle:',
  ontrack: ':large_green_circle:',
}

export interface AlertBlockArgs {
  severity: AlertSeverity
  dept: string
  daysInStage: number
  company?: string
  contact?: string
  value?: string
  assignedTo?: string
  cardId: string
}

export function alertBlock(args: AlertBlockArgs): Block[] {
  const emoji = SEVERITY_EMOJI[args.severity]
  const meta: string[] = []
  if (args.company) meta.push(args.company)
  if (args.contact) meta.push(args.contact)
  if (args.value) meta.push(`*${args.value}*`)
  if (args.assignedTo) meta.push(`assigned to ${args.assignedTo}`)

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${args.dept}* · ${args.daysInStage} days in stage`,
      },
      accessory: {
        type: 'overflow',
        action_id: `exec_overflow:${args.cardId}`,
        options: [
          { text: { type: 'plain_text', text: 'View' }, value: `view:${args.cardId}` },
          { text: { type: 'plain_text', text: 'Reassign' }, value: `reassign:${args.cardId}` },
          { text: { type: 'plain_text', text: 'Escalate' }, value: `escalate:${args.cardId}` },
        ],
      },
    },
    ...(meta.length
      ? [
          {
            type: 'context',
            elements: meta.map((m) => ({ type: 'mrkdwn', text: m })),
          } as Block,
        ]
      : []),
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View' },
          action_id: 'exec_view',
          value: args.cardId,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Reassign' },
          action_id: 'exec_reassign',
          value: args.cardId,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Escalate' },
          action_id: 'exec_escalate',
          value: args.cardId,
          style: 'danger',
        },
      ],
    },
    { type: 'divider' },
  ]
}

// ─── 4. Result Pattern ───────────────────────────────────────────────────────
export interface ResultBlockArgs {
  title: string
  items: CardBlockArgs[]
  footerActions?: ScoreActionButton[]
}

export function resultBlock(args: ResultBlockArgs): Block[] {
  const blocks: Block[] = [
    { type: 'header', text: { type: 'plain_text', text: args.title } },
  ]
  for (const item of args.items) {
    blocks.push(...cardBlock(item))
  }
  if (args.footerActions?.length) {
    blocks.push({
      type: 'actions',
      elements: args.footerActions.map((a) => ({
        type: 'button',
        text: { type: 'plain_text', text: a.text },
        action_id: a.action_id,
        ...(a.value ? { value: a.value } : {}),
        ...(a.style ? { style: a.style } : {}),
      })),
    })
  }
  return blocks
}

// ─── Small helpers commonly assembled by surfaces ────────────────────────────
export function header(text: string): Block {
  return { type: 'header', text: { type: 'plain_text', text } }
}

export function section(mrkdwn: string, accessory?: Block): Block {
  const out: Block = { type: 'section', text: { type: 'mrkdwn', text: mrkdwn } }
  if (accessory) out.accessory = accessory
  return out
}

export function context(...mrkdwns: string[]): Block {
  return {
    type: 'context',
    elements: mrkdwns.map((m) => ({ type: 'mrkdwn', text: m })),
  }
}

export function divider(): Block {
  return { type: 'divider' }
}

export function actionsRow(elements: Block[]): Block {
  return { type: 'actions', elements }
}

export function button(args: {
  text: string
  action_id: string
  value?: string
  style?: 'primary' | 'danger'
  url?: string
}): Block {
  return {
    type: 'button',
    text: { type: 'plain_text', text: args.text },
    action_id: args.action_id,
    ...(args.value ? { value: args.value } : {}),
    ...(args.style ? { style: args.style } : {}),
    ...(args.url ? { url: args.url } : {}),
  }
}
