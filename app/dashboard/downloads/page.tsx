'use client'

import { useState, type ComponentType, type SVGProps } from 'react'
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
  dev:       { fg: '#a78bfa', bg: 'rgba(167,139,250,0.10)',border: 'rgba(167,139,250,0.25)' },
  mobile:    { fg: '#ec4899', bg: 'rgba(236,72,153,0.10)', border: 'rgba(236,72,153,0.25)' },
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
    id: 'chrome-extension',
    name: 'Chrome Extension',
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
    id: 'wp-0ncore',
    name: '0nCore WordPress Plugin',
    description: 'Connect your WordPress site to 0nCore. Sync contacts, forms, and analytics.',
    Icon: Plug,
    category: 'wordpress',
    action: 'link',
    actionLabel: 'Coming Soon',
    actionData: '#',
    badge: 'SOON',
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
    actionData: 'https://github.com/0nork/0nMCP',
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
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>Downloads & Integrations</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>Connect 0nCore to every platform. One ecosystem, everywhere.</p>
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 28,
        background: 'var(--bg-secondary, #161b22)', borderRadius: 10, padding: 4, width: 'fit-content',
        border: '1px solid #1c2b42',
      }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setActiveCategory(c.id)} style={{
            padding: '7px 14px', borderRadius: 7, border: 'none',
            background: activeCategory === c.id ? 'var(--border, #30363d)' : 'transparent',
            color: activeCategory === c.id ? '#7ed957' : 'var(--text-muted, #6b7280)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>{c.label}</button>
        ))}
      </div>

      {/* Downloads Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {filtered.map(d => {
          const c = CATEGORY_COLORS[d.category]
          const disabled = d.actionData === '#'
          return (
            <div key={d.id} style={{
              background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
              borderRadius: 14, padding: 20,
              transition: 'all 0.2s', cursor: 'pointer',
              position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1c2b42'; e.currentTarget.style.transform = 'none' }}
            >
              {d.badge && (
                <span style={{
                  position: 'absolute', top: 12, right: 12,
                  padding: '2px 8px', borderRadius: 4,
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
                  background: d.badge === 'LIVE' ? 'rgba(126,217,87,0.14)' :
                    d.badge === 'NEW' ? 'rgba(0,212,255,0.12)' :
                    d.badge === 'POPULAR' ? 'rgba(167,139,250,0.14)' :
                    d.badge === 'PWA' ? 'rgba(236,72,153,0.12)' :
                    'rgba(85,104,128,0.14)',
                  color: d.badge === 'LIVE' ? '#7ed957' :
                    d.badge === 'NEW' ? '#00d4ff' :
                    d.badge === 'POPULAR' ? '#a78bfa' :
                    d.badge === 'PWA' ? '#ec4899' :
                    'var(--text-muted, #6b7280)',
                }}>{d.badge}</span>
              )}

              {/* Icon + Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: c.bg, border: `1px solid ${c.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <d.Icon size={20} color={c.fg} strokeWidth={2} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                  {d.size && <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)' }}>{d.size}</div>}
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-secondary, #9ca3af)', lineHeight: 1.6, marginBottom: 14 }}>{d.description}</p>

              <button onClick={() => handleAction(d)} disabled={disabled} style={{
                width: '100%', padding: '9px 16px',
                background: disabled ? 'var(--border, #30363d)' : c.bg,
                border: `1px solid ${disabled ? 'var(--border, #30363d)' : c.border}`,
                borderRadius: 8,
                color: disabled ? 'var(--text-muted, #6b7280)' : c.fg,
                fontSize: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
                transition: 'all 0.15s',
              }}>
                {copied === d.id ? '✓ Copied!' : d.actionLabel}
              </button>
            </div>
          )
        })}
      </div>

      {/* Stats Footer */}
      <div style={{
        marginTop: 32, padding: '20px 24px',
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 14, display: 'flex', justifyContent: 'space-around',
        textAlign: 'center',
      }}>
        {[
          { value: '1,554', label: 'Tools' },
          { value: '96', label: 'Services' },
          { value: '8', label: 'AI Platforms' },
          { value: '2', label: 'WP Plugins' },
          { value: '1', label: 'CRM App' },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#7ed957' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
