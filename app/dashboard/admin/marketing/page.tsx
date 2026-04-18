'use client'

import { useState } from 'react'
import {
  MessageSquare, FileText, Mail, Hash, Megaphone, BarChart3,
  TrendingUp, Users, CalendarDays,
} from 'lucide-react'

const SECTIONS = [
  { key: 'linkedin', label: 'LinkedIn Comments', icon: <MessageSquare className="h-4 w-4" />, color: '#00d4ff' },
  { key: 'composer', label: 'Post Composer', icon: <FileText className="h-4 w-4" />, color: '#a78bfa' },
  { key: 'email', label: 'Email Templates', icon: <Mail className="h-4 w-4" />, color: '#7ed957' },
  { key: 'hashtags', label: 'Hashtag Generator', icon: <Hash className="h-4 w-4" />, color: '#fbbf24' },
  { key: 'campaigns', label: 'Campaign Stats', icon: <Megaphone className="h-4 w-4" />, color: '#f97316' },
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, color: '#14b8a6' },
  { key: 'audience', label: 'Audience', icon: <Users className="h-4 w-4" />, color: '#ec4899' },
  { key: 'schedule', label: 'Schedule', icon: <CalendarDays className="h-4 w-4" />, color: '#6b7280' },
] as const

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

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 80px)' }}>
      {/* Main content */}
      <div style={{ flex: 1, padding: '0 24px 40px 0' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>Marketing Tools</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '4px 0 0' }}>
            AI-powered content generation and campaign management
          </p>
        </div>

        {/* LinkedIn Comments */}
        {active === 'linkedin' && (
          <div className="rounded-xl border border-border/50 bg-bg-card/50 p-6">
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>LinkedIn Comment Generator</h2>
            <textarea value={linkedinInput} onChange={e => setLinkedinInput(e.target.value)} placeholder="Paste a LinkedIn post or enter topics..." className="w-full rounded-lg border border-border/50 bg-bg-secondary p-3 text-sm text-white placeholder:text-text-muted resize-y" style={{ minHeight: 80 }} />
            <button onClick={generateLinkedin} disabled={linkedinLoading} className="mt-3 px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: linkedinLoading ? 'transparent' : 'linear-gradient(135deg, #00d4ff, #00a8cc)', color: linkedinLoading ? 'rgba(255,255,255,0.4)' : '#000', border: linkedinLoading ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              {linkedinLoading ? 'Generating...' : 'Generate Comments'}
            </button>
            {linkedinComments.map((c, i) => (
              <div key={i} className="mt-3 rounded-lg border border-border/50 bg-bg-secondary p-4">
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#00d4ff', background: 'rgba(0,212,255,0.1)', padding: '2px 8px', borderRadius: 4 }}>{c.style}</span>
                  <button onClick={() => copy(c.comment, `li-${i}`)} className="text-xs px-2 py-1 rounded border border-border/50 text-text-muted hover:text-white">{copied === `li-${i}` ? 'Copied!' : 'Copy'}</button>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{c.comment}</p>
              </div>
            ))}
          </div>
        )}

        {/* Post Composer */}
        {active === 'composer' && (
          <div className="rounded-xl border border-border/50 bg-bg-card/50 p-6">
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Post Composer</h2>
            <input value={composerTopic} onChange={e => setComposerTopic(e.target.value)} placeholder="Topic..." className="w-full rounded-lg border border-border/50 bg-bg-secondary px-3 py-2.5 text-sm text-white placeholder:text-text-muted mb-3" />
            <div className="flex gap-2 mb-4">
              {['insight', 'story', 'list', 'question'].map(s => (
                <button key={s} onClick={() => setComposerStyle(s)} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: composerStyle === s ? 'rgba(167,139,250,0.12)' : 'transparent', color: composerStyle === s ? '#a78bfa' : 'rgba(255,255,255,0.4)', border: `1px solid ${composerStyle === s ? '#a78bfa' : 'rgba(255,255,255,0.08)'}` }}>{s}</button>
              ))}
            </div>
            <button onClick={generatePosts} disabled={composerLoading} className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: composerLoading ? 'transparent' : 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: composerLoading ? 'rgba(255,255,255,0.4)' : '#fff', border: composerLoading ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              {composerLoading ? 'Generating...' : 'Generate Posts'}
            </button>
            {composerPosts.map((p, i) => (
              <div key={i} className="mt-3 rounded-lg border border-border/50 bg-bg-secondary p-4">
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{p.hook}</div>
                <pre style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6, margin: '0 0 8px' }}>{p.body}</pre>
                <div style={{ color: '#7ed957', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{p.cta}</div>
                <div className="flex flex-wrap gap-1 mb-3">{p.hashtags.map((h, j) => <span key={j} style={{ fontSize: 10, color: '#00d4ff', background: 'rgba(0,212,255,0.08)', padding: '2px 6px', borderRadius: 4 }}>{h}</span>)}</div>
                <button onClick={() => copy(`${p.hook}\n\n${p.body}\n\n${p.cta}\n\n${p.hashtags.join(' ')}`, `post-${i}`)} className="text-xs px-3 py-1.5 rounded border border-border/50 text-text-muted hover:text-white">{copied === `post-${i}` ? 'Copied!' : 'Copy'}</button>
              </div>
            ))}
          </div>
        )}

        {/* Email Templates */}
        {active === 'email' && (
          <div className="rounded-xl border border-border/50 bg-bg-card/50 p-6">
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Email Template Generator</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {['free-tier', 'trial', 'paying', 'churned', 'leads', 'partners'].map(a => (
                <button key={a} onClick={() => setEmailAudience(a)} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: emailAudience === a ? 'rgba(126,217,87,0.12)' : 'transparent', color: emailAudience === a ? '#7ed957' : 'rgba(255,255,255,0.4)', border: `1px solid ${emailAudience === a ? '#7ed957' : 'rgba(255,255,255,0.08)'}` }}>{a}</button>
              ))}
            </div>
            <button onClick={generateEmails} disabled={emailLoading} className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: emailLoading ? 'transparent' : 'linear-gradient(135deg, #7ed957, #5cb83a)', color: emailLoading ? 'rgba(255,255,255,0.4)' : '#000', border: emailLoading ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              {emailLoading ? 'Generating...' : 'Generate Emails'}
            </button>
            {emailResults.slice(0, 3).map((m, i) => (
              <div key={i} className="mt-3 rounded-lg border border-border/50 bg-bg-secondary p-4">
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{m.contact_name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#7ed957', background: 'rgba(126,217,87,0.1)', padding: '2px 8px', borderRadius: 4 }}>{m.message.type}</span>
                </div>
                <div style={{ color: '#00d4ff', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{m.message.subject}</div>
                <pre style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6, margin: '0 0 8px' }}>{m.message.body}</pre>
                <button onClick={() => copy(`Subject: ${m.message.subject}\n\n${m.message.body}`, `email-${i}`)} className="text-xs px-3 py-1.5 rounded border border-border/50 text-text-muted hover:text-white">{copied === `email-${i}` ? 'Copied!' : 'Copy'}</button>
              </div>
            ))}
          </div>
        )}

        {/* Hashtags */}
        {active === 'hashtags' && (
          <div className="rounded-xl border border-border/50 bg-bg-card/50 p-6">
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Hashtag Generator</h2>
            <div className="flex gap-2 mb-4">
              <input value={hashtagTopic} onChange={e => setHashtagTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateHashtags()} placeholder="Topic..." className="flex-1 rounded-lg border border-border/50 bg-bg-secondary px-3 py-2.5 text-sm text-white placeholder:text-text-muted" />
              <button onClick={generateHashtags} className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#000' }}>Generate</button>
            </div>
            {hashtags.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {hashtags.map((h, i) => <span key={i} style={{ padding: '6px 12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 20, color: '#fbbf24', fontSize: 13 }}>{h}</span>)}
                </div>
                <button onClick={() => copy(hashtags.join(' '), 'all-hash')} className="text-xs px-3 py-1.5 rounded border border-border/50 text-text-muted hover:text-white">{copied === 'all-hash' ? 'Copied!' : 'Copy All'}</button>
              </>
            )}
          </div>
        )}

        {/* Placeholder for other sections */}
        {['campaigns', 'analytics', 'audience', 'schedule'].includes(active) && (
          <div className="rounded-xl border border-border/50 bg-bg-card/50 p-12 text-center">
            <div style={{ color: activeSection?.color }} className="mb-3">{activeSection?.icon && <span style={{ display: 'inline-block', transform: 'scale(2.5)' }}>{activeSection.icon}</span>}</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{activeSection?.label}</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Coming soon — connect your CRM to unlock {activeSection?.label?.toLowerCase()} features.</p>
          </div>
        )}
      </div>

      {/* Right sub-nav */}
      <div style={{ width: 220, borderLeft: '1px solid rgba(255,255,255,0.04)', paddingLeft: 20, flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: 80 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Tools</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: active === s.key ? 'rgba(255,255,255,0.04)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ color: active === s.key ? s.color : 'rgba(255,255,255,0.3)', transition: 'color 0.15s' }}>{s.icon}</span>
                <span style={{ fontSize: 13, fontWeight: active === s.key ? 600 : 400, color: active === s.key ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'color 0.15s' }}>{s.label}</span>
                {active === s.key && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: 2, background: s.color }} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
