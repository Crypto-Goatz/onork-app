'use client'

import { useState } from 'react'
import {
  Rocket,
  Cpu,
  BookOpen,
  Webhook,
  Plug,
  CreditCard,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

type DocSection = 'getting-started' | 'api' | 'mcp' | 'webhooks' | 'integrations' | 'billing' | 'security'

const SECTIONS: { key: DocSection; title: string; description: string; Icon: LucideIcon }[] = [
  { key: 'getting-started', title: 'Getting Started', description: 'Connect your CRM, install add-ons, and set up your first automation.', Icon: Rocket },
  { key: 'api', title: 'API Reference', description: 'Full REST API documentation for all 0nCore endpoints.', Icon: Cpu },
  { key: 'mcp', title: 'MCP Server', description: 'Set up the 0nMCP server for Claude, Cursor, and other AI tools.', Icon: BookOpen },
  { key: 'webhooks', title: 'Webhooks', description: 'Configure webhook receivers for Stripe, CRM, and custom events.', Icon: Webhook },
  { key: 'integrations', title: 'Integrations', description: 'Connect to 96+ services — Slack, Gmail, Stripe, GitHub, and more.', Icon: Plug },
  { key: 'billing', title: 'Billing & Rebilling', description: 'Sub-location billing, Stripe checkout, metered usage, and markup.', Icon: CreditCard },
  { key: 'security', title: 'Security & Vault', description: 'AES-256 encryption, credential vault, and API key management.', Icon: ShieldCheck },
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
    { title: 'CRM', content: '289 tools — contacts, pipelines, calendars, social posting, email, phone, invoices, workflows, forms, funnels, products, custom objects. Full API access via PIT token.' },
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['0']))

  const activeData = SECTIONS.find(s => s.key === activeSection)!

  function toggleItem(key: string) {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Reset expanded on section change — expand first item
  function switchSection(key: DocSection) {
    setActiveSection(key)
    setExpandedItems(new Set(['0']))
  }

  return (
    <div className="px-8 py-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-6">
        <h1 className="text-xl font-extrabold text-core-text m-0">Documentation</h1>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-core-green/[0.12] text-core-green">
          INTERNAL
        </span>
      </div>

      <div className="flex gap-6">
        {/* Content — LEFT side */}
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold text-core-text mb-1">
              <activeData.Icon size={20} className="text-core-green" />
              {activeData.title}
            </h2>
            <p className="text-sm text-core-text-muted">{activeData.description}</p>
          </div>

          {/* Accordion items */}
          <div className="flex flex-col gap-2">
            {DOCS[activeSection].map((doc, i) => {
              const key = String(i)
              const isOpen = expandedItems.has(key)
              return (
                <div
                  key={i}
                  className="rounded-xl bg-core-card border border-core-border overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => toggleItem(key)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-none cursor-pointer text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <h3 className="text-[14px] font-bold text-core-text m-0">{doc.title}</h3>
                    <ChevronDown
                      size={16}
                      className={`text-core-text-muted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: isOpen ? 500 : 0, opacity: isOpen ? 1 : 0 }}
                  >
                    <div className="px-5 pb-4 pt-0">
                      <p className="text-[13px] text-core-text-dim leading-relaxed m-0 whitespace-pre-wrap">
                        {doc.content}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar nav — RIGHT side, glassmorphic */}
        <div className="w-56 shrink-0">
          <div className="sticky top-[88px]">
            <div className="rounded-2xl border border-white/[0.08] p-3 backdrop-blur-xl"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(110,224,90,0.03) 50%, rgba(0,212,255,0.02) 100%)' }}
            >
              <div className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em] px-3 mb-2">
                Sections
              </div>
              <div className="flex flex-col gap-0.5">
                {SECTIONS.map(s => {
                  const active = activeSection === s.key
                  return (
                    <button
                      key={s.key}
                      onClick={() => switchSection(s.key)}
                      className={[
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-0 text-[13px] cursor-pointer text-left w-full transition-all duration-150',
                        active
                          ? 'bg-core-green/[0.12] text-white font-bold'
                          : 'bg-transparent text-white/70 font-semibold hover:bg-white/[0.04] hover:text-white',
                      ].join(' ')}
                    >
                      <s.Icon
                        size={14}
                        className={active ? 'text-core-green' : 'text-white/40'}
                      />
                      {s.title}
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="px-3 py-2.5 rounded-lg bg-white/[0.03]">
                  <div className="text-[10px] text-white/30 font-semibold mb-1">Full API docs</div>
                  <a
                    href="https://0nmcp.com/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[12px] text-core-green no-underline font-bold hover:opacity-80 transition-opacity"
                  >
                    0nmcp.com/docs
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
