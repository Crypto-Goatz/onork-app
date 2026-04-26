import type { GigTemplate, OrderContext, FulfillmentBundle } from '../types'

interface Parsed {
  agent_purpose?: string
  apps_to_connect?: string[]
  trigger?: string
  delivery_format?: string
  buyer_name?: string
  buyer_email?: string
  notes?: string
}

const template: GigTemplate = {
  gigId: 'ai-agent-build',
  label: 'Custom AI Agent Build',

  async fulfill(ctx: OrderContext): Promise<FulfillmentBundle> {
    const p = ctx.parsed as Parsed
    const name = p.buyer_name || 'there'
    const apps = p.apps_to_connect || ['gmail', 'slack']
    const purpose = p.agent_purpose || 'automate workflows across business apps'
    const trigger = p.trigger || 'manual invocation or scheduled cron'

    // Generate the .0n workflow file
    const workflowFile = {
      name: `Custom Agent — ${purpose.slice(0, 50)}`,
      version: '1.0.0',
      description: purpose,
      trigger: { type: trigger.includes('schedule') ? 'cron' : 'manual', config: {} },
      steps: apps.map((app, i) => ({
        id: `step-${i + 1}`,
        service: app,
        action: 'execute',
        description: `${app} integration step`,
        params: { note: `Configure ${app} credentials in .env` },
      })),
      connections: apps.map(app => ({
        service: app,
        credentials: `\${${app.toUpperCase()}_API_KEY}`,
      })),
    }

    // Agent README
    const readme = `# Custom AI Agent — ${purpose.slice(0, 60)}

Hi ${name} — your custom AI agent is ready.

## What This Agent Does
${purpose}

## Connected Apps (${apps.length})
${apps.map(a => `- **${a}** — integrated via 0nMCP`).join('\n')}

## Trigger
${trigger}

## Files Included
- \`agent-workflow.0n\` — the workflow definition (0nMCP format)
- \`agent-config.json\` — configuration for Claude Desktop
- \`.env\` — credential placeholders
- This README

## Setup
1. Install 0nMCP: \`npm install -g 0nmcp\`
2. Drop \`agent-config.json\` into your Claude Desktop config folder
3. Fill in \`.env\` with your API credentials
4. Run: \`0nmcp run agent-workflow.0n\`

## Testing
Run the agent manually first:
\`\`\`bash
0nmcp run agent-workflow.0n --dry-run
\`\`\`

This validates all connections without executing actions.

## Need Changes?
Reply to the Fiverr order. I respond within 1 hour during US business hours.

---
RocketOpp LLC · 0ncore.com
`

    const agentConfig = {
      mcpServers: {
        '0nmcp': {
          command: 'npx',
          args: ['-y', '0nmcp@latest'],
          env: {
            ONMCP_TOKEN: '<<REPLACE>>',
            ONMCP_ENABLED_SERVICES: apps.join(','),
          },
        },
      },
    }

    const envFile = [
      '# Agent Credentials',
      'ONMCP_TOKEN=',
      '',
      ...apps.flatMap(app => [
        `# --- ${app.toUpperCase()} ---`,
        `${app.toUpperCase()}_API_KEY=`,
        '',
      ]),
    ].join('\n')

    const loomScript = `Hey ${name} — here's your custom AI agent walkthrough.

I built an agent that ${purpose}.

It connects ${apps.length} apps: ${apps.join(', ')}. The trigger is ${trigger}.

Four files in your bundle:
1. agent-workflow.0n — the workflow definition
2. agent-config.json — Claude Desktop configuration
3. .env — fill in your API credentials
4. README — full setup guide

To test it: install 0nmcp globally, fill in your .env, and run the dry-run command from the README. Once you're happy, remove the --dry-run flag.

Want to expand this into a full automation stack? 0nCore gives you visual workflow builders, 1,554 tools, and persistent agent memory. Message me for details.

Please leave a 5-star review if this works for you!`

    const deliveryMessage = `Hi ${name}!

Your custom AI agent is delivered.

What it does: ${purpose}
Apps connected: ${apps.join(', ')} (${apps.length} total)
Trigger: ${trigger}

Bundle includes:
- agent-workflow.0n (0nMCP workflow)
- agent-config.json (Claude Desktop config)
- .env with all credential placeholders
- README with setup + test instructions
- Loom walkthrough script

Setup time: ~10 minutes
Free 14-day support included.

Want a full automation stack with visual builders and 1,554 tools? Check out 0nCore at 0ncore.com.

— Mike, RocketOpp LLC`

    return {
      files: [
        { path: 'agent-workflow.0n', content: JSON.stringify(workflowFile, null, 2) },
        { path: 'agent-config.json', content: JSON.stringify(agentConfig, null, 2) },
        { path: '.env', content: envFile },
        { path: 'README.md', content: readme },
      ],
      loomScript,
      deliveryMessage,
      crmTags: ['fiverr-buyer', 'gig-ai-agent', 'upsell-0ncore-pro'],
      upsellHint: '0nCore Pro — visual workflow builder + 1,554 tools + agent memory',
    }
  },
}

export default template
