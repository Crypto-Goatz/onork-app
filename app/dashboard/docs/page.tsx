'use client'

import { useState } from 'react'

type DocSection = 'getting-started' | 'api' | 'mcp' | 'webhooks' | 'integrations' | 'billing' | 'security'

const SECTIONS: { key: DocSection; title: string; description: string; icon: string }[] = [
  { key: 'getting-started', title: 'Getting Started', description: 'Connect your CRM, install add-ons, and set up your first automation.', icon: '🚀' },
  { key: 'api', title: 'API Reference', description: 'Full REST API documentation for all 0nCore endpoints.', icon: '📡' },
  { key: 'mcp', title: 'MCP Server', description: 'Set up the 0nMCP server for Claude, Cursor, and other AI tools.', icon: '🧠' },
  { key: 'webhooks', title: 'Webhooks', description: 'Configure webhook receivers for Stripe, CRM, and custom events.', icon: '🔗' },
  { key: 'integrations', title: 'Integrations', description: 'Connect to 96+ services — Slack, Gmail, Stripe, GitHub, and more.', icon: '⚡' },
  { key: 'billing', title: 'Billing & Rebilling', description: 'Sub-location billing, Stripe checkout, metered usage, and markup.', icon: '💳' },
  { key: 'security', title: 'Security & Vault', description: 'AES-256 encryption, credential vault, and API key management.', icon: '🔒' },
]

const DOCS: Record<DocSection, { title: string; content: string }[]> = {
  'getting-started': [
    { title: '1. Create your account', content: 'Sign up at 0ncore.com. Your account is automatically provisioned with a CRM sub-location, Supabase database, and Stripe billing.' },
    { title: '2. Connect your CRM', content: 'Go to Dashboard → Integrations → CRM. Enter your location ID or install the 0nCore marketplace app from the CRM app marketplace. OAuth handles authentication automatically.' },
    { title: '3. Set up your Brand Board', content: 'Navigate to Dashboard → Brand Builder. Upload your logo, set your colors, fonts, and tone of voice. This trains your AI to match your brand on every generated output.' },
    { title: '4. Train your Company AI', content: 'Go to 0nTask → Knowledge Base → Train AI. Upload documents, paste your website URL, or describe your business. The AI learns your products, services, pricing, and FAQs.' },
    { title: '5. Install add-ons', content: 'Visit Dashboard → Marketplace. Browse 31 add-ons — Social Planner, Email Builder, Voice AI, Course Builder, and more. Install what you need, pay only for what you use.' },
    { title: '6. Build your first automation', content: 'Go to Dashboard → Automations. Describe what you want in plain English. The AI builds the workflow — triggers, conditions, actions — across any connected service.' },
  ],
  'api': [
    { title: 'Base URL', content: 'All API requests use https://0ncore.com/api/ as the base URL. Authentication is via Supabase JWT token in the Authorization header.' },
    { title: 'Authentication', content: 'Include your session token: Authorization: Bearer <supabase_access_token>. Tokens are obtained via the login flow or Supabase auth SDK.' },
    { title: 'CRM Proxy Routes', content: 'All /api/crm/* routes proxy to the CRM API using your location\'s PIT token. Available modules: contacts, conversations, calendars, opportunities, invoices, social, users, objects, products, forms, funnels, campaigns, phone, blog.' },
    { title: 'Social API', content: 'POST /api/social/post — publish to connected platforms. POST /api/social/bulk — AI-generate bulk posts. POST /api/social/csv — CSV import/export. GET /api/social/posts — list CRM posts.' },
    { title: 'Analytics API', content: 'GET /api/google/analytics — GA4 reports (overview, realtime, conversions, daily, landing-pages, geo). GET /api/google/search-console — Search Console data. POST /api/cro — CRO9 analysis engine.' },
    { title: 'Task AI', content: 'POST /api/tasks/ai — personal AI assistant. Send a message with your current task list. Returns reply, suggested actions, and optional task mutations (create/update/complete).' },
    { title: 'Google Workspace', content: 'POST /api/google/workspace — unified API for Gmail, Drive, Sheets, Calendar, Docs, Tasks. Requires Google OAuth connection. 16 available actions.' },
  ],
  'mcp': [
    { title: 'What is MCP?', content: 'Model Context Protocol (MCP) is the standard for connecting AI models to external tools. 0nMCP is the universal MCP server that provides 1,554 tools across 96 services.' },
    { title: 'Install 0nMCP', content: 'npm install -g 0nmcp\n\nThis installs the 0nMCP CLI globally. Run "0nmcp" to start the MCP server in stdio mode.' },
    { title: 'Claude Desktop Config', content: 'Add to your Claude Desktop MCP config:\n{\n  "0nMCP": {\n    "type": "stdio",\n    "command": "0nmcp"\n  }\n}' },
    { title: 'Cursor / Windsurf', content: 'Add the same config to your Cursor or Windsurf MCP settings. 0nMCP auto-detects the AI platform and configures accordingly.' },
    { title: 'Import Credentials', content: 'Run "0nmcp engine import" to scan your .env files and auto-configure service connections. Credentials are stored encrypted in ~/.0n/connections/.' },
  ],
  'webhooks': [
    { title: 'Stripe Webhooks', content: 'POST /api/webhooks/stripe — handles checkout.session.completed, subscription events, and invoice events. Verifies signatures with STRIPE_WEBHOOK_SECRET.' },
    { title: 'CRM Webhooks', content: 'POST /api/webhooks/crm — handles contact created/updated, opportunity stage changes, and workflow triggers. Configure in CRM → Automations → Webhooks.' },
    { title: 'Custom Webhooks', content: 'All webhook routes verify HMAC signatures. Supported: Stripe, CRM, Slack, GitHub, Twilio, Shopify. Generic HMAC verification available for custom sources.' },
  ],
  'integrations': [
    { title: 'CRM (GoHighLevel)', content: '289 tools — contacts, pipelines, calendars, social posting, email, phone, invoices, workflows, forms, funnels, products, custom objects. Full API access via PIT token.' },
    { title: 'Google Workspace', content: 'Gmail, Drive, Sheets, Calendar, Docs, Slides, Tasks, Analytics, Search Console. Service account for server-side access, OAuth for user-facing flows.' },
    { title: 'Stripe', content: 'Payments, subscriptions, invoicing, billing portal. Inline price_data for checkout — no pre-created products needed.' },
    { title: 'Communication', content: 'Slack (bot + channels), Discord, Twilio (SMS + voice), SendGrid, Gmail, Telegram.' },
    { title: 'Development', content: 'GitHub, Linear, Jira, Vercel, Cloudflare, GoDaddy, AWS, Netlify.' },
    { title: 'AI Providers', content: 'Anthropic (Claude), OpenAI (GPT), Groq (Llama), Google Gemini, Ollama (local), Mistral, Cohere, Replicate.' },
  ],
  'billing': [
    { title: 'Sub-location Billing', content: 'Every user gets a CRM sub-location. Usage (calls, SMS, emails) is tracked per location. Rebilling markup is configured in your agency settings — you set the margin.' },
    { title: 'Stripe Checkout', content: 'Add-ons use Stripe checkout with inline price_data. One-time purchases and subscriptions supported. Webhook fulfills purchases automatically.' },
    { title: 'External Billing', content: 'The CRM external billing webhook syncs Stripe subscriptions with CRM access. When a user pays, their sub-location is activated. When they cancel, it\'s suspended.' },
    { title: 'Metered Usage', content: 'Workflow executions are billed at $0.10 per execution via Stripe metered billing. Usage is tracked in real-time and appears on their next invoice.' },
  ],
  'security': [
    { title: '0nVault', content: 'AES-256-GCM encryption with PBKDF2-SHA512 key derivation (100K iterations). Hardware fingerprint binding ensures credentials only work on the machine that sealed them.' },
    { title: 'Vault Containers (.0nv)', content: 'Patent-pending container format with 7 semantic layers: workflows, credentials, env_vars, mcp_configs, site_profiles, ai_brain, audit_trail. Multi-party escrow with X25519 ECDH.' },
    { title: 'Seal of Truth', content: 'SHA3-256 content-addressed integrity verification. Ed25519 digital signatures on every container. Transfer registry with replay prevention.' },
    { title: 'API Key Management', content: 'All API keys are stored server-side only. Never exposed to client-side JavaScript. PIT tokens use type=plain on Vercel (type=encrypted causes double-wrapping). Rotation schedule recommended every 90 days.' },
  ],
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>('getting-started')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Documentation</h1>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957' }}>INTERNAL</span>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Sidebar nav */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8, border: 'none',
                  background: activeSection === s.key ? 'rgba(126,217,87,0.08)' : 'transparent',
                  color: activeSection === s.key ? '#7ed957' : 'var(--jp-text-secondary)',
                  fontSize: 13, fontWeight: activeSection === s.key ? 600 : 400,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                {s.title}
              </button>
            ))}

            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--jp-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--jp-text-muted)', marginBottom: 4 }}>Full API docs</div>
              <a href="https://0nmcp.com/docs" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#7ed957', textDecoration: 'none', fontWeight: 600 }}>
                0nmcp.com/docs →
              </a>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
              {SECTIONS.find(s => s.key === activeSection)?.icon} {SECTIONS.find(s => s.key === activeSection)?.title}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--jp-text-muted)' }}>
              {SECTIONS.find(s => s.key === activeSection)?.description}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DOCS[activeSection].map((doc, i) => (
              <div key={i} style={{
                padding: '18px 20px', borderRadius: 12,
                background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)',
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--jp-text)' }}>{doc.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--jp-text-secondary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{doc.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
