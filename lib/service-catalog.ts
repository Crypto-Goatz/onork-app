/**
 * Pre-wired Service Catalog — defines what credentials each service
 * needs and how to verify the connection is live.
 *
 * Users bring their own API keys. We store them securely and use
 * them when executing workflows through the bridge.
 */

export interface ServiceField {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  placeholder: string
  required: boolean
}

export interface ServiceDef {
  id: string
  name: string
  category: string
  icon: string
  color: string
  description: string
  fields: ServiceField[]
  verifyEndpoint: string
  verifyMethod: 'GET' | 'POST'
  verifyHeaders: (creds: Record<string, string>) => Record<string, string>
  docUrl: string
}

export const SERVICE_CATEGORIES = [
  { id: 'communication', label: 'Communication', color: '#3b82f6' },
  { id: 'crm', label: 'CRM & Sales', color: '#7ed957' },
  { id: 'marketing', label: 'Marketing', color: '#a78bfa' },
  { id: 'payments', label: 'Payments', color: '#f59e0b' },
  { id: 'ai', label: 'AI & ML', color: '#00d4ff' },
  { id: 'productivity', label: 'Productivity', color: '#ec4899' },
  { id: 'dev', label: 'Developer', color: '#ef4444' },
  { id: 'social', label: 'Social Media', color: '#06b6d4' },
  { id: 'hosting', label: 'Hosting & DNS', color: '#f97316' },
  { id: 'analytics', label: 'Analytics', color: '#8b5cf6' },
]

function bearerAuth(creds: Record<string, string>, key = 'api_key'): Record<string, string> {
  return { Authorization: `Bearer ${creds[key]}`, 'Content-Type': 'application/json' }
}

export const SERVICES: ServiceDef[] = [
  // ── Communication ──
  {
    id: 'sendgrid', name: 'SendGrid', category: 'communication', icon: 'SG', color: '#1A82E2',
    description: 'Transactional and marketing email delivery',
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'SG.xxx', required: true }],
    verifyEndpoint: 'https://api.sendgrid.com/v3/user/profile', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://docs.sendgrid.com/api-reference',
  },
  {
    id: 'twilio', name: 'Twilio', category: 'communication', icon: 'TW', color: '#F22F46',
    description: 'SMS, voice calls, and WhatsApp messaging',
    fields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'ACxxx', required: true },
      { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: 'xxx', required: true },
      { key: 'phone_number', label: 'Phone Number', type: 'text', placeholder: '+1234567890', required: false },
    ],
    verifyEndpoint: 'https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ Authorization: 'Basic ' + Buffer.from(`${c.account_sid}:${c.auth_token}`).toString('base64') }),
    docUrl: 'https://www.twilio.com/docs/usage/api',
  },
  {
    id: 'resend', name: 'Resend', category: 'communication', icon: 'RE', color: '#000000',
    description: 'Modern email API for developers',
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 're_xxx', required: true }],
    verifyEndpoint: 'https://api.resend.com/domains', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://resend.com/docs',
  },
  {
    id: 'postmark', name: 'Postmark', category: 'communication', icon: 'PM', color: '#FFDE00',
    description: 'Transactional email with delivery tracking',
    fields: [{ key: 'api_key', label: 'Server API Token', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://api.postmarkapp.com/server', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ 'X-Postmark-Server-Token': c.api_key, Accept: 'application/json' }),
    docUrl: 'https://postmarkapp.com/developer',
  },
  {
    id: 'mailgun', name: 'Mailgun', category: 'communication', icon: 'MG', color: '#F06B57',
    description: 'Email delivery and validation',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'key-xxx', required: true },
      { key: 'domain', label: 'Domain', type: 'text', placeholder: 'mg.yourdomain.com', required: true },
    ],
    verifyEndpoint: 'https://api.mailgun.net/v3/domains', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ Authorization: 'Basic ' + Buffer.from(`api:${c.api_key}`).toString('base64') }),
    docUrl: 'https://documentation.mailgun.com',
  },

  // ── CRM & Sales ──
  {
    id: 'hubspot', name: 'HubSpot', category: 'crm', icon: 'HS', color: '#FF7A59',
    description: 'CRM, marketing, and sales automation',
    fields: [{ key: 'api_key', label: 'Private App Token', type: 'password', placeholder: 'pat-xxx', required: true }],
    verifyEndpoint: 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://developers.hubspot.com/docs/api',
  },
  {
    id: 'pipedrive', name: 'Pipedrive', category: 'crm', icon: 'PD', color: '#017737',
    description: 'Sales CRM and pipeline management',
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://api.pipedrive.com/v1/users/me', verifyMethod: 'GET',
    verifyHeaders: () => ({}), docUrl: 'https://developers.pipedrive.com',
  },
  {
    id: 'salesforce', name: 'Salesforce', category: 'crm', icon: 'SF', color: '#00A1E0',
    description: 'Enterprise CRM platform',
    fields: [
      { key: 'instance_url', label: 'Instance URL', type: 'url', placeholder: 'https://yourorg.salesforce.com', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'xxx', required: true },
    ],
    verifyEndpoint: '{instance_url}/services/data/v58.0/', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ Authorization: `Bearer ${c.access_token}` }),
    docUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta',
  },

  // ── Marketing ──
  {
    id: 'mailchimp', name: 'Mailchimp', category: 'marketing', icon: 'MC', color: '#FFE01B',
    description: 'Email marketing and audience management',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx-usX', required: true },
      { key: 'server', label: 'Server Prefix', type: 'text', placeholder: 'us1', required: true },
    ],
    verifyEndpoint: 'https://{server}.api.mailchimp.com/3.0/', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ Authorization: 'Basic ' + Buffer.from(`anystring:${c.api_key}`).toString('base64') }),
    docUrl: 'https://mailchimp.com/developer/',
  },
  {
    id: 'convertkit', name: 'ConvertKit', category: 'marketing', icon: 'CK', color: '#FB6970',
    description: 'Creator-focused email marketing',
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://api.convertkit.com/v3/account', verifyMethod: 'GET',
    verifyHeaders: () => ({}), docUrl: 'https://developers.convertkit.com',
  },
  {
    id: 'activecampaign', name: 'ActiveCampaign', category: 'marketing', icon: 'AC', color: '#356AE6',
    description: 'Marketing automation and CRM',
    fields: [
      { key: 'api_url', label: 'API URL', type: 'url', placeholder: 'https://yourorg.api-us1.com', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx', required: true },
    ],
    verifyEndpoint: '{api_url}/api/3/users/me', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ 'Api-Token': c.api_key }),
    docUrl: 'https://developers.activecampaign.com',
  },

  // ── Payments ──
  {
    id: 'stripe', name: 'Stripe', category: 'payments', icon: 'ST', color: '#635BFF',
    description: 'Payment processing and subscriptions',
    fields: [{ key: 'api_key', label: 'Secret Key', type: 'password', placeholder: 'sk_xxx', required: true }],
    verifyEndpoint: 'https://api.stripe.com/v1/balance', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://stripe.com/docs/api',
  },
  {
    id: 'square', name: 'Square', category: 'payments', icon: 'SQ', color: '#006AFF',
    description: 'Payments, POS, and invoicing',
    fields: [{ key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://connect.squareup.com/v2/locations', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://developer.squareup.com/docs',
  },
  {
    id: 'paypal', name: 'PayPal', category: 'payments', icon: 'PP', color: '#003087',
    description: 'Online payments and checkout',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'xxx', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'xxx', required: true },
    ],
    verifyEndpoint: 'https://api-m.paypal.com/v1/oauth2/token', verifyMethod: 'POST',
    verifyHeaders: (c) => ({ Authorization: 'Basic ' + Buffer.from(`${c.client_id}:${c.client_secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }),
    docUrl: 'https://developer.paypal.com/docs/api/',
  },

  // ── AI & ML ──
  {
    id: 'openai', name: 'OpenAI', category: 'ai', icon: 'OA', color: '#10A37F',
    description: 'GPT, DALL-E, Whisper, embeddings',
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-xxx', required: true }],
    verifyEndpoint: 'https://api.openai.com/v1/models', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://platform.openai.com/docs',
  },
  {
    id: 'anthropic', name: 'Anthropic', category: 'ai', icon: 'AN', color: '#D4A27F',
    description: 'Claude AI models and API',
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-xxx', required: true }],
    verifyEndpoint: 'https://api.anthropic.com/v1/messages', verifyMethod: 'POST',
    verifyHeaders: (c) => ({ 'x-api-key': c.api_key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }),
    docUrl: 'https://docs.anthropic.com',
  },
  {
    id: 'groq', name: 'Groq', category: 'ai', icon: 'GQ', color: '#F55036',
    description: 'Ultra-fast LLM inference',
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'gsk_xxx', required: true }],
    verifyEndpoint: 'https://api.groq.com/openai/v1/models', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://console.groq.com/docs',
  },
  {
    id: 'elevenlabs', name: 'ElevenLabs', category: 'ai', icon: 'EL', color: '#000000',
    description: 'AI voice synthesis and cloning',
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://api.elevenlabs.io/v1/user', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ 'xi-api-key': c.api_key }),
    docUrl: 'https://docs.elevenlabs.io',
  },
  {
    id: 'deepgram', name: 'Deepgram', category: 'ai', icon: 'DG', color: '#13EF93',
    description: 'Speech-to-text and audio intelligence',
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://api.deepgram.com/v1/projects', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://developers.deepgram.com',
  },

  // ── Productivity ──
  {
    id: 'notion', name: 'Notion', category: 'productivity', icon: 'NO', color: '#000000',
    description: 'Docs, wikis, and project management',
    fields: [{ key: 'api_key', label: 'Integration Token', type: 'password', placeholder: 'secret_xxx', required: true }],
    verifyEndpoint: 'https://api.notion.com/v1/users/me', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ Authorization: `Bearer ${c.api_key}`, 'Notion-Version': '2022-06-28' }),
    docUrl: 'https://developers.notion.com',
  },
  {
    id: 'airtable', name: 'Airtable', category: 'productivity', icon: 'AT', color: '#18BFFF',
    description: 'Spreadsheet-database hybrid',
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'patxxx', required: true }],
    verifyEndpoint: 'https://api.airtable.com/v0/meta/whoami', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://airtable.com/developers/web/api',
  },
  {
    id: 'linear', name: 'Linear', category: 'productivity', icon: 'LI', color: '#5E6AD2',
    description: 'Issue tracking for software teams',
    fields: [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'lin_api_xxx', required: true }],
    verifyEndpoint: 'https://api.linear.app/graphql', verifyMethod: 'POST',
    verifyHeaders: (c) => ({ Authorization: c.api_key, 'Content-Type': 'application/json' }),
    docUrl: 'https://developers.linear.app',
  },
  {
    id: 'asana', name: 'Asana', category: 'productivity', icon: 'AS', color: '#F06A6A',
    description: 'Project and task management',
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://app.asana.com/api/1.0/users/me', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://developers.asana.com',
  },
  {
    id: 'calendly', name: 'Calendly', category: 'productivity', icon: 'CA', color: '#006BFF',
    description: 'Scheduling and appointment booking',
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://api.calendly.com/users/me', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://developer.calendly.com',
  },

  // ── Developer ──
  {
    id: 'github', name: 'GitHub', category: 'dev', icon: 'GH', color: '#181717',
    description: 'Repos, issues, actions, and deployments',
    fields: [{ key: 'api_key', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_xxx', required: true }],
    verifyEndpoint: 'https://api.github.com/user', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://docs.github.com/en/rest',
  },
  {
    id: 'vercel', name: 'Vercel', category: 'dev', icon: 'VC', color: '#000000',
    description: 'Deployment and serverless hosting',
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://api.vercel.com/v2/user', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://vercel.com/docs/rest-api',
  },
  {
    id: 'supabase', name: 'Supabase', category: 'dev', icon: 'SB', color: '#3ECF8E',
    description: 'Postgres database, auth, and storage',
    fields: [
      { key: 'url', label: 'Project URL', type: 'url', placeholder: 'https://xxx.supabase.co', required: true },
      { key: 'api_key', label: 'Service Role Key', type: 'password', placeholder: 'eyJxxx', required: true },
    ],
    verifyEndpoint: '{url}/rest/v1/', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ apikey: c.api_key, Authorization: `Bearer ${c.api_key}` }),
    docUrl: 'https://supabase.com/docs',
  },
  {
    id: 'mongodb', name: 'MongoDB Atlas', category: 'dev', icon: 'MO', color: '#47A248',
    description: 'Cloud database and data services',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx', required: true },
      { key: 'group_id', label: 'Project/Group ID', type: 'text', placeholder: 'xxx', required: true },
    ],
    verifyEndpoint: 'https://cloud.mongodb.com/api/atlas/v1.0/groups/{group_id}', verifyMethod: 'GET',
    verifyHeaders: () => ({}), docUrl: 'https://www.mongodb.com/docs/atlas/api/',
  },

  // ── Social Media ──
  {
    id: 'twitter', name: 'X (Twitter)', category: 'social', icon: 'X', color: '#000000',
    description: 'Post tweets, manage followers, search',
    fields: [{ key: 'bearer_token', label: 'Bearer Token', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://api.twitter.com/2/users/me', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ Authorization: `Bearer ${c.bearer_token}` }),
    docUrl: 'https://developer.twitter.com/en/docs',
  },
  {
    id: 'linkedin', name: 'LinkedIn', category: 'social', icon: 'LN', color: '#0A66C2',
    description: 'Professional networking and content',
    fields: [{ key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://api.linkedin.com/v2/userinfo', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c, 'access_token'), docUrl: 'https://learn.microsoft.com/en-us/linkedin/',
  },
  {
    id: 'instagram', name: 'Instagram', category: 'social', icon: 'IG', color: '#E4405F',
    description: 'Instagram Graph API for business accounts',
    fields: [{ key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://graph.instagram.com/me', verifyMethod: 'GET',
    verifyHeaders: () => ({}), docUrl: 'https://developers.facebook.com/docs/instagram-api/',
  },

  // ── Hosting & DNS ──
  {
    id: 'cloudflare', name: 'Cloudflare', category: 'hosting', icon: 'CF', color: '#F48120',
    description: 'DNS, CDN, security, and workers',
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://api.cloudflare.com/client/v4/user/tokens/verify', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://developers.cloudflare.com/api/',
  },
  {
    id: 'godaddy', name: 'GoDaddy', category: 'hosting', icon: 'GD', color: '#1BDBDB',
    description: 'Domain registration and DNS',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'xxx', required: true },
    ],
    verifyEndpoint: 'https://api.godaddy.com/v1/domains', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ Authorization: `sso-key ${c.api_key}:${c.api_secret}` }),
    docUrl: 'https://developer.godaddy.com',
  },
  {
    id: 'hostinger', name: 'Hostinger', category: 'hosting', icon: 'HO', color: '#673DE6',
    description: 'Web hosting, VPS, domains, DNS — 118+ MCP tools',
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxx (from hPanel → Profile → API)', required: true }],
    verifyEndpoint: 'https://developers.hostinger.com/api/dns/v1/zones', verifyMethod: 'GET',
    verifyHeaders: (c) => bearerAuth(c), docUrl: 'https://developers.hostinger.com',
  },

  // ── Video & Media ──
  {
    id: 'heygen', name: 'HeyGen', category: 'ai', icon: 'HG', color: '#5046E5',
    description: 'AI video generation — avatars, text-to-speech, video translation, personalized outreach',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx (from app.heygen.com → Settings → API)', required: true },
    ],
    verifyEndpoint: 'https://api.heygen.com/v2/user/me', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ 'X-Api-Key': c.api_key, Accept: 'application/json' }),
    docUrl: 'https://developers.heygen.com',
  },
  {
    id: 'heygen_mcp', name: 'HeyGen MCP', category: 'ai', icon: 'HG', color: '#5046E5',
    description: 'HeyGen remote MCP server — create videos, TTS, translate via MCP protocol (OAuth)',
    fields: [
      { key: 'mcp_url', label: 'MCP Server URL', type: 'url', placeholder: 'https://mcp.heygen.com/mcp/v1/', required: true },
      { key: 'oauth_token', label: 'OAuth Token (after auth)', type: 'password', placeholder: 'Bearer token from OAuth flow', required: false },
    ],
    verifyEndpoint: '', verifyMethod: 'GET',
    verifyHeaders: () => ({}),
    docUrl: 'https://developers.heygen.com/mcp/overview',
  },

  // ── Analytics ──
  {
    id: 'google_analytics', name: 'Google Analytics', category: 'analytics', icon: 'GA', color: '#F9AB00',
    description: 'Website traffic and user behavior',
    fields: [
      { key: 'property_id', label: 'GA4 Property ID', type: 'text', placeholder: '123456789', required: true },
      { key: 'service_account', label: 'Service Account JSON', type: 'password', placeholder: '{"type":"service_account",...}', required: true },
    ],
    verifyEndpoint: 'https://analyticsdata.googleapis.com/v1beta/properties/{property_id}/metadata', verifyMethod: 'GET',
    verifyHeaders: () => ({}), docUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
  },
  {
    id: 'mixpanel', name: 'Mixpanel', category: 'analytics', icon: 'MP', color: '#7856FF',
    description: 'Product analytics and user tracking',
    fields: [
      { key: 'api_key', label: 'Project Token', type: 'password', placeholder: 'xxx', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'xxx', required: true },
    ],
    verifyEndpoint: 'https://mixpanel.com/api/app/me', verifyMethod: 'GET',
    verifyHeaders: () => ({}), docUrl: 'https://developer.mixpanel.com',
  },

  // ── Shopify / eCommerce ──
  {
    id: 'shopify', name: 'Shopify', category: 'crm', icon: 'SH', color: '#7AB55C',
    description: 'E-commerce platform',
    fields: [
      { key: 'store_url', label: 'Store URL', type: 'url', placeholder: 'yourstore.myshopify.com', required: true },
      { key: 'api_key', label: 'Admin API Access Token', type: 'password', placeholder: 'shpat_xxx', required: true },
    ],
    verifyEndpoint: 'https://{store_url}/admin/api/2024-01/shop.json', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ 'X-Shopify-Access-Token': c.api_key }),
    docUrl: 'https://shopify.dev/docs/api/admin-rest',
  },
  {
    id: 'woocommerce', name: 'WooCommerce', category: 'crm', icon: 'WC', color: '#96588A',
    description: 'WordPress e-commerce',
    fields: [
      { key: 'store_url', label: 'Store URL', type: 'url', placeholder: 'https://yourstore.com', required: true },
      { key: 'consumer_key', label: 'Consumer Key', type: 'password', placeholder: 'ck_xxx', required: true },
      { key: 'consumer_secret', label: 'Consumer Secret', type: 'password', placeholder: 'cs_xxx', required: true },
    ],
    verifyEndpoint: '{store_url}/wp-json/wc/v3/system_status', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ Authorization: 'Basic ' + Buffer.from(`${c.consumer_key}:${c.consumer_secret}`).toString('base64') }),
    docUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
  },

  // ── Google Workspace ──
  {
    id: 'google_sheets', name: 'Google Sheets', category: 'productivity', icon: 'GS', color: '#34A853',
    description: 'Spreadsheet data access and manipulation',
    fields: [{ key: 'service_account', label: 'Service Account JSON', type: 'password', placeholder: '{"type":"service_account",...}', required: true }],
    verifyEndpoint: 'https://sheets.googleapis.com/v4/spreadsheets', verifyMethod: 'GET',
    verifyHeaders: () => ({}), docUrl: 'https://developers.google.com/sheets/api',
  },

  // ── Automation ──
  {
    id: 'zapier', name: 'Zapier', category: 'productivity', icon: 'ZP', color: '#FF4A00',
    description: 'Workflow automation between apps',
    fields: [{ key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.zapier.com/xxx', required: true }],
    verifyEndpoint: '', verifyMethod: 'GET',
    verifyHeaders: () => ({}), docUrl: 'https://zapier.com/developer',
  },
  {
    id: 'n8n', name: 'n8n', category: 'productivity', icon: 'N8', color: '#EA4B71',
    description: 'Self-hosted workflow automation',
    fields: [
      { key: 'base_url', label: 'Instance URL', type: 'url', placeholder: 'https://your-n8n.com', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxx', required: true },
    ],
    verifyEndpoint: '{base_url}/api/v1/workflows', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ 'X-N8N-API-KEY': c.api_key }),
    docUrl: 'https://docs.n8n.io/api/',
  },
  {
    id: 'make', name: 'Make (Integromat)', category: 'productivity', icon: 'MK', color: '#6D00CC',
    description: 'Visual automation platform',
    fields: [{ key: 'api_key', label: 'API Token', type: 'password', placeholder: 'xxx', required: true }],
    verifyEndpoint: 'https://us1.make.com/api/v2/users/me', verifyMethod: 'GET',
    verifyHeaders: (c) => ({ Authorization: `Token ${c.api_key}` }),
    docUrl: 'https://www.make.com/en/api-documentation',
  },
]

export function getServiceById(id: string): ServiceDef | undefined {
  return SERVICES.find(s => s.id === id)
}

export function getServicesByCategory(category: string): ServiceDef[] {
  return SERVICES.filter(s => s.category === category)
}
