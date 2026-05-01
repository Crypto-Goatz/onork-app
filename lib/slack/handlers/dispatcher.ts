/**
 * /0n master dispatcher — covers help / status / run / connect / whoami,
 * falls through to Jaxx free-form for anything else.
 */
import type { OnCoreCaller } from '../auth'
import { runJaxx } from '../jaxx'

export interface CommandInput {
  user: OnCoreCaller | null
  text: string
  team_id: string
}

export interface CommandReply {
  text: string
  blocks?: Record<string, unknown>[]
  ephemeral?: boolean
}

const HELP_TEXT = `*0n commands*

\`/0n help\`                 list commands
\`/0n status\`               ecosystem health
\`/0n run <slug> [params]\`  execute a workflow / .0n switch
\`/0n connect <service>\`    "Turn it 0n" flow
\`/0n whoami\`               show linked 0nCore account

*Specialized:*
\`/0nexec\` \`/0nscore\` \`/0npost\` \`/0nscan\`
\`/0ncrm\` \`/0ncourse\` \`/0nmarket\`

DM me to chat with Jaxx directly. I have your brain, K-layers, connections, and any .0n switch you want me to run.`

export async function handleDispatcher(input: CommandInput): Promise<CommandReply> {
  const { user, text } = input
  const args = text.trim().split(/\s+/)
  const sub = (args[0] || '').toLowerCase()
  const rest = args.slice(1).join(' ')

  if (!sub || sub === 'help' || sub === '?') {
    return { text: HELP_TEXT, ephemeral: true }
  }

  if (!user) {
    return {
      text:
        'Your Slack account isn\'t linked to a 0nCore profile yet. Sign up or sign in at <https://www.0ncore.com/signup|0ncore.com/signup> with the same email as your Slack account, then DM me again.',
      ephemeral: true,
    }
  }

  if (sub === 'whoami') {
    return {
      text:
        `*${user.full_name ?? user.email}*\n` +
        `email: ${user.email}\n` +
        `plan: ${user.plan ?? 'free'}\n` +
        `crm_location: \`${user.crm_location_id ?? 'none'}\`\n` +
        `admin: ${user.is_admin ? 'yes' : 'no'}`,
      ephemeral: true,
    }
  }

  if (sub === 'status') {
    try {
      const v = await fetch('https://www.0ncore.com/api/dispatch/version', {
        cache: 'no-store',
      }).then((r) => r.json())
      return {
        text: `*0n status*\nDispatch sha: \`${v.sha?.slice(0, 8) ?? '?'}\`\nLast: ${v.message ?? '—'}\nLayer 3 healthy.`,
        ephemeral: true,
      }
    } catch (e) {
      return { text: `Status check failed: ${(e as Error).message}`, ephemeral: true }
    }
  }

  if (sub === 'connect') {
    const svc = rest.trim() || ''
    if (!svc) return { text: 'Usage: `/0n connect <service>` — e.g. `/0n connect crm`', ephemeral: true }
    return {
      text: `*Turn 0n ${svc}* — open <https://www.0ncore.com/turn-it-on/${encodeURIComponent(svc)}|0ncore.com/turn-it-on/${svc}> to authorize. I'll detect the connection on your next DM.`,
      ephemeral: true,
    }
  }

  if (sub === 'run') {
    const slug = args[1]
    if (!slug) return { text: 'Usage: `/0n run <workflow-slug>`', ephemeral: true }
    // Hand off to the factory — public read, anyone with the slug can hit it.
    return {
      text: `Spinning up workflow *${slug}*. Open <https://www.0ncore.com/apps/${encodeURIComponent(slug)}|/apps/${slug}> to use it. Need me to spawn a new one? DM me.`,
    }
  }

  // Anything else: hand the whole prompt to Jaxx for a free-form reply.
  const reply = await runJaxx({ user, prompt: text, surface: 'slack:cmd' })
  return { text: reply.text }
}
