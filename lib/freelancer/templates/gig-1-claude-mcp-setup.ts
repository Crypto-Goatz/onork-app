import type { GigTemplate, OrderContext, FulfillmentBundle } from '../types'

const SUPPORTED_APPS = [
  'gmail', 'slack', 'notion', 'google_drive', 'google_calendar',
  'github', 'stripe', 'supabase', 'hubspot', 'linkedin',
  'shopify', 'calendly', 'discord', 'zoom', 'airtable', 'trello',
]

interface Parsed {
  selected_apps?: string[]
  buyer_email?: string
  buyer_name?: string
  operating_system?: string
  notes?: string
}

const template: GigTemplate = {
  gigId: 'claude-mcp-setup',
  label: 'Claude Desktop + MCP Setup (24hr)',

  async fulfill(ctx: OrderContext): Promise<FulfillmentBundle> {
    const p = ctx.parsed as Parsed
    const apps = (p.selected_apps || ['gmail', 'slack', 'google_drive'])
      .filter(a => SUPPORTED_APPS.includes(a))
      .slice(0, 12)
    const name = p.buyer_name || 'there'
    const os = p.operating_system || 'macos'

    const configJson = {
      mcpServers: {
        '0nmcp': {
          command: 'npx',
          args: ['-y', '0nmcp@latest'],
          env: {
            ONMCP_TOKEN: '<<REPLACE_WITH_YOUR_TOKEN>>',
            ONMCP_ENABLED_SERVICES: apps.join(','),
          },
        },
      },
    }

    const envFile = [
      '# 0nMCP Configuration',
      'ONMCP_TOKEN=',
      `ONMCP_ENABLED_SERVICES=${apps.join(',')}`,
      '',
      '# Per-service credentials (fill in what you need)',
      ...apps.flatMap(app => [
        `# --- ${app.toUpperCase()} ---`,
        `${app.toUpperCase()}_API_KEY=`,
        '',
      ]),
    ].join('\n')

    const installPath = os === 'windows'
      ? '%APPDATA%\\\\Claude\\\\'
      : '~/Library/Application Support/Claude/'

    const readme = `# Your Claude Desktop + 0nMCP Setup

Hi ${name} — here's your custom Claude Desktop configuration.

## What's Included
- \`claude_desktop_config.json\` — drop into your Claude Desktop config folder
- \`.env\` — fill in credentials for the apps you want connected
- This README with install + verify steps

## Install (5 minutes)

### ${os === 'windows' ? 'Windows' : 'macOS'}
1. Open ${os === 'windows' ? 'Run (Win+R)' : 'Finder (Cmd+Shift+G)'}, paste: \`${installPath}\`
2. Replace or create \`claude_desktop_config.json\` with the file in this bundle
3. ${os === 'windows' ? 'Set environment variables in System Properties' : 'Add .env values to your shell profile'}
4. Restart Claude Desktop

## Verify
Open Claude Desktop. In a new chat, type:
> "List the tools you have access to via 0nMCP"

You should see tools for: ${apps.join(', ')}.

## Connected Apps (${apps.length})
${apps.map(a => `- ${a}`).join('\n')}

## Need Help?
Reply to the Fiverr order — I respond within 1 hour during US business hours.

---
RocketOpp LLC · Pittsburgh, PA · 0ncore.com
`

    const loomScript = `Hey ${name} — quick walkthrough of your setup.

I've connected Claude Desktop to ${apps.length} apps via 0nMCP: ${apps.join(', ')}.

Three files in your bundle:
1. claude_desktop_config.json — drop this into your Claude config folder
2. .env — fill in the API credentials for each app
3. README — step-by-step install instructions for ${os}

Once installed, you can ask Claude things like "summarize my last 10 emails" or "create a Notion page from this Slack thread" — it'll use the right tool automatically.

If you want to expand beyond these ${apps.length} apps, 0nCore gives you access to 1,554 tools across 96 services. Just message me for details.

5-star reviews keep me going. If the setup works for you, please leave one — and I'll prioritize follow-up questions for 14 days.

Thanks!`

    const deliveryMessage = `Hi ${name}!

Your custom Claude Desktop + MCP setup is delivered.

Bundle includes:
- claude_desktop_config.json (ready to drop in)
- .env file with all required vars labeled
- README with ${os} install steps
- ${apps.length} apps wired: ${apps.slice(0, 5).join(', ')}${apps.length > 5 ? ` +${apps.length - 5} more` : ''}

Setup time: 5 minutes
Loom walkthrough script included

Free 14-day support window starts now — just reply here with any questions.

If this saved you time, a 5-star review means the world. Want to scale to 1,554 tools across 96 services? Check out 0nCore at 0ncore.com — happy to walk you through it.

— Mike, RocketOpp LLC`

    return {
      files: [
        { path: 'claude_desktop_config.json', content: JSON.stringify(configJson, null, 2) },
        { path: '.env', content: envFile },
        { path: 'README.md', content: readme },
      ],
      loomScript,
      deliveryMessage,
      crmTags: ['fiverr-buyer', 'gig-mcp-setup', 'upsell-0ncore'],
      upsellHint: '0nCore — full 1,554-tool access across 96 services',
    }
  },
}

export default template
