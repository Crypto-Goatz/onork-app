/**
 * Block Kit builders for repeated UI shapes.
 *
 * Slack's Block Kit is JSON. These helpers keep the call sites readable
 * and centralize the brand voice (no emoji icons, terse copy, action
 * buttons that route back to /api/slack/interactivity).
 */

type Block = Record<string, unknown>

export function header(text: string): Block {
  return { type: 'header', text: { type: 'plain_text', text } }
}

export function section(text: string): Block {
  return { type: 'section', text: { type: 'mrkdwn', text } }
}

export function context(items: string[]): Block {
  return {
    type: 'context',
    elements: items.map((t) => ({ type: 'mrkdwn', text: t })),
  }
}

export function divider(): Block {
  return { type: 'divider' }
}

export function actionsRow(
  buttons: Array<{ text: string; value: string; action_id: string; style?: 'primary' | 'danger'; url?: string }>,
): Block {
  return {
    type: 'actions',
    elements: buttons.map((b) => ({
      type: 'button',
      text: { type: 'plain_text', text: b.text },
      value: b.value,
      action_id: b.action_id,
      ...(b.style ? { style: b.style } : {}),
      ...(b.url ? { url: b.url } : {}),
    })),
  }
}

export function input(label: string, action_id: string, multiline = false, placeholder?: string): Block {
  return {
    type: 'input',
    block_id: action_id,
    label: { type: 'plain_text', text: label },
    element: {
      type: 'plain_text_input',
      action_id,
      multiline,
      placeholder: placeholder ? { type: 'plain_text', text: placeholder } : undefined,
    },
  }
}

/**
 * Standard 0n welcome card — used after install, App Home tab top.
 */
export function welcomeCard(user: { full_name: string | null; email: string; plan: string | null }): Block[] {
  const name = user.full_name || user.email.split('@')[0]
  return [
    header(`Hey ${name} — 0n is connected`),
    section(
      `*Linked account:* ${user.email}\n*Plan:* ${user.plan ?? 'free'}\nDM me anytime — I'm Jaxx, the AI behind 0nCore.`,
    ),
    actionsRow([
      { text: 'Open 0nExec', value: 'open_exec', action_id: 'home_open_exec', style: 'primary' },
      { text: 'Run a workflow', value: 'run_workflow', action_id: 'home_run_workflow' },
      { text: 'Generate post', value: 'gen_post', action_id: 'home_gen_post' },
      { text: 'Help', value: 'help', action_id: 'home_help' },
    ]),
    context(['*Slash commands:* /0n /0nexec /0nscore /0npost /0nscan /0ncrm /0ncourse /0nmarket']),
  ]
}

/**
 * Render the bot's reply to a DM — Jaxx's chat-style output as a single
 * mrkdwn section with a contextual footer.
 */
export function jaxxReply(text: string, traceId?: string): Block[] {
  return [
    section(text),
    context([
      `Powered by 0nMCP · brain pattern · Groq llama-3.3-70b${traceId ? ` · trace ${traceId.slice(0, 8)}` : ''}`,
    ]),
  ]
}

/**
 * "Account not linked" prompt — first response when a Slack user has no
 * matching 0nCore profile.
 */
export function notLinkedPrompt(): Block[] {
  return [
    section(
      "*You're not linked to a 0nCore account yet.*\n\nInstall the app or sign up at <https://www.0ncore.com/signup|0ncore.com/signup> with the same email as your Slack account, then DM me again.",
    ),
    actionsRow([
      { text: 'Sign up', value: 'signup', action_id: 'link_signup', url: 'https://www.0ncore.com/signup', style: 'primary' },
      { text: 'I already have an account', value: 'help_link', action_id: 'link_help', url: 'https://www.0ncore.com/integrations/slack' },
    ]),
  ]
}
