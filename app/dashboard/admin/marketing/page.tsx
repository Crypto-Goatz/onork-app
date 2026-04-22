'use client'

import { useState } from 'react'
import {
  MessageSquare, FileText, Mail, Hash, Megaphone, BarChart3,
  TrendingUp, Users, CalendarDays, Copy, Check,
} from 'lucide-react'

const SECTIONS = [
  { key: 'linkedin', label: 'LinkedIn Comments', icon: MessageSquare, color: 'text-core-cyan' },
  { key: 'composer', label: 'Post Composer', icon: FileText, color: 'text-core-purple' },
  { key: 'email', label: 'Email Templates', icon: Mail, color: 'text-core-green' },
  { key: 'hashtags', label: 'Hashtag Generator', icon: Hash, color: 'text-core-amber' },
  { key: 'campaigns', label: 'Campaign Stats', icon: Megaphone, color: 'text-orange-400' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-teal-400' },
  { key: 'audience', label: 'Audience', icon: Users, color: 'text-pink-400' },
  { key: 'schedule', label: 'Schedule', icon: CalendarDays, color: 'text-core-text-dim' },
] as const

// hex values for dynamic color props
const SECTION_HEX: Record<string, string> = {
  linkedin: '#00d4ff',
  composer: '#a78bfa',
  email: '#7ed957',
  hashtags: '#fbbf24',
  campaigns: '#f97316',
  analytics: '#14b8a6',
  audience: '#ec4899',
  schedule: '#6b7280',
}

type SectionKey = typeof SECTIONS[number]['key']

export default function MarketingToolsPage() {
  const [active, setActive] = useState<SectionKey>('linkedin')
  const [linkedinInput, setLinkedinInput] = useState('')
  const [linkedinLoading, setLinkedinLoading] = useState(false)
  const [linkedinComments, setLinkedinComments] = useState<{ style: string; comment: string }[]>([])
  const [composerTopic, setComposerTopic] = useState('')
  const [composerStyle, setComposerStyle] = useState('insight')
  const [composerLoading, setComposerLoading] = useState(false)
  const [composerPosts, setComposerPosts] = useState<{ hook: string; body: string; cta: string; hashtags: string[] }[]>([])
  const [emailAudience, setEmailAudience] = useState('free-tier')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailResults, setEmailResults] = useState<{ contact_name: string; message: { subject: string; body: string; type: string } }[]>([])
  const [hashtagTopic, setHashtagTopic] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function generateLinkedin() {
    setLinkedinLoading(true)
    try {
      const res = await fetch('/api/admin/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'linkedin_comment_bot', input: { postContent: linkedinInput, topics: linkedinInput.split(',').map(t => t.trim()) } }) })
      const data = await res.json()
      setLinkedinComments(data.comments || [])
    } catch {}
    setLinkedinLoading(false)
  }

  async function generatePosts() {
    setComposerLoading(true)
    try {
      const res = await fetch('/api/admin/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'content_pipeline', input: { topic: `${composerTopic} (${composerStyle} style)` } }) })
      const data = await res.json()
      setComposerPosts(data.linkedin_posts || [])
    } catch {}
    setComposerLoading(false)
  }

  async function generateEmails() {
    setEmailLoading(true)
    try {
      const res = await fetch('/api/admin/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'lead_nurture_sequence' }) })
      const data = await res.json()
      setEmailResults(data.messages || [])
    } catch {}
    setEmailLoading(false)
  }

  function generateHashtags() {
    if (!hashtagTopic.trim()) return
    const map: Record<string, string[]> = {
      ai: ['#AI', '#ArtificialIntelligence', '#AITools', '#GenerativeAI', '#LLM'],
      automation: ['#Automation', '#WorkflowAutomation', '#NoCode', '#ProcessAutomation'],
      mcp: ['#MCP', '#ModelContextProtocol', '#MCPServer', '#AIProtocol'],
      saas: ['#SaaS', '#B2BSaaS', '#CloudSoftware', '#SaaSGrowth'],
      crm: ['#CRM', '#SalesAutomation', '#LeadGeneration'],
      marketing: ['#DigitalMarketing', '#ContentMarketing', '#GrowthHacking'],
    }
    const base = ['#0nMCP', '#0nork']
    const t = hashtagTopic.toLowerCase()
    for (const [k, v] of Object.entries(map)) { if (t.includes(k)) base.push(...v) }
    if (base.length <= 2) base.push('#Tech', '#Innovation', '#Software', '#Cloud', '#FutureOfWork')
    setHashtags([...new Set(base)].slice(0, 10))
  }

  const activeSection = SECTIONS.find(s => s.key === active)
  const ActiveIcon = activeSection?.icon

  return (
    <div className="flex gap-0 min-h-[calc(100vh-80px)]">
      {/* Main content */}
      <div className="flex-1 pr-6 pb-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-core-text m-0">Marketing Tools</h1>
          <p className="text-core-text-muted text-[13px] mt-1 mb-0">
            AI-powered content generation and campaign management
          </p>
        </div>

        {/* LinkedIn Comments */}
        {active === 'linkedin' && (
          <div className="rounded-xl border border-core-border/50 bg-core-card/50 p-6">
            <h2 className="text-base font-bold text-core-text mb-4">LinkedIn Comment Generator</h2>
            <textarea
              value={linkedinInput}
              onChange={e => setLinkedinInput(e.target.value)}
              placeholder="Paste a LinkedIn post or enter topics..."
              className="w-full rounded-lg border border-core-border/50 bg-core-surface p-3 text-sm text-core-text placeholder:text-core-text-muted resize-y min-h-20 outline-none"
            />
            <button
              onClick={generateLinkedin}
              disabled={linkedinLoading}
              className={[
                'mt-3 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150',
                linkedinLoading
                  ? 'bg-transparent text-core-text-muted border border-core-border/20'
                  : 'bg-gradient-to-br from-core-cyan to-[#00a8cc] text-black border-0',
              ].join(' ')}
            >
              {linkedinLoading ? 'Generating...' : 'Generate Comments'}
            </button>
            {linkedinComments.map((c, i) => (
              <div key={i} className="mt-3 rounded-lg border border-core-border/50 bg-core-surface p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-semibold uppercase text-core-cyan bg-core-cyan/10 px-2 py-0.5 rounded">
                    {c.style}
                  </span>
                  <button
                    onClick={() => copy(c.comment, `li-${i}`)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-core-border/50 text-core-text-muted hover:text-core-text transition-colors"
                  >
                    {copied === `li-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === `li-${i}` ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[13px] text-core-text-dim leading-relaxed m-0">{c.comment}</p>
              </div>
            ))}
          </div>
        )}

        {/* Post Composer */}
        {active === 'composer' && (
          <div className="rounded-xl border border-core-border/50 bg-core-card/50 p-6">
            <h2 className="text-base font-bold text-core-text mb-4">Post Composer</h2>
            <input
              value={composerTopic}
              onChange={e => setComposerTopic(e.target.value)}
              placeholder="Topic..."
              className="w-full rounded-lg border border-core-border/50 bg-core-surface px-3 py-2.5 text-sm text-core-text placeholder:text-core-text-muted mb-3 outline-none"
            />
            <div className="flex gap-2 mb-4">
              {['insight', 'story', 'list', 'question'].map(s => (
                <button
                  key={s}
                  onClick={() => setComposerStyle(s)}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
                    composerStyle === s
                      ? 'bg-core-purple/12 text-core-purple border border-core-purple'
                      : 'bg-transparent text-core-text-muted border border-core-border/20 hover:text-core-text',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={generatePosts}
              disabled={composerLoading}
              className={[
                'px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150',
                composerLoading
                  ? 'bg-transparent text-core-text-muted border border-core-border/20'
                  : 'bg-gradient-to-br from-core-purple to-[#7c3aed] text-white border-0',
              ].join(' ')}
            >
              {composerLoading ? 'Generating...' : 'Generate Posts'}
            </button>
            {composerPosts.map((p, i) => (
              <div key={i} className="mt-3 rounded-lg border border-core-border/50 bg-core-surface p-4">
                <div className="text-[15px] font-bold text-core-text mb-2">{p.hook}</div>
                <pre className="text-xs text-core-text-muted whitespace-pre-wrap font-sans leading-relaxed m-0 mb-2">{p.body}</pre>
                <div className="text-core-green text-xs font-semibold mb-2">{p.cta}</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.hashtags.map((h, j) => (
                    <span key={j} className="text-[10px] text-core-cyan bg-core-cyan/[0.08] px-1.5 py-0.5 rounded">
                      {h}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => copy(`${p.hook}\n\n${p.body}\n\n${p.cta}\n\n${p.hashtags.join(' ')}`, `post-${i}`)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-core-border/50 text-core-text-muted hover:text-core-text transition-colors"
                >
                  {copied === `post-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === `post-${i}` ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Email Templates */}
        {active === 'email' && (
          <div className="rounded-xl border border-core-border/50 bg-core-card/50 p-6">
            <h2 className="text-base font-bold text-core-text mb-4">Email Template Generator</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {['free-tier', 'trial', 'paying', 'churned', 'leads', 'partners'].map(a => (
                <button
                  key={a}
                  onClick={() => setEmailAudience(a)}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
                    emailAudience === a
                      ? 'bg-core-green/12 text-core-green border border-core-green'
                      : 'bg-transparent text-core-text-muted border border-core-border/20 hover:text-core-text',
                  ].join(' ')}
                >
                  {a}
                </button>
              ))}
            </div>
            <button
              onClick={generateEmails}
              disabled={emailLoading}
              className={[
                'px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150',
                emailLoading
                  ? 'bg-transparent text-core-text-muted border border-core-border/20'
                  : 'bg-gradient-to-br from-core-green to-[#5cb83a] text-black border-0',
              ].join(' ')}
            >
              {emailLoading ? 'Generating...' : 'Generate Emails'}
            </button>
            {emailResults.slice(0, 3).map((m, i) => (
              <div key={i} className="mt-3 rounded-lg border border-core-border/50 bg-core-surface p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] font-semibold text-core-text">{m.contact_name}</span>
                  <span className="text-[10px] font-semibold text-core-green bg-core-green/10 px-2 py-0.5 rounded">
                    {m.message.type}
                  </span>
                </div>
                <div className="text-core-cyan text-[13px] font-semibold mb-1.5">{m.message.subject}</div>
                <pre className="text-xs text-core-text-muted whitespace-pre-wrap font-sans leading-relaxed m-0 mb-2">{m.message.body}</pre>
                <button
                  onClick={() => copy(`Subject: ${m.message.subject}\n\n${m.message.body}`, `email-${i}`)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-core-border/50 text-core-text-muted hover:text-core-text transition-colors"
                >
                  {copied === `email-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === `email-${i}` ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hashtags */}
        {active === 'hashtags' && (
          <div className="rounded-xl border border-core-border/50 bg-core-card/50 p-6">
            <h2 className="text-base font-bold text-core-text mb-4">Hashtag Generator</h2>
            <div className="flex gap-2 mb-4">
              <input
                value={hashtagTopic}
                onChange={e => setHashtagTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generateHashtags()}
                placeholder="Topic..."
                className="flex-1 rounded-lg border border-core-border/50 bg-core-surface px-3 py-2.5 text-sm text-core-text placeholder:text-core-text-muted outline-none"
              />
              <button
                onClick={generateHashtags}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-br from-core-amber to-[#d97706] text-black"
              >
                Generate
              </button>
            </div>
            {hashtags.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {hashtags.map((h, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-core-amber/[0.08] border border-core-amber/20 rounded-full text-core-amber text-[13px]"
                    >
                      {h}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => copy(hashtags.join(' '), 'all-hash')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-core-border/50 text-core-text-muted hover:text-core-text transition-colors"
                >
                  {copied === 'all-hash' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === 'all-hash' ? 'Copied!' : 'Copy All'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Placeholder for other sections */}
        {['campaigns', 'analytics', 'audience', 'schedule'].includes(active) && (
          <div className="rounded-xl border border-core-border/50 bg-core-card/50 p-12 text-center">
            {ActiveIcon && (
              <div className={[activeSection?.color, 'mb-3 flex justify-center'].join(' ')}>
                <ActiveIcon className="w-10 h-10" />
              </div>
            )}
            <h2 className="text-lg font-bold text-core-text mb-1.5">{activeSection?.label}</h2>
            <p className="text-[13px] text-core-text-muted">
              Coming soon — connect your CRM to unlock {activeSection?.label?.toLowerCase()} features.
            </p>
          </div>
        )}
      </div>

      {/* Right sub-nav */}
      <div className="w-[220px] border-l border-core-border/[0.04] pl-5 shrink-0">
        <div className="sticky top-20">
          <p className="text-[10px] font-semibold text-core-text-muted/25 uppercase tracking-[0.08em] mb-3">
            Tools
          </p>
          <div className="flex flex-col gap-0.5">
            {SECTIONS.map(s => {
              const Icon = s.icon
              const isActive = active === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={[
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg border-0 cursor-pointer text-left w-full transition-colors duration-150',
                    isActive ? 'bg-core-bg/[0.04]' : 'bg-transparent hover:bg-core-bg/[0.02]',
                  ].join(' ')}
                >
                  <Icon
                    className={[
                      'w-4 h-4 transition-colors duration-150',
                      isActive ? s.color : 'text-core-text-muted/30',
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'text-[13px] transition-colors duration-150',
                      isActive ? 'font-semibold text-core-text' : 'font-normal text-core-text-muted/40',
                    ].join(' ')}
                  >
                    {s.label}
                  </span>
                  {isActive && (
                    <div
                      className="ml-auto w-1 h-1 rounded-[2px]"
                      style={{ background: SECTION_HEX[s.key] }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
