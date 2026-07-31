'use client'

import { useCallback } from 'react'
import {
  Chrome,
  MessageSquare,
  Globe,
  Terminal,
  Smartphone,
  Package,
  ExternalLink,
  ArrowRight,
  Clock,
  Bot,
  Sparkles,
  Download,
} from 'lucide-react'

function trackDownload(extension: string, step: string) {
  fetch('/api/track/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ extension, step, source: typeof window !== 'undefined' ? window.location.search : '' }),
  }).catch(() => {})
}

const DOWNLOADS = [
  {
    key: 'chrome',
    icon: Chrome,
    name: 'Chrome Extension',
    description: 'AI command center in your browser. LinkedIn tools, voice-trained content, multi-AI council, 1,554 tools via 0nMCP.',
    badge: 'v4.0',
    badgeColor: 'text-[#7ed957] bg-[#7ed957]/10 border-[#7ed957]/20',
    cta: 'Download Extension',
    href: '/downloads/0n-chrome-extension.zip',
    target: '_self',
    secondary: null,
    comingSoon: false,
    price: 'Free',
    isDownload: true,
  },
  {
    key: 'slack',
    icon: MessageSquare,
    name: 'Slack App',
    description: 'Run 0nMCP workflows from Slack. App Home, slash commands, approval queues, and smart notifications.',
    badge: 'v1.0',
    badgeColor: 'text-[#a78bfa] bg-[#a78bfa]/10 border-[#a78bfa]/20',
    cta: 'Add to Slack',
    href: 'https://slack.com/oauth/v2/authorize',
    target: '_blank',
    secondary: null,
    comingSoon: false,
    price: 'Free',
    isDownload: false,
  },
  {
    key: 'wordpress',
    icon: Globe,
    name: 'WordPress Plugin + Theme',
    description: 'Auto-publish AI blog content, CRM sync, analytics dashboard, HIPAA scanner. FSE block theme included.',
    badge: 'v1.0',
    badgeColor: 'text-[#00d4ff] bg-[#00d4ff]/10 border-[#00d4ff]/20',
    cta: 'Download Plugin',
    href: '/downloads/0n-wordpress-plugin.zip',
    target: '_self',
    secondary: null,
    comingSoon: false,
    price: 'Free',
    isDownload: true,
  },
  {
    key: 'claude-code',
    icon: Terminal,
    name: 'Claude Code Skill',
    description: 'Drop the /0n skill into Claude Code. Access all 1,554 tools from any terminal session. Zero config.',
    badge: 'npx',
    badgeColor: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20',
    cta: 'View Setup',
    href: '/install',
    target: '_self',
    secondary: 'npx -y 0nmcp',
    comingSoon: false,
    price: 'Free',
    isDownload: false,
  },
  {
    key: 'cli',
    icon: Package,
    name: '0nMCP CLI',
    description: 'The full orchestrator as a global npm package. 1,554 tools, 96 services, zero config.',
    badge: 'v4.5.1',
    badgeColor: 'text-[#7ed957] bg-[#7ed957]/10 border-[#7ed957]/20',
    cta: 'Install via npm',
    href: 'https://www.npmjs.com/package/0nmcp',
    target: '_blank',
    secondary: 'npm install -g 0nmcp',
    comingSoon: false,
    price: 'Free',
    isDownload: false,
  },
  {
    key: 'chatgpt',
    icon: Bot,
    name: '0n for ChatGPT',
    description: 'Custom GPT with 7 API Actions. Paste your 0n token, execute across 96 services from ChatGPT.',
    badge: 'Free',
    badgeColor: 'text-[#7ed957] bg-[#7ed957]/10 border-[#7ed957]/20',
    cta: 'Setup Guide',
    href: 'https://github.com/0nork/0n-core-skill/tree/main/extensions/chatgpt',
    target: '_blank',
    secondary: null,
    comingSoon: false,
    price: 'Free',
    isDownload: false,
  },
  {
    key: 'gemini',
    icon: Sparkles,
    name: '0n for Gemini',
    description: 'Google Gemini Gem with function calling. 5 tool declarations, same 0n token, same power.',
    badge: 'Free',
    badgeColor: 'text-[#7ed957] bg-[#7ed957]/10 border-[#7ed957]/20',
    cta: 'Setup Guide',
    href: 'https://github.com/0nork/0n-core-skill/tree/main/extensions/gemini',
    target: '_blank',
    secondary: null,
    comingSoon: false,
    price: 'Free',
    isDownload: false,
  },
  {
    key: 'mobile',
    icon: Smartphone,
    name: 'Mobile App',
    description: 'Pocket access to your entire 0nMCP stack. iOS and Android apps in development.',
    badge: 'Coming Soon',
    badgeColor: 'text-white/45 bg-white/[0.06] border-white/10',
    cta: 'Notify Me',
    href: null,
    target: null,
    secondary: null,
    comingSoon: true,
    price: null,
    isDownload: false,
  },
]

export default function DownloadsPage() {
  return (
    <div className="min-h-screen bg-[#020810] flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7ed957]/10 border border-[#7ed957]/20 rounded-full text-xs font-semibold text-[#7ed957] mb-5">
            <Package className="w-3.5 h-3.5" />
            1,554 tools across 96 services
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-3">
            Extend 0n{' '}
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              Everywhere
            </span>
          </h1>
          <p className="text-sm text-white/45 max-w-lg mx-auto">
            Browser, terminal, CMS, Slack, or AI chat — plug 0nCore into every tool you use.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOWNLOADS.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className={`bg-white/[0.02] border border-white/10 rounded-xl p-6 flex flex-col gap-4 transition-all ${item.comingSoon ? 'opacity-60' : 'hover:border-white/20'}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#020810] border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-white/75" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white leading-tight">{item.name}</h2>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                  </div>
                  {item.comingSoon && (
                    <Clock className="w-4 h-4 text-white/45 shrink-0 mt-0.5" />
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-white/45 leading-relaxed flex-1">
                  {item.description}
                </p>

                {/* Command snippet */}
                {item.secondary && (
                  <code className="block bg-[#020810] border border-white/10 rounded-lg px-4 py-2.5 text-xs text-[#7ed957] font-mono">
                    {item.secondary}
                  </code>
                )}

                {/* CTA */}
                {item.comingSoon ? (
                  <button
                    disabled
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-lg text-xs font-semibold text-white/45 cursor-not-allowed"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Coming Soon
                  </button>
                ) : (
                  <a
                    href={item.href!}
                    target={item.target === '_blank' ? '_blank' : undefined}
                    rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
                    onClick={() => trackDownload(item.key, item.isDownload ? 'download_start' : 'click')}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#7ed957] text-[#020810] font-bold text-xs rounded-lg hover:brightness-110 transition-all"
                  >
                    {item.isDownload && <Download className="w-3.5 h-3.5" />}
                    {item.cta}
                    {!item.isDownload && item.target === '_blank' ? (
                      <ExternalLink className="w-3.5 h-3.5" />
                    ) : !item.isDownload ? (
                      <ArrowRight className="w-3.5 h-3.5" />
                    ) : null}
                  </a>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-white/45 mt-10">
          All extensions connect to your 0nMCP account.{' '}
          <a href="/install" className="text-[#00d4ff] hover:underline">
            Set up 0nMCP first
          </a>{' '}
          if you haven&apos;t already.
        </p>

      </div>
    </div>
  )
}
