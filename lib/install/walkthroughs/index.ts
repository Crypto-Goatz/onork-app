/**
 * Walkthrough registry. Maps integration_id (or walkthrough_id) → Walkthrough.
 *
 * Each integration listed in lib/install/registry.ts gets a walkthrough here.
 * Available integrations get full step lists; coming_soon ones get a 1-step
 * "we'll let you know" placeholder so the UI can still render the drawer if
 * the user clicks through.
 */

import type { Walkthrough } from './types'

const WALKTHROUGHS: Record<string, Walkthrough> = {
  walkthrough_ai_claude: {
    id: 'walkthrough_ai_claude',
    integration_id: 'ai.claude',
    estimated_minutes: 4,
    prerequisites: ['Claude Desktop installed', 'Node.js 18+'],
    steps: [
      {
        id: 'install_npm',
        title: 'Install the 0nmcp package',
        body_md:
          'Run this command in your terminal. It installs the MCP server that bridges Claude to every 0nCore tool.',
        copy_blocks: [{ label: 'Install command', value: 'npm install -g 0nmcp' }],
      },
      {
        id: 'add_mcp_config',
        title: 'Add 0nMCP to Claude Desktop',
        body_md:
          'Open `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows) and add the entry below.',
        copy_blocks: [
          {
            label: 'mcp config',
            value: '{\n  "mcpServers": {\n    "0nmcp": {\n      "command": "0nmcp"\n    }\n  }\n}',
          },
        ],
      },
      {
        id: 'paste_api_key',
        title: 'Authenticate with your 0nCore API key',
        body_md:
          'Generate a `0n_` token at /dashboard/settings/tokens, then run `0nmcp engine import` and paste it when prompted.',
        external_link: { label: 'Open token settings', href: '/dashboard/settings/tokens' },
      },
      {
        id: 'restart_claude',
        title: 'Restart Claude Desktop',
        body_md: "Quit and reopen Claude. You'll see the 0nmcp tools listed in the tool picker.",
      },
    ],
  },

  walkthrough_ai_chatgpt: {
    id: 'walkthrough_ai_chatgpt',
    integration_id: 'ai.chatgpt',
    estimated_minutes: 5,
    prerequisites: ['ChatGPT Plus or Team subscription'],
    steps: [
      {
        id: 'open_gpt_builder',
        title: 'Open the GPT builder',
        body_md: 'Go to ChatGPT → Explore GPTs → Create.',
        external_link: { label: 'Open GPT builder', href: 'https://chat.openai.com/gpts/editor' },
      },
      {
        id: 'paste_actions_schema',
        title: 'Add the 0nCore Actions schema',
        body_md: 'In Configure → Actions, paste the OpenAPI schema below and save.',
        copy_blocks: [
          { label: 'Schema URL', value: 'https://www.0ncore.com/api/openapi.json' },
        ],
      },
      {
        id: 'add_api_key',
        title: 'Authenticate',
        body_md:
          'Set Authentication → API Key → Bearer, paste your `0n_` token from /dashboard/settings/tokens.',
        external_link: { label: 'Get API key', href: '/dashboard/settings/tokens' },
      },
      {
        id: 'publish_gpt',
        title: 'Publish your GPT',
        body_md: 'Save the GPT to your account or publish it to your team workspace.',
      },
    ],
  },

  walkthrough_browser_chrome: {
    id: 'walkthrough_browser_chrome',
    integration_id: 'browser.chrome',
    estimated_minutes: 2,
    steps: [
      {
        id: 'download_extension',
        title: 'Download the extension',
        body_md: 'Grab the latest packaged extension from /downloads.',
        external_link: { label: 'Download .zip', href: '/downloads' },
      },
      {
        id: 'load_unpacked',
        title: 'Load it into Chrome',
        body_md:
          'Open `chrome://extensions`, enable Developer mode, click **Load unpacked**, select the unzipped folder.',
        external_link: { label: 'Open chrome://extensions', href: 'chrome://extensions' },
      },
      {
        id: 'sign_in',
        title: 'Sign in',
        body_md: 'Click the 0n icon in the toolbar and sign in with your 0nCore account.',
      },
    ],
  },

  walkthrough_cms_wordpress: {
    id: 'walkthrough_cms_wordpress',
    integration_id: 'cms.wordpress',
    estimated_minutes: 5,
    prerequisites: ['WordPress 6.0+ admin access'],
    steps: [
      {
        id: 'download_plugin',
        title: 'Download the 0nWP plugin',
        body_md: 'Get the latest .zip from /downloads.',
        external_link: { label: 'Download', href: '/downloads' },
      },
      {
        id: 'upload_plugin',
        title: 'Upload to WordPress',
        body_md:
          'In WP admin → Plugins → Add New → Upload Plugin. Choose the .zip and Install Now.',
      },
      {
        id: 'activate_plugin',
        title: 'Activate',
        body_md: 'Click Activate. The 0nWP menu appears in the WP sidebar.',
      },
      {
        id: 'connect_account',
        title: 'Connect your 0nCore account',
        body_md: 'In 0nWP → Settings, paste your `0n_` token.',
      },
    ],
  },

  walkthrough_team_slack: {
    id: 'walkthrough_team_slack',
    integration_id: 'team.slack',
    estimated_minutes: 6,
    prerequisites: ['Admin access to your Slack workspace'],
    steps: [
      {
        id: 'sign_in_with_slack',
        title: 'Sign in with Slack',
        body_md:
          'Click the button below to authorize 0n with your Slack workspace. We use OAuth — no manual token wrangling.',
        external_link: { label: 'Connect Slack', href: '/api/auth/connect/slack' },
      },
      {
        id: 'verify_bot_in_channel',
        title: 'Verify the bot can post',
        body_md: "We'll send a test message to your default Slack channel.",
        verify: {
          kind: 'api_check',
          endpoint: '/api/installs/verify?integration_id=team.slack&step_id=verify_bot_in_channel',
          success_message: 'Bot posted successfully',
        },
      },
      {
        id: 'enable_slash_commands',
        title: 'Try a slash command',
        body_md:
          'In any channel, type `/0n` to see the 8 available commands. Pick one and run it.',
      },
    ],
  },

  walkthrough_team_telegram: {
    id: 'walkthrough_team_telegram',
    integration_id: 'team.telegram',
    estimated_minutes: 3,
    steps: [
      {
        id: 'open_bot',
        title: 'Open the bot',
        body_md: 'Search Telegram for `@0nMCPBot` and start a chat.',
        external_link: { label: 'Open bot', href: 'https://t.me/0nMCPBot' },
      },
      {
        id: 'pair_account',
        title: 'Pair with your 0nCore account',
        body_md: 'Send `/start` then paste the 6-digit pairing code from /dashboard/settings/integrations.',
        external_link: { label: 'Get pairing code', href: '/dashboard/settings/integrations' },
      },
    ],
  },

  walkthrough_pm_ticktick: {
    id: 'walkthrough_pm_ticktick',
    integration_id: 'pm.ticktick',
    estimated_minutes: 2,
    steps: [
      {
        id: 'authorize_ticktick',
        title: 'Authorize TickTick',
        body_md: 'Click Connect to OAuth into TickTick.',
        external_link: { label: 'Connect TickTick', href: '/api/auth/connect/ticktick' },
      },
      {
        id: 'pick_default_list',
        title: 'Choose default list',
        body_md: 'Pick the TickTick list that 0nCore tasks should sync to.',
      },
    ],
  },

  walkthrough_pm_clickup: {
    id: 'walkthrough_pm_clickup',
    integration_id: 'pm.clickup',
    estimated_minutes: 2,
    steps: [
      {
        id: 'authorize_clickup',
        title: 'Authorize ClickUp',
        body_md: 'OAuth into ClickUp and pick the workspace.',
        external_link: { label: 'Connect ClickUp', href: '/api/auth/connect/clickup' },
      },
      {
        id: 'map_lists',
        title: 'Map lists',
        body_md: 'Pick which ClickUp space and list 0nCore should sync with.',
      },
    ],
  },

  walkthrough_pm_monday: {
    id: 'walkthrough_pm_monday',
    integration_id: 'pm.monday',
    estimated_minutes: 3,
    steps: [
      {
        id: 'authorize_monday',
        title: 'Authorize Monday',
        body_md: 'Connect via OAuth.',
        external_link: { label: 'Connect Monday', href: '/api/auth/connect/monday' },
      },
      {
        id: 'pick_board',
        title: 'Pick board + columns',
        body_md: 'Choose the Monday board and map columns to 0nCore task fields.',
      },
    ],
  },

  walkthrough_pm_whimsical: {
    id: 'walkthrough_pm_whimsical',
    integration_id: 'pm.whimsical',
    estimated_minutes: 2,
    steps: [
      {
        id: 'authorize_whimsical',
        title: 'Authorize Whimsical',
        body_md: 'Connect via Whimsical OAuth.',
        external_link: { label: 'Connect Whimsical', href: '/api/auth/connect/whimsical' },
      },
    ],
  },

  walkthrough_crm_rocket: {
    id: 'walkthrough_crm_rocket',
    integration_id: 'crm.rocket',
    estimated_minutes: 5,
    prerequisites: ['Active CRM sub-account'],
    steps: [
      {
        id: 'open_marketplace',
        title: 'Open the CRM Marketplace',
        body_md: 'In your CRM sub-account → Marketplace → search for "0nCore".',
      },
      {
        id: 'install_app',
        title: 'Install the app',
        body_md: 'Click Install and approve the requested scopes.',
      },
      {
        id: 'verify_sync',
        title: 'Verify two-way sync',
        body_md: 'Run the sync verifier to confirm contacts flow both directions.',
        external_link: { label: 'Open verifier', href: '/dashboard/onboarding/crm' },
      },
    ],
  },

  walkthrough_dev_npm: {
    id: 'walkthrough_dev_npm',
    integration_id: 'dev.npm',
    estimated_minutes: 1,
    steps: [
      {
        id: 'install',
        title: 'Install',
        body_md: 'Run the install command.',
        copy_blocks: [{ label: 'Command', value: 'npm install -g 0nmcp' }],
      },
      {
        id: 'verify_cli',
        title: 'Verify',
        body_md: 'Run `0nmcp engine verify` to check the install.',
        copy_blocks: [{ label: 'Command', value: '0nmcp engine verify' }],
      },
    ],
  },

  walkthrough_dev_apikey: {
    id: 'walkthrough_dev_apikey',
    integration_id: 'dev.apikey',
    estimated_minutes: 1,
    steps: [
      {
        id: 'open_settings',
        title: 'Open token settings',
        body_md: 'Go to /dashboard/settings/tokens.',
        external_link: { label: 'Open settings', href: '/dashboard/settings/tokens' },
      },
      {
        id: 'create_token',
        title: 'Create a token',
        body_md: 'Name it, choose scopes, and copy the `0n_` value once it appears (you will not see it again).',
      },
    ],
  },

  walkthrough_dev_cli: {
    id: 'walkthrough_dev_cli',
    integration_id: 'dev.cli',
    estimated_minutes: 2,
    steps: [
      {
        id: 'install_homebrew',
        title: 'Install via Homebrew (macOS)',
        body_md: 'Run the brew command below.',
        copy_blocks: [{ label: 'Brew', value: 'brew install 0nork/tap/0nmcp' }],
      },
      {
        id: 'or_install_npm',
        title: 'Or via npm',
        body_md: 'If you prefer npm: install globally.',
        copy_blocks: [{ label: 'npm', value: 'npm install -g 0nmcp' }],
      },
    ],
  },
}

// Coming-soon placeholder used when an integration has no full walkthrough yet.
const COMING_SOON_PLACEHOLDER: Walkthrough = {
  id: 'walkthrough_coming_soon',
  integration_id: '',
  estimated_minutes: 0,
  steps: [
    {
      id: 'notify_me',
      title: "We'll email you when this is ready",
      body_md:
        "This integration is on the roadmap. Drop your email below and you'll be the first to know when it ships.",
    },
  ],
}

export function getWalkthrough(walkthroughId: string): Walkthrough | null {
  return WALKTHROUGHS[walkthroughId] ?? null
}

export function getWalkthroughForIntegration(integrationId: string): Walkthrough | null {
  return Object.values(WALKTHROUGHS).find((w) => w.integration_id === integrationId) ?? null
}

export { COMING_SOON_PLACEHOLDER }
