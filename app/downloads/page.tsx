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
} from 'lucide-react'

const DOWNLOADS = [
  {
    key: 'chrome',
    icon: Chrome,
    name: 'Chrome Extension',
    description: 'Add 0nMCP to your browser. Inject AI tools into any web app with a single click.',
    badge: 'v3.0',
    badgeColor: 'text-core-green bg-core-green/10 border-core-green/20',
    cta: 'Add to Chrome',
    href: 'https://chrome.google.com/webstore',
    target: '_blank',
    secondary: null,
    comingSoon: false,
  },
  {
    key: 'slack',
    icon: MessageSquare,
    name: 'Slack App',
    description: 'Run 0nMCP workflows directly from Slack. App Home, slash commands, and smart notifications.',
    badge: 'v1.0',
    badgeColor: 'text-core-purple bg-core-purple/10 border-core-purple/20',
    cta: 'Add to Slack',
    href: 'https://slack.com/oauth/v2/authorize',
    target: '_blank',
    secondary: null,
    comingSoon: false,
  },
  {
    key: 'wordpress',
    icon: Globe,
    name: 'WordPress Plugin',
    description: 'Connect your WordPress site to 0nMCP. Auto-publish, SEO enrichment, and CRM sync.',
    badge: 'v1.2',
    badgeColor: 'text-core-cyan bg-core-cyan/10 border-core-cyan/20',
    cta: 'Download Plugin',
    href: 'https://wordpress.org/plugins',
    target: '_blank',
    secondary: null,
    comingSoon: false,
  },
  {
    key: 'claude-code',
    icon: Terminal,
    name: 'Claude Code',
    description: 'Use 0nMCP inside Claude Code. Configure once, access all 1,554 tools from any terminal session.',
    badge: 'npx',
    badgeColor: 'text-core-amber bg-core-amber/10 border-core-amber/20',
    cta: 'View Setup',
    href: '/install',
    target: '_self',
    secondary: 'npx -y 0nmcp',
    comingSoon: false,
  },
  {
    key: 'mobile',
    icon: Smartphone,
    name: 'Mobile App',
    description: 'Pocket access to your entire 0nMCP stack. iOS and Android apps in development.',
    badge: 'Coming Soon',
    badgeColor: 'text-core-text-muted bg-core-border/30 border-core-border',
    cta: 'Notify Me',
    href: null,
    target: null,
    secondary: null,
    comingSoon: true,
  },
  {
    key: 'cli',
    icon: Package,
    name: '0nMCP CLI',
    description: 'The full 0nMCP orchestrator as a global npm package. 1,554 tools, 96 services, zero config.',
    badge: 'v4.5.1',
    badgeColor: 'text-core-green bg-core-green/10 border-core-green/20',
    cta: 'npm i -g 0nmcp',
    href: 'https://www.npmjs.com/package/0nmcp',
    target: '_blank',
    secondary: 'npm install -g 0nmcp',
    comingSoon: false,
  },
  {
    key: 'chatgpt',
    icon: Bot,
    name: '0n for ChatGPT',
    description: 'Custom GPT with 7 API Actions. Paste your 0n token, execute across 96 services from ChatGPT.',
    badge: 'Free',
    badgeColor: 'text-core-green bg-core-green/10 border-core-green/20',
    cta: 'Setup Guide',
    href: 'https://github.com/0nork/0n-core-skill/tree/main/extensions/chatgpt',
    target: '_blank',
    secondary: null,
    comingSoon: false,
  },
  {
    key: 'gemini',
    icon: Sparkles,
    name: '0n for Gemini',
    description: 'Google Gemini Gem with function calling. 5 tool declarations, same 0n token, same power.',
    badge: 'Free',
    badgeColor: 'text-core-green bg-core-green/10 border-core-green/20',
    cta: 'Setup Guide',
    href: 'https://github.com/0nork/0n-core-skill/tree/main/extensions/gemini',
    target: '_blank',
    secondary: null,
    comingSoon: false,
  },
]

export default function DownloadsPage() {
  return (
    <div className="min-h-screen bg-core-bg flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-core-green/10 border border-core-green/20 rounded-full text-xs font-semibold text-core-green mb-5">
            <Package className="w-3.5 h-3.5" />
            0n Ecosystem
          </div>
          <h1 className="text-3xl font-bold text-core-text mb-3">
            Downloads &amp; Integrations
          </h1>
          <p className="text-sm text-core-text-muted max-w-lg mx-auto">
            Every way to connect 0nMCP to your workflow — browser, terminal, CMS, or chat.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOWNLOADS.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className={`bg-core-card border border-core-border rounded-xl p-6 flex flex-col gap-4 transition-all ${item.comingSoon ? 'opacity-60' : 'hover:border-core-border-hi'}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-core-bg border border-core-border flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-core-text-dim" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-core-text leading-tight">{item.name}</h2>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                  </div>
                  {item.comingSoon && (
                    <Clock className="w-4 h-4 text-core-text-muted shrink-0 mt-0.5" />
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-core-text-muted leading-relaxed flex-1">
                  {item.description}
                </p>

                {/* Command snippet */}
                {item.secondary && (
                  <code className="block bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-xs text-core-green font-mono">
                    {item.secondary}
                  </code>
                )}

                {/* CTA */}
                {item.comingSoon ? (
                  <button
                    disabled
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-core-border/20 border border-core-border rounded-lg text-xs font-semibold text-core-text-muted cursor-not-allowed"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Coming Soon
                  </button>
                ) : (
                  <a
                    href={item.href!}
                    target={item.target === '_blank' ? '_blank' : undefined}
                    rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-core-green text-core-bg font-bold text-xs rounded-lg hover:brightness-110 transition-all"
                  >
                    {item.cta}
                    {item.target === '_blank' ? (
                      <ExternalLink className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </a>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-core-text-muted mt-10">
          All extensions connect to your 0nMCP account.{' '}
          <a href="/install" className="text-core-cyan hover:underline">
            Set up 0nMCP first
          </a>{' '}
          if you haven&apos;t already.
        </p>

      </div>
    </div>
  )
}
