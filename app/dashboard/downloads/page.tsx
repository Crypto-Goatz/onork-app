'use client'

import { useState, type ComponentType, type SVGProps } from 'react'
import { Check } from 'lucide-react'
import {
  Bot,
  Code2,
  Sparkles,
  Terminal,
  Wind,
  Zap,
  Brain,
  Play,
  Globe,
  Palette,
  Search,
  Plug,
  Rocket,
  Mic,
  GraduationCap,
  Package,
  PackageOpen,
  Github,
  BookOpen,
  FileCode2,
  Smartphone,
  Link2,
} from 'lucide-react'

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

interface Download {
  id: string
  name: string
  description: string
  Icon: LucideIcon
  category: 'ai' | 'browser' | 'wordpress' | 'crm' | 'dev' | 'mobile'
  action: 'download' | 'copy' | 'link' | 'install'
  actionLabel: string
  actionData: string
  badge?: string
  size?: string
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI Platforms' },
  { id: 'browser', label: 'Browser' },
  { id: 'wordpress', label: 'WordPress' },
  { id: 'crm', label: 'CRM' },
  { id: 'dev', label: 'Developer' },
  { id: 'mobile', label: 'Mobile' },
] as const

const CATEGORY_COLORS: Record<Download['category'], { fg: string; bg: string; border: string }> = {
  ai:        { fg: '#00d4ff', bg: 'rgba(0,212,255,0.10)',  border: 'rgba(0,212,255,0.25)' },
  browser:   { fg: '#f97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.25)' },
  wordpress: { fg: '#3b82f6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)' },
  crm:       { fg: '#7ed957', bg: 'rgba(126,217,87,0.10)', border: 'rgba(126,217,87,0.30)' },
  dev:       { fg: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)' },
  mobile:    { fg: '#ec4899', bg: 'rgba(236,72,153,0.10)', border: 'rgba(236,72,153,0.25)' },
}

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  LIVE:    { bg: 'rgba(126,217,87,0.14)',  color: '#7ed957' },
  NEW:     { bg: 'rgba(0,212,255,0.12)',   color: '#00d4ff' },
  POPULAR: { bg: 'rgba(167,139,250,0.14)', color: '#a78bfa' },
  PWA:     { bg: 'rgba(236,72,153,0.12)',  color: '#ec4899' },
  SOON:    { bg: 'rgba(85,104,128,0.14)',  color: '#6b7280' },
}

const MCP_CONFIG = JSON.stringify({
  mcpServers: { '0nMCP': { command: 'npx', args: ['-y', '0nmcp@latest'] } },
}, null, 2)

const DOWNLOADS: Download[] = [
  // AI Platforms
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    description: 'Connect 0nMCP to Claude Desktop. 1,554 tools available in every conversation.',
    Icon: Bot,
    category: 'ai',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: MCP_CONFIG,
    badge: 'POPULAR',
  },
  {
    id: 'cursor',
    name: 'Cursor IDE',
    description: 'Add 0nMCP to Cursor as an MCP server. Build with 1,554 tools inline.',
    Icon: Code2,
    category: 'ai',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: MCP_CONFIG,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    description: 'Connect 0nMCP to Windsurf IDE for AI-powered development.',
    Icon: Wind,
    category: 'ai',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: MCP_CONFIG,
  },
  {
    id: 'claude-code',
    name: 'Claude Code (CLI)',
    description: 'Add 0nMCP to Claude Code terminal. Full ecosystem access from the command line.',
    Icon: Terminal,
    category: 'ai',
    action: 'copy',
    actionLabel: 'Copy Command',
    actionData: 'claude mcp add --scope user 0nMCP -- npx -y 0nmcp@latest',
    badge: 'NEW',
  },
  {
    id: 'vscode',
    name: 'VS Code Copilot',
    description: 'Use 0nMCP tools inside VS Code with GitHub Copilot agent mode.',
    Icon: Zap,
    category: 'ai',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: JSON.stringify({
      servers: { '0nMCP': { type: 'stdio', command: 'npx', args: ['-y', '0nmcp@latest'] } },
    }, null, 2),
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Connect 0nMCP to Gemini CLI for Google AI with full tool access.',
    Icon: Sparkles,
    category: 'ai',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: MCP_CONFIG,
  },
  {
    id: 'openai',
    name: 'OpenAI / ChatGPT',
    description: 'Use 0nMCP tools with OpenAI function calling.',
    Icon: Brain,
    category: 'ai',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: MCP_CONFIG,
  },
  {
    id: 'continue',
    name: 'Continue.dev',
    description: 'Add 0nMCP to Continue — the open-source AI code assistant.',
    Icon: Play,
    category: 'ai',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: JSON.stringify({
      experimental: {
        modelContextProtocolServers: [{
          transport: { type: 'stdio', command: 'npx', args: ['-y', '0nmcp@latest'] },
        }],
      },
    }, null, 2),
  },

  // Browser
  {
    id: '0nlink',
    name: '0nLink — LinkedIn AI Engine',
    description: 'AI-powered LinkedIn assistant. Post generation, Snip & Respond, image gen, trends, predictions, CRM export.',
    Icon: Link2,
    category: 'browser',
    action: 'download',
    actionLabel: 'Download Extension',
    actionData: '/downloads/0nlink-chrome-extension.zip',
    badge: 'NEW',
  },
  {
    id: 'chrome-core',
    name: '0nCore Chrome Extension',
    description: 'Access 0nCore from any webpage. Quick actions, contact lookup, and AI chat.',
    Icon: Globe,
    category: 'browser',
    action: 'link',
    actionLabel: 'Coming Soon',
    actionData: '#',
    badge: 'SOON',
  },

  // WordPress
  {
    id: 'onpress-wp',
    name: 'OnPress — Figma to WordPress',
    description: 'Convert Figma designs into complete WordPress themes and plugins.',
    Icon: Palette,
    category: 'wordpress',
    action: 'link',
    actionLabel: 'Get OnPress',
    actionData: 'https://wpsxo.com/products/onpress',
    badge: 'NEW',
  },
  {
    id: 'wpsxo',
    name: 'WP-SXO',
    description: 'Search Experience Optimization for WordPress. AI-powered content scoring.',
    Icon: Search,
    category: 'wordpress',
    action: 'link',
    actionLabel: 'Get WP-SXO',
    actionData: 'https://wpsxo.com/products/wpsxo',
  },
  {
    id: 'wp-0ncore-theme',
    name: '0nCore Theme',
    description: 'FSE block theme with dark design, AI-connected, fully customizable via Site Editor. Matches the 0nCore dashboard look.',
    Icon: Palette,
    category: 'wordpress',
    action: 'link',
    actionLabel: 'Download Theme v1.0.0',
    actionData: '/downloads/0ncore-theme-v1.0.0.zip',
    badge: 'NEW',
    size: '9 KB',
  },
  {
    id: 'wp-0ncore-plugin',
    name: '0nCore Plugin',
    description: 'AI chat widget, blog engine, CRM sync, analytics tracking, design sync — everything connected via your 0n token.',
    Icon: Plug,
    category: 'wordpress',
    action: 'link',
    actionLabel: 'Download Plugin v1.0.0',
    actionData: '/downloads/0ncore-plugin-v1.0.0.zip',
    badge: 'NEW',
    size: '10 KB',
  },
  {
    id: 'wp-0ncore-legacy',
    name: '0nCore WP (Legacy)',
    description: 'Previous version plugin. CRM integration, AI forms, Meta Pixel + GA4, booking embeds, SXO pages.',
    Icon: Plug,
    category: 'wordpress',
    action: 'link',
    actionLabel: 'Download v1.5.0',
    actionData: '/downloads/0ncore-wp-v1.5.0.zip',
  },

  // CRM
  {
    id: 'crm-marketplace',
    name: '0nCore for CRM',
    description: 'Install 0nCore directly in your CRM. Full dashboard, automations, AI — inside the sidebar.',
    Icon: Rocket,
    category: 'crm',
    action: 'link',
    actionLabel: 'Install App',
    actionData: '/api/oauth/authorize',
    badge: 'LIVE',
  },
  {
    id: 'crm-voice-ai',
    name: 'Voice AI Widget',
    description: 'Embed the 0nAI voice orb on any website. Visitors talk, AI responds, leads captured.',
    Icon: Mic,
    category: 'crm',
    action: 'link',
    actionLabel: 'Set Up Voice',
    actionData: '/dashboard/voice',
  },
  {
    id: 'crm-course-gen',
    name: 'AI Course Generator',
    description: 'Generate complete online courses with AI and import them into your CRM in one click.',
    Icon: GraduationCap,
    category: 'crm',
    action: 'link',
    actionLabel: 'Generate Course',
    actionData: '/dashboard/courses',
  },

  // Developer
  {
    id: 'npm',
    name: '0nMCP (npm)',
    description: 'Install the 0nMCP server via npm. 1,554 tools, 96 services, runs anywhere.',
    Icon: Package,
    category: 'dev',
    action: 'copy',
    actionLabel: 'Copy Command',
    actionData: 'npm install -g 0nmcp',
    size: '~2.1 MB',
  },
  {
    id: 'npx',
    name: 'Run with npx (no install)',
    description: 'Run 0nMCP instantly without installing. Always the latest version.',
    Icon: PackageOpen,
    category: 'dev',
    action: 'copy',
    actionLabel: 'Copy Command',
    actionData: 'npx 0nmcp@latest',
  },
  {
    id: 'github',
    name: 'GitHub Repository',
    description: 'Source code, issues, contributions. Star us and join the community.',
    Icon: Github,
    category: 'dev',
    action: 'link',
    actionLabel: 'View on GitHub',
    actionData: 'https://www.npmjs.com/package/0nmcp',
  },
  {
    id: 'api-docs',
    name: 'API Documentation',
    description: 'Complete API reference for all 1,554 tools and 96 services.',
    Icon: BookOpen,
    category: 'dev',
    action: 'link',
    actionLabel: 'View Docs',
    actionData: 'https://0nmcp.com/learn',
  },
  {
    id: 'dot-on-spec',
    name: '.0n Standard (npm)',
    description: 'The .0n file format — universal workflow configuration. Parse, validate, create.',
    Icon: FileCode2,
    category: 'dev',
    action: 'copy',
    actionLabel: 'Copy Command',
    actionData: 'npm install 0n-spec',
  },

  // Mobile
  {
    id: 'mobile-pwa',
    name: '0nCore Mobile (PWA)',
    description: 'Add 0nCore to your home screen. Full dashboard, AI chat, contacts — on your phone.',
    Icon: Smartphone,
    category: 'mobile',
    action: 'link',
    actionLabel: 'Open 0nCore',
    actionData: 'https://0ncore.com/dashboard',
    badge: 'PWA',
  },
]

const STATS = [
  { value: '1,554', label: 'Tools' },
  { value: '96', label: 'Services' },
  { value: '8', label: 'AI Platforms' },
  { value: '2', label: 'WP Plugins' },
  { value: '1', label: 'CRM App' },
]

export default function DownloadsPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = activeCategory === 'all'
    ? DOWNLOADS
    : DOWNLOADS.filter(d => d.category === activeCategory)

  function handleAction(d: Download) {
    if (d.action === 'copy') {
      navigator.clipboard.writeText(d.actionData)
      setCopied(d.id)
      setTimeout(() => setCopied(null), 2000)
    } else if (d.action === 'link' || d.action === 'download') {
      if (d.actionData !== '#') {
        const isInternal = d.actionData.startsWith('/')
        window.open(d.actionData, isInternal ? '_self' : '_blank')
      }
    }
  }

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-core-text m-0 mb-1">Downloads & Integrations</h1>
        <p className="text-[13px] text-core-text-muted">Connect 0nCore to every platform. One ecosystem, everywhere.</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-7 bg-core-surface rounded-xl p-1 w-fit border border-core-border">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={[
              'px-3.5 py-1.5 rounded-lg border-0 text-xs font-semibold cursor-pointer transition-all duration-150',
              activeCategory === c.id
                ? 'bg-core-border text-core-green'
                : 'bg-transparent text-core-text-muted hover:text-core-text-dim',
            ].join(' ')}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Downloads grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map(d => {
          const c = CATEGORY_COLORS[d.category]
          const disabled = d.actionData === '#'
          const badgeStyle = d.badge ? BADGE_STYLES[d.badge] : null
          return (
            <div
              key={d.id}
              className="bg-core-card border border-core-border rounded-2xl p-5 transition-all duration-200 cursor-pointer relative overflow-hidden hover:-translate-y-0.5"
              onMouseEnter={e => { e.currentTarget.style.borderColor = c.border }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '' }}
            >
              {d.badge && badgeStyle && (
                <span
                  className="absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] font-extrabold tracking-widest"
                  style={{ background: badgeStyle.bg, color: badgeStyle.color }}
                >
                  {d.badge}
                </span>
              )}

              {/* Icon + Name */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{ background: c.bg, borderColor: c.border }}
                >
                  <d.Icon size={20} color={c.fg} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-core-text truncate">{d.name}</div>
                  {d.size && <div className="text-[10px] text-core-text-muted">{d.size}</div>}
                </div>
              </div>

              <p className="text-xs text-core-text-dim leading-relaxed mb-3.5">{d.description}</p>

              <button
                onClick={() => handleAction(d)}
                disabled={disabled}
                className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-all duration-150 border"
                style={{
                  background: disabled ? '' : c.bg,
                  borderColor: disabled ? '' : c.border,
                  color: disabled ? '' : c.fg,
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                {copied === d.id ? (
                  <span className="flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" /> Copied!
                  </span>
                ) : d.actionLabel}
              </button>
            </div>
          )
        })}
      </div>

      {/* Stats footer */}
      <div className="mt-8 px-6 py-5 bg-core-card border border-core-border rounded-2xl flex justify-around text-center">
        {STATS.map(s => (
          <div key={s.label}>
            <div className="text-xl font-extrabold text-core-green">{s.value}</div>
            <div className="text-[10px] text-core-text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
