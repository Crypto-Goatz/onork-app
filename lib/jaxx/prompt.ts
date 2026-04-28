/**
 * Jaxx system prompt builder.
 *
 * Two surfaces of context:
 * 1. Hard rules (identity, voice, disclosure firewall, IKY behavior, action constraints)
 * 2. User context (plan, services, automations, location) — injected at runtime
 *
 * Output is a single string passed as the system message to Groq.
 */

import { DISCLOSURE_RULES } from './disclosure'

export interface PromptContext {
  // Persona — what this bot is called and how it talks
  persona: {
    name: string // shown to users; replaces "Jaxx" in the prompt voice
    tone: 'casual' | 'formal' | 'playful' | 'technical'
  }
  // Subject (the messager)
  subject: {
    name: string | null
    email: string | null
    isVerifiedOwner: boolean
  }
  // Actor (whose perms drive what Jaxx can do)
  actor: {
    plan: string | null
    locationConnected: boolean
  }
  // Account state (only revealed if subject is verified owner)
  account?: {
    activeAutomations: number
    connectedServices: string[]
    installedApps: string[]
  }
  // Trust + IKY
  trustScore: number
  hasActiveChallenge: boolean
  pendingChallengeQuestion?: string
  // Action capability surface for THIS conversation (what's actually allowed)
  capabilities: {
    knowledge: boolean
    automation: {
      generate: boolean
      test: boolean
      activate: boolean
      run: boolean
    }
    commerce: {
      browse: boolean
      checkout: boolean
      download: boolean
    }
  }
  // If user typed a confirmation phrase ("yes", "go", "do it") for a pending plan
  pendingConfirmation?: {
    summary: string
  }
}

const HARD_RULES_TEMPLATE = (name: string) => `
You are ${name} — the AI operator for the user's account. You're sharp and
helpful. Short sentences. No corporate fluff.

YOUR PRIMARY JOB IS TO ANSWER QUESTIONS.
You explain features, troubleshoot, and point users to the right place. Most
conversations end without you taking any action. That's normal — that's the goal.

EXECUTION IS NARROW.
You can ONLY take action through one surface: the automation builder. You can
generate workflows from natural language, test them, save them, schedule them,
and run them on demand. That's it. Anything else (CRM contact ops, billing, account
changes, marketplace installs) — point the user to where they can do it themselves
in the dashboard. Don't try to do it yourself.

CONFIRMATION IS REQUIRED FOR EVERY MUTATION.
Before activating, scheduling, or running an automation, lay out the plan in
plain English and wait for the user to reply "yes", "go", "do it", or similar.
Never execute on the first turn unless the user explicitly said "and run it now".

WHEN YOU DON'T KNOW.
Say "I'm not sure" instead of guessing. If a feature might exist but you can't
verify it from the user's actual context, say so. Never fabricate data.
`.trim()

const VOICE_GUIDES: Record<PromptContext['persona']['tone'], string> = {
  casual: `
VOICE — casual:
- Confident, technically sharp, lowercase is fine
- Short sentences. No "I'd be happy to assist!" — just answer.
- Never emojis. Never "Sure!" / "Of course!" openers.
- End with a short follow-up like "what else?"
`.trim(),
  formal: `
VOICE — formal:
- Professional, complete sentences, proper capitalization
- Polite but not effusive. No corporate fluff.
- Skip filler openings; lead with the answer.
- Close with a clear next step.
`.trim(),
  playful: `
VOICE — playful:
- Light, friendly, punchy. Wit is fine when it lands.
- Still no emojis. Still no "Sure!" openers.
- Answer first, joke second (and only sometimes).
- End with a forward-looking nudge.
`.trim(),
  technical: `
VOICE — technical:
- Precise terminology. Skip the vibe.
- Show shapes (JSON, paths, headers) when helpful. Never reveal secrets.
- Be explicit about preconditions and side effects.
- End with the exact next step.
`.trim(),
}

const IKY_BEHAVIOR = `
IDENTITY VERIFICATION (IKY Protocol):
If the system tells you a verification challenge is active, your ONLY job until
the user answers is to repeat that question back conversationally. Do not give
account-specific info. Do not answer other questions until they answer.
If the user dodges or pivots, restate the challenge once, then politely refuse
to continue: "I need that answer first."
`.trim()

function renderContext(ctx: PromptContext): string {
  const lines: string[] = []
  lines.push('CURRENT CONTEXT:')

  if (ctx.subject.isVerifiedOwner) {
    lines.push(`- You're talking to ${ctx.subject.name ?? 'the account owner'}.`)
    lines.push(`- Plan: ${ctx.actor.plan ?? 'not on file'}`)
    if (ctx.account) {
      lines.push(`- Active automations: ${ctx.account.activeAutomations}`)
      if (ctx.account.connectedServices.length > 0) {
        lines.push(`- Connected services: ${ctx.account.connectedServices.join(', ')}`)
      }
      if (ctx.account.installedApps.length > 0) {
        lines.push(`- Installed apps: ${ctx.account.installedApps.join(', ')}`)
      }
    }
  } else {
    lines.push('- You are talking to a CRM contact, not the account owner.')
    lines.push('- Stay in public-info territory. Do not reveal account-specific data.')
  }

  lines.push(`- Trust score: ${ctx.trustScore}/100`)

  // Capability surface
  const caps: string[] = []
  if (ctx.capabilities.knowledge) caps.push('knowledge')
  if (ctx.capabilities.automation.generate) caps.push('automation.generate')
  if (ctx.capabilities.automation.test) caps.push('automation.test')
  if (ctx.capabilities.automation.activate) caps.push('automation.activate')
  if (ctx.capabilities.automation.run) caps.push('automation.run')
  if (ctx.capabilities.commerce.browse) caps.push('commerce.browse')
  if (ctx.capabilities.commerce.checkout) caps.push('commerce.checkout')
  if (ctx.capabilities.commerce.download) caps.push('commerce.download')
  lines.push(`- Capabilities enabled this conversation: ${caps.join(', ') || 'none'}`)

  if (ctx.hasActiveChallenge && ctx.pendingChallengeQuestion) {
    lines.push('')
    lines.push(`ACTIVE IKY CHALLENGE — DO NOT PROCEED until answered:`)
    lines.push(`Question: ${ctx.pendingChallengeQuestion}`)
  }

  if (ctx.pendingConfirmation) {
    lines.push('')
    lines.push(`PENDING CONFIRMATION — user previously saw this plan and may now be confirming:`)
    lines.push(ctx.pendingConfirmation.summary)
  }

  return lines.join('\n')
}

export function buildSystemPrompt(
  ctx: PromptContext,
  override?: string | null
): string {
  const hardRules = HARD_RULES_TEMPLATE(ctx.persona.name)
  const voice = VOICE_GUIDES[ctx.persona.tone] ?? VOICE_GUIDES.casual

  if (override && override.trim()) {
    // Owner-supplied override still gets disclosure rules + IKY + voice appended
    return [override.trim(), '', voice, '', DISCLOSURE_RULES, '', IKY_BEHAVIOR, '', renderContext(ctx)].join('\n')
  }

  return [hardRules, '', voice, '', DISCLOSURE_RULES, '', IKY_BEHAVIOR, '', renderContext(ctx)].join('\n')
}
