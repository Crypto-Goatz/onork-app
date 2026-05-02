/**
 * Unified Install Hub — integration registry.
 *
 * The single source of truth for every installable integration in the 0n
 * ecosystem. Per docs/unified-install-hub-spec.md §4, this file contains
 * ONLY the catalog. Per-tenant copy lives in bot_settings; walkthroughs
 * live in lib/install/walkthroughs/<id>.ts.
 *
 * Status taxonomy (spec §3):
 *   - 'available'    : ready to install
 *   - 'coming_soon'  : email-capture only
 */

export type IntegrationCategory =
  | 'ai'
  | 'browser'
  | 'cms'
  | 'team'
  | 'pm'
  | 'crm'
  | 'dev'

export type IntegrationStatus = 'available' | 'coming_soon'

/** Lucide icon names — keep as strings; the renderer maps them to components. */
export type LucideIconName =
  | 'Sparkles'
  | 'Bot'
  | 'Globe'
  | 'Chrome'
  | 'Compass'
  | 'FileCode'
  | 'ShoppingBag'
  | 'MessageCircle'
  | 'MessagesSquare'
  | 'Hash'
  | 'CheckSquare'
  | 'List'
  | 'Calendar'
  | 'Brain'
  | 'Database'
  | 'Building2'
  | 'Briefcase'
  | 'Package'
  | 'Key'
  | 'Terminal'

export interface Integration {
  id: string
  name: string
  category: IntegrationCategory
  status: IntegrationStatus
  description: string
  icon: LucideIconName
  walkthrough_id: string
  marketing_href?: string
  manage_href?: string
  search_terms: string[]
}

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  ai: 'AI Platforms',
  browser: 'Browser Extensions',
  cms: 'CMS & Websites',
  team: 'Workspace & Team',
  pm: 'Productivity & PM',
  crm: 'CRM & Sales',
  dev: 'Developer Tools',
}

export const INTEGRATIONS: Integration[] = [
  // 3.1 AI Platforms
  {
    id: 'ai.chatgpt',
    name: 'ChatGPT',
    category: 'ai',
    status: 'available',
    description:
      'Custom GPT in the GPT Store — calls 0nMCP tools through the GPT Actions schema.',
    icon: 'Bot',
    walkthrough_id: 'walkthrough_ai_chatgpt',
    search_terms: ['gpt', 'openai', 'chatgpt', 'gpts', 'actions'],
  },
  {
    id: 'ai.claude',
    name: 'Claude',
    category: 'ai',
    status: 'available',
    description:
      'MCP server via the 0nmcp npm package — adds 1,500+ tools to Claude Desktop and Claude Code.',
    icon: 'Sparkles',
    walkthrough_id: 'walkthrough_ai_claude',
    search_terms: ['claude', 'anthropic', 'mcp', 'desktop'],
  },
  {
    id: 'ai.perplexity',
    name: 'Perplexity',
    category: 'ai',
    status: 'coming_soon',
    description: 'Integration via Perplexity Spaces and the custom-tool surface.',
    icon: 'Compass',
    walkthrough_id: 'walkthrough_ai_perplexity',
    search_terms: ['perplexity', 'pplx', 'spaces'],
  },
  {
    id: 'ai.gemini',
    name: 'Gemini',
    category: 'ai',
    status: 'coming_soon',
    description: 'Integration via Gemini Extensions.',
    icon: 'Sparkles',
    walkthrough_id: 'walkthrough_ai_gemini',
    search_terms: ['gemini', 'google ai', 'bard', 'extensions'],
  },
  {
    id: 'ai.grok',
    name: 'Grok',
    category: 'ai',
    status: 'coming_soon',
    description: "Integration via xAI's tool-use API.",
    icon: 'Sparkles',
    walkthrough_id: 'walkthrough_ai_grok',
    search_terms: ['grok', 'xai', 'twitter ai'],
  },

  // 3.2 Browser Extensions
  {
    id: 'browser.chrome',
    name: 'Chrome Extension',
    category: 'browser',
    status: 'available',
    description:
      '0n site manager — LinkedIn workflows, Fiverr generator, stack scanner, inline flows on any page.',
    icon: 'Chrome',
    walkthrough_id: 'walkthrough_browser_chrome',
    search_terms: ['chrome', 'extension', 'browser', 'linkedin', 'sidebar'],
  },
  {
    id: 'browser.firefox',
    name: 'Firefox Extension',
    category: 'browser',
    status: 'coming_soon',
    description: 'Manifest V2/V3 hybrid build of the Chrome extension.',
    icon: 'Globe',
    walkthrough_id: 'walkthrough_browser_firefox',
    search_terms: ['firefox', 'mozilla', 'extension', 'addon'],
  },
  {
    id: 'browser.edge',
    name: 'Edge Extension',
    category: 'browser',
    status: 'coming_soon',
    description: 'Microsoft Edge add-on store distribution.',
    icon: 'Globe',
    walkthrough_id: 'walkthrough_browser_edge',
    search_terms: ['edge', 'microsoft', 'extension'],
  },

  // 3.3 CMS / Websites
  {
    id: 'cms.wordpress',
    name: 'WordPress Plugin (0nWP)',
    category: 'cms',
    status: 'available',
    description:
      'AI content engine, Jaxx chat widget, SXO transforms, auto-publishing from bot_settings.',
    icon: 'FileCode',
    walkthrough_id: 'walkthrough_cms_wordpress',
    search_terms: ['wordpress', 'wp', 'plugin', '0nwp', 'jaxx'],
  },
  {
    id: 'cms.shopify',
    name: 'Shopify App',
    category: 'cms',
    status: 'coming_soon',
    description: 'Embedded admin app for product/page SXO + Jaxx chat.',
    icon: 'ShoppingBag',
    walkthrough_id: 'walkthrough_cms_shopify',
    search_terms: ['shopify', 'ecommerce', 'app'],
  },

  // 3.4 Workspace / Team
  {
    id: 'team.slack',
    name: 'Slack Bot (0n Bot)',
    category: 'team',
    status: 'available',
    description:
      '8 slash commands, Jaxx AI in DMs, App Home dashboard, event ingestion to slack_events.',
    icon: 'Hash',
    walkthrough_id: 'walkthrough_team_slack',
    search_terms: ['slack', 'bot', 'workspace', 'jaxx'],
  },
  {
    id: 'team.telegram',
    name: 'Telegram Bot',
    category: 'team',
    status: 'available',
    description: 'DM Jaxx + group commands.',
    icon: 'MessageCircle',
    walkthrough_id: 'walkthrough_team_telegram',
    search_terms: ['telegram', 'bot', 'messaging'],
  },
  {
    id: 'team.discord',
    name: 'Discord Bot',
    category: 'team',
    status: 'coming_soon',
    description: 'Slash commands + Jaxx threads.',
    icon: 'MessagesSquare',
    walkthrough_id: 'walkthrough_team_discord',
    search_terms: ['discord', 'bot', 'gaming', 'community'],
  },

  // 3.5 Productivity / PM
  {
    id: 'pm.ticktick',
    name: 'TickTick',
    category: 'pm',
    status: 'available',
    description: 'Two-way sync of the tasks table with TickTick lists.',
    icon: 'CheckSquare',
    walkthrough_id: 'walkthrough_pm_ticktick',
    search_terms: ['ticktick', 'tasks', 'todo', 'gtd'],
  },
  {
    id: 'pm.clickup',
    name: 'ClickUp',
    category: 'pm',
    status: 'available',
    description: 'OAuth-linked sync of spaces, lists, and tasks.',
    icon: 'List',
    walkthrough_id: 'walkthrough_pm_clickup',
    search_terms: ['clickup', 'tasks', 'project management'],
  },
  {
    id: 'pm.monday',
    name: 'Monday.com',
    category: 'pm',
    status: 'available',
    description: 'Board sync with column mapping configured in bot_settings.',
    icon: 'Calendar',
    walkthrough_id: 'walkthrough_pm_monday',
    search_terms: ['monday', 'monday.com', 'boards', 'project management'],
  },
  {
    id: 'pm.whimsical',
    name: 'Whimsical',
    category: 'pm',
    status: 'available',
    description: 'Mind-map and flowchart embedding via the Whimsical MCP. Best-effort.',
    icon: 'Brain',
    walkthrough_id: 'walkthrough_pm_whimsical',
    search_terms: ['whimsical', 'mindmap', 'flowchart', 'diagram'],
  },

  // 3.6 CRM / Sales
  {
    id: 'crm.rocket',
    name: 'ROCKET Marketplace',
    category: 'crm',
    status: 'available',
    description:
      'Marketplace + agency app — installs Course Builder, 0nExec, and Canvas inside the CRM.',
    icon: 'Database',
    walkthrough_id: 'walkthrough_crm_rocket',
    search_terms: ['crm', 'rocket', 'marketplace', 'agency', 'sales'],
  },
  {
    id: 'crm.salesforce',
    name: 'Salesforce',
    category: 'crm',
    status: 'coming_soon',
    description: 'Managed package on AppExchange.',
    icon: 'Building2',
    walkthrough_id: 'walkthrough_crm_salesforce',
    search_terms: ['salesforce', 'sfdc', 'crm', 'enterprise'],
  },
  {
    id: 'crm.pipedrive',
    name: 'Pipedrive',
    category: 'crm',
    status: 'coming_soon',
    description: 'Marketplace app with OAuth + webhook triggers.',
    icon: 'Briefcase',
    walkthrough_id: 'walkthrough_crm_pipedrive',
    search_terms: ['pipedrive', 'crm', 'pipeline'],
  },

  // 3.7 Developer Tools
  {
    id: 'dev.npm',
    name: 'npm package (0nmcp)',
    category: 'dev',
    status: 'available',
    description: 'npm install -g 0nmcp — full CLI plus MCP server.',
    icon: 'Package',
    walkthrough_id: 'walkthrough_dev_npm',
    search_terms: ['npm', 'node', 'cli', '0nmcp'],
  },
  {
    id: 'dev.apikey',
    name: 'API Key',
    category: 'dev',
    status: 'available',
    description:
      'Generate a 0n_ token scoped to your account for direct REST calls.',
    icon: 'Key',
    walkthrough_id: 'walkthrough_dev_apikey',
    search_terms: ['api', 'key', 'token', 'rest', '0n_'],
  },
  {
    id: 'dev.cli',
    name: 'CLI Tool',
    category: 'dev',
    status: 'available',
    description: 'Standalone 0nmcp CLI — same package, alternate install paths.',
    icon: 'Terminal',
    walkthrough_id: 'walkthrough_dev_cli',
    search_terms: ['cli', 'terminal', 'command line', 'shell'],
  },
]

export function getIntegrationById(id: string): Integration | null {
  return INTEGRATIONS.find((i) => i.id === id) ?? null
}

export function searchIntegrations(query: string): Integration[] {
  const q = query.trim().toLowerCase()
  if (!q) return INTEGRATIONS
  return INTEGRATIONS.filter((i) => {
    if (i.name.toLowerCase().includes(q)) return true
    if (i.description.toLowerCase().includes(q)) return true
    if (i.search_terms.some((t) => t.toLowerCase().includes(q))) return true
    return false
  })
}
