'use client'

import { useState } from 'react'

interface Download {
  id: string
  name: string
  description: string
  icon: string
  category: string
  color: string
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
]

const DOWNLOADS: Download[] = [
  // AI Platforms
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    description: 'Connect 0nMCP to Claude Desktop. 900+ tools available in every conversation.',
    icon: '🟤',
    category: 'ai',
    color: '#cc9a80',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: JSON.stringify({
      "mcpServers": {
        "0nMCP": {
          "command": "npx",
          "args": ["-y", "0nmcp@latest"]
        }
      }
    }, null, 2),
    badge: 'POPULAR',
  },
  {
    id: 'cursor',
    name: 'Cursor IDE',
    description: 'Add 0nMCP to Cursor as an MCP server. Build with 900+ tools inline.',
    icon: '⚡',
    category: 'ai',
    color: '#00d4ff',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: JSON.stringify({
      "mcpServers": {
        "0nMCP": {
          "command": "npx",
          "args": ["-y", "0nmcp@latest"]
        }
      }
    }, null, 2),
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    description: 'Connect 0nMCP to Windsurf IDE for AI-powered development.',
    icon: '🏄',
    category: 'ai',
    color: '#3b82f6',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: JSON.stringify({
      "mcpServers": {
        "0nMCP": {
          "command": "npx",
          "args": ["-y", "0nmcp@latest"]
        }
      }
    }, null, 2),
  },
  {
    id: 'claude-code',
    name: 'Claude Code (CLI)',
    description: 'Add 0nMCP to Claude Code terminal. Full ecosystem access from the command line.',
    icon: '🖥️',
    category: 'ai',
    color: '#cc9a80',
    action: 'copy',
    actionLabel: 'Copy Command',
    actionData: 'claude mcp add --scope user 0nMCP -- npx -y 0nmcp@latest',
    badge: 'NEW',
  },
  {
    id: 'vscode',
    name: 'VS Code Copilot',
    description: 'Use 0nMCP tools inside VS Code with GitHub Copilot agent mode.',
    icon: '💎',
    category: 'ai',
    color: '#007acc',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: JSON.stringify({
      "servers": {
        "0nMCP": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "0nmcp@latest"]
        }
      }
    }, null, 2),
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Connect 0nMCP to Gemini CLI for Google AI with full tool access.',
    icon: '✨',
    category: 'ai',
    color: '#4285f4',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: JSON.stringify({
      "mcpServers": {
        "0nMCP": {
          "command": "npx",
          "args": ["-y", "0nmcp@latest"]
        }
      }
    }, null, 2),
  },
  {
    id: 'openai',
    name: 'OpenAI / ChatGPT',
    description: 'Use 0nMCP tools with OpenAI function calling.',
    icon: '🟢',
    category: 'ai',
    color: '#10a37f',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: JSON.stringify({
      "mcpServers": {
        "0nMCP": {
          "command": "npx",
          "args": ["-y", "0nmcp@latest"]
        }
      }
    }, null, 2),
  },
  {
    id: 'continue',
    name: 'Continue.dev',
    description: 'Add 0nMCP to Continue — the open-source AI code assistant.',
    icon: '▶️',
    category: 'ai',
    color: '#f97316',
    action: 'copy',
    actionLabel: 'Copy Config',
    actionData: JSON.stringify({
      "experimental": {
        "modelContextProtocolServers": [{
          "transport": { "type": "stdio", "command": "npx", "args": ["-y", "0nmcp@latest"] }
        }]
      }
    }, null, 2),
  },

  // Browser
  {
    id: 'chrome-extension',
    name: 'Chrome Extension',
    description: 'Access 0nCore from any webpage. Quick actions, contact lookup, and AI chat.',
    icon: '🌐',
    category: 'browser',
    color: '#4285f4',
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
    icon: '🎨',
    category: 'wordpress',
    color: '#f97316',
    action: 'link',
    actionLabel: 'Get OnPress',
    actionData: 'https://wpsxo.com/products/onpress',
    badge: 'NEW',
  },
  {
    id: 'wpsxo',
    name: 'WP-SXO',
    description: 'Search Experience Optimization for WordPress. AI-powered content scoring.',
    icon: '🔍',
    category: 'wordpress',
    color: '#8b5cf6',
    action: 'link',
    actionLabel: 'Get WP-SXO',
    actionData: 'https://wpsxo.com/products/wpsxo',
  },
  {
    id: 'wp-0ncore',
    name: '0nCore WordPress Plugin',
    description: 'Connect your WordPress site to 0nCore. Sync contacts, forms, and analytics.',
    icon: '🔌',
    category: 'wordpress',
    color: 'var(--color-cyan, #14b8a6)',
    action: 'link',
    actionLabel: 'Coming Soon',
    actionData: '#',
    badge: 'SOON',
  },

  // CRM
  {
    id: 'crm-marketplace',
    name: 'CRM Marketplace App',
    description: 'Install 0nCore directly in your CRM. Full dashboard, automations, AI — inside the sidebar.',
    icon: '🚀',
    category: 'crm',
    color: 'var(--color-cyan, #14b8a6)',
    action: 'link',
    actionLabel: 'Install App',
    actionData: 'https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=69c762225a31e1cd2f28dd4c-mn9wyk9o&version_id=69c762225a31e1cd2f28dd4c',
    badge: 'LIVE',
  },
  {
    id: 'crm-voice-ai',
    name: 'Voice AI Widget',
    description: 'Embed the 0nAI voice orb on any website. Visitors talk, AI responds, leads captured.',
    icon: '🎙️',
    category: 'crm',
    color: '#8b5cf6',
    action: 'link',
    actionLabel: 'Set Up Voice',
    actionData: '/dashboard/voice',
  },
  {
    id: 'crm-course-gen',
    name: 'AI Course Generator',
    description: 'Generate complete online courses with AI and import them into your CRM in one click.',
    icon: '🎓',
    category: 'crm',
    color: '#f59e0b',
    action: 'link',
    actionLabel: 'Generate Course',
    actionData: '/dashboard/courses',
  },

  // Developer
  {
    id: 'npm',
    name: '0nMCP (npm)',
    description: 'Install the 0nMCP server via npm. 900+ tools, 55 services, runs anywhere.',
    icon: '📦',
    category: 'dev',
    color: '#cb3837',
    action: 'copy',
    actionLabel: 'Copy Command',
    actionData: 'npm install -g 0nmcp',
    size: '~2.1 MB',
  },
  {
    id: 'npx',
    name: 'Run with npx (no install)',
    description: 'Run 0nMCP instantly without installing. Always the latest version.',
    icon: '⚡',
    category: 'dev',
    color: '#cb3837',
    action: 'copy',
    actionLabel: 'Copy Command',
    actionData: 'npx 0nmcp@latest',
  },
  {
    id: 'github',
    name: 'GitHub Repository',
    description: 'Source code, issues, contributions. Star us and join the community.',
    icon: '🐙',
    category: 'dev',
    color: 'var(--text-primary, #f0f4f8)',
    action: 'link',
    actionLabel: 'View on GitHub',
    actionData: 'https://github.com/0nork/0nMCP',
  },
  {
    id: 'api-docs',
    name: 'API Documentation',
    description: 'Complete API reference for all 900+ tools and 55 services.',
    icon: '📖',
    category: 'dev',
    color: 'var(--color-cyan, #14b8a6)',
    action: 'link',
    actionLabel: 'View Docs',
    actionData: 'https://0nmcp.com/learn',
  },
  {
    id: 'dot-on-spec',
    name: '.0n Standard (npm)',
    description: 'The .0n file format — universal workflow configuration. Parse, validate, create.',
    icon: '📐',
    category: 'dev',
    color: 'var(--color-cyan, #14b8a6)',
    action: 'copy',
    actionLabel: 'Copy Command',
    actionData: 'npm install 0n-spec',
  },

  // Mobile
  {
    id: 'mobile-pwa',
    name: '0nCore Mobile (PWA)',
    description: 'Add 0nCore to your home screen. Full dashboard, AI chat, contacts — on your phone.',
    icon: '📱',
    category: 'mobile',
    color: 'var(--color-cyan, #14b8a6)',
    action: 'link',
    actionLabel: 'Open 0nCore',
    actionData: 'https://0ncore.com/dashboard',
    badge: 'PWA',
  },
]

export default function DownloadsPage() {
  const [activeCategory, setActiveCategory] = useState('all')
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
      if (d.actionData !== '#') window.open(d.actionData, d.actionData.startsWith('/') ? '_self' : '_blank')
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
            color: activeCategory === c.id ? 'var(--color-cyan, #14b8a6)' : 'var(--text-muted, #6b7280)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>{c.label}</button>
        ))}
      </div>

      {/* Downloads Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {filtered.map(d => (
          <div key={d.id} style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 14, padding: 20,
            transition: 'all 0.2s', cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${d.color}40`; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border, #30363d)'; e.currentTarget.style.transform = 'none' }}
          >
            {/* Badge */}
            {d.badge && (
              <span style={{
                position: 'absolute', top: 12, right: 12,
                padding: '2px 8px', borderRadius: 4,
                fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
                background: d.badge === 'LIVE' ? 'rgba(52,211,153,0.12)' :
                  d.badge === 'NEW' ? 'rgba(45,212,191,0.12)' :
                  d.badge === 'POPULAR' ? 'rgba(139,92,246,0.12)' :
                  d.badge === 'PWA' ? 'rgba(59,130,246,0.12)' :
                  'rgba(85,104,128,0.12)',
                color: d.badge === 'LIVE' ? '#34d399' :
                  d.badge === 'NEW' ? 'var(--color-cyan, #14b8a6)' :
                  d.badge === 'POPULAR' ? '#8b5cf6' :
                  d.badge === 'PWA' ? '#3b82f6' :
                  'var(--text-muted, #6b7280)',
              }}>{d.badge}</span>
            )}

            {/* Icon + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{d.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)' }}>{d.name}</div>
                {d.size && <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)' }}>{d.size}</div>}
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: 12, color: 'var(--text-secondary, #9ca3af)', lineHeight: 1.6, marginBottom: 14 }}>{d.description}</p>

            {/* Action */}
            <button onClick={() => handleAction(d)} style={{
              width: '100%', padding: '9px 16px',
              background: d.actionData === '#' ? 'var(--border, #30363d)' : `${d.color}12`,
              border: `1px solid ${d.actionData === '#' ? 'var(--border, #30363d)' : d.color + '25'}`,
              borderRadius: 8,
              color: d.actionData === '#' ? 'var(--text-muted, #6b7280)' : d.color,
              fontSize: 12, fontWeight: 600, cursor: d.actionData === '#' ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}>
              {copied === d.id ? '✓ Copied!' : d.actionLabel}
            </button>
          </div>
        ))}
      </div>

      {/* Stats Footer */}
      <div style={{
        marginTop: 32, padding: '20px 24px',
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 14, display: 'flex', justifyContent: 'space-around',
        textAlign: 'center',
      }}>
        {[
          { value: '900+', label: 'Tools' },
          { value: '55', label: 'Services' },
          { value: '8', label: 'AI Platforms' },
          { value: '2', label: 'WP Plugins' },
          { value: '1', label: 'CRM App' },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-cyan, #14b8a6)' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
