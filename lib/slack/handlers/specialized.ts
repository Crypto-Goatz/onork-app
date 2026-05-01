/**
 * Specialized command handlers — exec / score / post / scan / crm / course / market.
 *
 * These all share the dispatcher pattern: parse args, kick off Jaxx with a
 * scoped system prompt, return the reply. The point is the right NAMES
 * surface in Slack so users can tab-complete to the action they want;
 * the actual brain stays unified.
 */
import type { OnCoreCaller } from '../auth'
import { runJaxx } from '../jaxx'

export interface CmdInput {
  user: OnCoreCaller | null
  text: string
  team_id: string
}

export interface CmdReply {
  text: string
  ephemeral?: boolean
}

function notLinked(): CmdReply {
  return {
    text: 'Link your Slack account first — sign up at <https://www.0ncore.com/signup|0ncore.com/signup> with the same email, then DM me.',
    ephemeral: true,
  }
}

async function ask(user: OnCoreCaller, hint: string, text: string): Promise<CmdReply> {
  const r = await runJaxx({
    user,
    prompt: `${hint}\n\nUser said: ${text || '(no text — give a quick guide)'}`,
    surface: 'slack:cmd',
  })
  return { text: r.text }
}

export async function handleExec({ user, text }: CmdInput): Promise<CmdReply> {
  if (!user) return notLinked()
  if (!text || text === 'help') {
    return {
      text:
        '*0nExec*\n`/0nexec` snapshot · `/0nexec critical` only red cards · `/0nexec card <id>` detail · `/0nexec ack <alert-id>` acknowledge · `/0nexec digest` send now',
      ephemeral: true,
    }
  }
  return ask(
    user,
    'You are answering a /0nexec command. Reply concisely with the user\'s 0nExec dashboard summary, top urgency cards, and any critical alerts. If you don\'t have data, tell them to run the dashboard at https://www.0ncore.com/dashboard/exec.',
    text,
  )
}

export async function handleScore({ user, text }: CmdInput): Promise<CmdReply> {
  if (!user) return notLinked()
  if (!text || text === 'help') {
    return {
      text:
        '*0nScore*\n`/0nscore <url>` SXO summary · `/0nscore deep <url>` full audit · `/0nscore eq <text>` EQ score · `/0nscore compare <a> <b>` head-to-head',
      ephemeral: true,
    }
  }
  return ask(
    user,
    'You are answering a /0nscore command. The user wants an SXO/EQ score. Reply with what you can infer + a link to the full report at /dashboard/reports/builder.',
    text,
  )
}

export async function handlePost({ user, text }: CmdInput): Promise<CmdReply> {
  if (!user) return notLinked()
  if (!text || text === 'help') {
    return {
      text:
        '*0nPost*\n`/0npost <topic>` quick post · `/0npost blog <topic>` long-form · `/0npost social <topic>` 4 platform variants · `/0npost from-url <url>` repurpose',
      ephemeral: true,
    }
  }
  return ask(
    user,
    'You are answering a /0npost command. Generate a draft post on the requested topic. Keep it tight — under 200 words. End with a one-line "want me to post this?" prompt.',
    text,
  )
}

export async function handleScan({ user, text }: CmdInput): Promise<CmdReply> {
  if (!user) return notLinked()
  if (!text || text === 'help') {
    return {
      text:
        '*0nScan*\n`/0nscan <url>` quick scan · `/0nscan crawl <url>` full crawl · `/0nscan competitors <url>` top competitors',
      ephemeral: true,
    }
  }
  return ask(
    user,
    'You are answering a /0nscan command. The Stack Scanner already exists at /api/scanner/analyze. If the user passed a URL, suggest running the extension scanner or the report builder. Otherwise explain what /0nscan does.',
    text,
  )
}

export async function handleCrm({ user, text }: CmdInput): Promise<CmdReply> {
  if (!user) return notLinked()
  if (!text || text === 'help') {
    return {
      text:
        '*0nCRM*\n`/0ncrm find <q>` search · `/0ncrm contact <id>` open card · `/0ncrm note <id> <text>` add note · `/0ncrm move <opp> <stage>` advance · `/0ncrm tag <id> <tag>` apply tag',
      ephemeral: true,
    }
  }
  return ask(
    user,
    `You are answering a /0ncrm command. The user's CRM location_id is ${user.crm_location_id ?? '(not provisioned)'}. Tell them what you can do, and what each command would actually fire (CRM contact tools, opportunity tools, etc).`,
    text,
  )
}

export async function handleCourse({ user, text }: CmdInput): Promise<CmdReply> {
  if (!user) return notLinked()
  if (!text || text === 'help') {
    return {
      text:
        '*0nCourse*\n`/0ncourse list` your courses · `/0ncourse new <title>` start one · `/0ncourse lesson <id>` add lesson · `/0ncourse publish <id>` ship it',
      ephemeral: true,
    }
  }
  return ask(
    user,
    'You are answering a /0ncourse command. The user is using 0n Course Builder. Suggest the next concrete action — open the Course Builder UI at /dashboard/courses or run an MCP factory_spawn for a course.',
    text,
  )
}

export async function handleMarket({ user, text }: CmdInput): Promise<CmdReply> {
  if (!user) return notLinked()
  if (!text || text === 'help') {
    return {
      text:
        '*0nMarket*\n`/0nmarket search <q>` find listings · `/0nmarket list` your published · `/0nmarket publish <slug>` ship a workflow · `/0nmarket revenue` MTD · `/0nmarket buyers <id>` recent buyers',
      ephemeral: true,
    }
  }
  return ask(
    user,
    'You are answering a /0nmarket command. The 0n Marketplace lives at marketplace.rocketclients.com and uses UCP (catalog/checkout/orders/fulfillment). Help the user act on what they asked.',
    text,
  )
}
