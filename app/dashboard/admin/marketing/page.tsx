'use client'

import { useState } from 'react'

export default function MarketingToolsPage() {
  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--jp-green)', margin: 0, letterSpacing: -0.5 }}>
          Marketing Tools
        </h1>
        <p style={{ color: 'var(--jp-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
          AI-powered content generation for LinkedIn, email, and social media
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 20 }}>
        <LinkedInCommentGenerator />
        <PostComposer />
        <EmailTemplateGenerator />
        <HashtagGenerator />
      </div>
    </div>
  )
}

function LinkedInCommentGenerator() {
  const [postContent, setPostContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<{ style: string; comment: string; topic: string }[]>([])
  const [copied, setCopied] = useState<number | null>(null)

  async function generate() {
    setLoading(true)
    setComments([])
    try {
      const res = await fetch('/api/admin/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'linkedin_comment_bot',
          input: { postContent, topics: postContent.split(',').map(t => t.trim()).filter(Boolean) },
        }),
      })
      const data = await res.json()
      setComments(data.comments || [])
    } catch {
      // Silent fail
    }
    setLoading(false)
  }

  function copy(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{
      background: 'var(--jp-bg-card)',
      border: '1px solid var(--jp-border)',
      borderRadius: 'var(--jp-radius)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--jp-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--jp-radius-xs)',
          background: 'rgba(0, 212, 255, 0.1)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width={16} height={16} fill="none" stroke="var(--jp-cyan)" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 4a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
        </div>
        <h3 style={{ color: 'var(--jp-text)', fontSize: 15, fontWeight: 700, margin: 0 }}>LinkedIn Comment Generator</h3>
      </div>

      <div style={{ padding: 20 }}>
        <label style={{ color: 'var(--jp-text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
          Post Content or Topics
        </label>
        <textarea
          value={postContent}
          onChange={e => setPostContent(e.target.value)}
          placeholder="Paste a LinkedIn post or enter topics (comma-separated)..."
          style={{
            width: '100%',
            minHeight: 80,
            padding: '10px 12px',
            background: 'var(--jp-bg-input)',
            border: '1px solid var(--jp-border)',
            borderRadius: 'var(--jp-radius-xs)',
            color: 'var(--jp-text)',
            fontSize: 13,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            marginBottom: 12,
          }}
        />
        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: '10px 24px',
            background: loading ? 'var(--jp-bg)' : 'linear-gradient(135deg, #00d4ff, #00a8cc)',
            color: loading ? 'var(--jp-text-muted)' : '#000',
            border: loading ? '1px solid var(--jp-border)' : 'none',
            borderRadius: 'var(--jp-radius-xs)',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Generating...' : 'Generate Comments'}
        </button>

        {comments.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {comments.map((c, i) => (
              <div key={i} style={{
                background: 'var(--jp-bg)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius-sm)',
                padding: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{
                    padding: '2px 8px',
                    background: i === 0 ? 'rgba(0, 212, 255, 0.1)' : i === 1 ? 'rgba(126, 217, 87, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                    borderRadius: 4,
                    color: i === 0 ? 'var(--jp-cyan)' : i === 1 ? 'var(--jp-green)' : 'var(--jp-purple)',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}>
                    {c.style}
                  </span>
                  <button
                    onClick={() => copy(c.comment, i)}
                    style={{
                      padding: '4px 10px',
                      background: copied === i ? 'rgba(126, 217, 87, 0.1)' : 'var(--jp-bg-card)',
                      border: `1px solid ${copied === i ? 'var(--jp-green)' : 'var(--jp-border)'}`,
                      borderRadius: 4,
                      color: copied === i ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {copied === i ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p style={{ color: 'var(--jp-text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{c.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PostComposer() {
  const [topic, setTopic] = useState('')
  const [style, setStyle] = useState<'insight' | 'story' | 'list' | 'question'>('insight')
  const [loading, setLoading] = useState(false)
  const [posts, setPosts] = useState<{ hook: string; body: string; cta: string; hashtags: string[] }[]>([])
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true)
    setPosts([])
    try {
      const res = await fetch('/api/admin/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'content_pipeline', input: { topic: `${topic} (${style} style)` } }),
      })
      const data = await res.json()
      setPosts(data.linkedin_posts || [])
    } catch {
      // Silent fail
    }
    setLoading(false)
  }

  function copyPost(post: { hook: string; body: string; cta: string; hashtags: string[] }) {
    navigator.clipboard.writeText(`${post.hook}\n\n${post.body}\n\n${post.cta}\n\n${post.hashtags.join(' ')}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const styles = [
    { key: 'insight' as const, label: 'Insight' },
    { key: 'story' as const, label: 'Story' },
    { key: 'list' as const, label: 'List' },
    { key: 'question' as const, label: 'Question' },
  ]

  return (
    <div style={{
      background: 'var(--jp-bg-card)',
      border: '1px solid var(--jp-border)',
      borderRadius: 'var(--jp-radius)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--jp-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--jp-radius-xs)',
          background: 'rgba(167, 139, 250, 0.1)',
          border: '1px solid rgba(167, 139, 250, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width={16} height={16} fill="none" stroke="var(--jp-purple)" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h3 style={{ color: 'var(--jp-text)', fontSize: 15, fontWeight: 700, margin: 0 }}>Post Composer</h3>
      </div>

      <div style={{ padding: 20 }}>
        <label style={{ color: 'var(--jp-text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
          Topic
        </label>
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g., AI workflow automation, MCP tools..."
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--jp-bg-input)',
            border: '1px solid var(--jp-border)',
            borderRadius: 'var(--jp-radius-xs)',
            color: 'var(--jp-text)',
            fontSize: 13,
            outline: 'none',
            marginBottom: 12,
          }}
        />

        <label style={{ color: 'var(--jp-text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
          Style
        </label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {styles.map(s => (
            <button
              key={s.key}
              onClick={() => setStyle(s.key)}
              style={{
                padding: '6px 14px',
                background: style === s.key ? 'rgba(167, 139, 250, 0.12)' : 'var(--jp-bg)',
                border: `1px solid ${style === s.key ? 'var(--jp-purple)' : 'var(--jp-border)'}`,
                borderRadius: 20,
                color: style === s.key ? 'var(--jp-purple)' : 'var(--jp-text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: '10px 24px',
            background: loading ? 'var(--jp-bg)' : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            color: loading ? 'var(--jp-text-muted)' : '#fff',
            border: loading ? '1px solid var(--jp-border)' : 'none',
            borderRadius: 'var(--jp-radius-xs)',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Generating...' : 'Generate Posts'}
        </button>

        {posts.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.map((post, i) => (
              <div key={i} style={{
                background: 'var(--jp-bg)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius-sm)',
                padding: 14,
              }}>
                <div style={{ color: 'var(--jp-text)', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{post.hook}</div>
                <pre style={{
                  color: 'var(--jp-text-secondary)',
                  fontSize: 12,
                  margin: '0 0 8px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                }}>
                  {post.body}
                </pre>
                <div style={{ color: 'var(--jp-green)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{post.cta}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {post.hashtags.map((h, j) => (
                    <span key={j} style={{
                      padding: '2px 6px',
                      background: 'rgba(0, 212, 255, 0.08)',
                      borderRadius: 4,
                      color: 'var(--jp-cyan)',
                      fontSize: 10,
                    }}>{h}</span>
                  ))}
                </div>
                <button
                  onClick={() => copyPost(post)}
                  style={{
                    padding: '6px 14px',
                    background: copied ? 'rgba(126, 217, 87, 0.1)' : 'var(--jp-bg-card)',
                    border: `1px solid ${copied ? 'var(--jp-green)' : 'var(--jp-border)'}`,
                    borderRadius: 'var(--jp-radius-xs)',
                    color: copied ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmailTemplateGenerator() {
  const [audience, setAudience] = useState('free-tier')
  const [purpose, setPurpose] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ contact_name: string; message: { subject: string; body: string; type: string } }[] | null>(null)
  const [copied, setCopied] = useState(false)

  const audiences = ['free-tier', 'trial', 'paying', 'churned', 'leads', 'partners']

  async function generate() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lead_nurture_sequence' }),
      })
      const data = await res.json()
      setResult(data.messages || [])
    } catch {
      // Silent fail
    }
    setLoading(false)
  }

  function copyEmail(msg: { subject: string; body: string }) {
    navigator.clipboard.writeText(`Subject: ${msg.subject}\n\n${msg.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: 'var(--jp-bg-card)',
      border: '1px solid var(--jp-border)',
      borderRadius: 'var(--jp-radius)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--jp-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--jp-radius-xs)',
          background: 'rgba(126, 217, 87, 0.1)',
          border: '1px solid rgba(126, 217, 87, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width={16} height={16} fill="none" stroke="var(--jp-green)" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 style={{ color: 'var(--jp-text)', fontSize: 15, fontWeight: 700, margin: 0 }}>Email Template Generator</h3>
      </div>

      <div style={{ padding: 20 }}>
        <label style={{ color: 'var(--jp-text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
          Audience
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {audiences.map(a => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              style={{
                padding: '5px 12px',
                background: audience === a ? 'rgba(126, 217, 87, 0.12)' : 'var(--jp-bg)',
                border: `1px solid ${audience === a ? 'var(--jp-green)' : 'var(--jp-border)'}`,
                borderRadius: 20,
                color: audience === a ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {a}
            </button>
          ))}
        </div>

        <label style={{ color: 'var(--jp-text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
          Purpose (optional)
        </label>
        <input
          type="text"
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
          placeholder="e.g., onboarding, re-engagement, feature announcement..."
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--jp-bg-input)',
            border: '1px solid var(--jp-border)',
            borderRadius: 'var(--jp-radius-xs)',
            color: 'var(--jp-text)',
            fontSize: 13,
            outline: 'none',
            marginBottom: 14,
          }}
        />

        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: '10px 24px',
            background: loading ? 'var(--jp-bg)' : 'linear-gradient(135deg, #7ed957, #5cb83a)',
            color: loading ? 'var(--jp-text-muted)' : '#000',
            border: loading ? '1px solid var(--jp-border)' : 'none',
            borderRadius: 'var(--jp-radius-xs)',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Generating...' : 'Generate Emails'}
        </button>

        {result && result.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.slice(0, 3).map((m, i) => (
              <div key={i} style={{
                background: 'var(--jp-bg)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius-sm)',
                padding: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: 'var(--jp-text)', fontSize: 13, fontWeight: 600 }}>{m.contact_name}</span>
                  <span style={{
                    padding: '2px 8px',
                    background: 'rgba(126, 217, 87, 0.1)',
                    borderRadius: 4,
                    color: 'var(--jp-green)',
                    fontSize: 10,
                    fontWeight: 600,
                  }}>
                    {m.message.type}
                  </span>
                </div>
                <div style={{ color: 'var(--jp-cyan)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {m.message.subject}
                </div>
                <pre style={{
                  color: 'var(--jp-text-secondary)',
                  fontSize: 12,
                  margin: '0 0 10px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                }}>
                  {m.message.body}
                </pre>
                <button
                  onClick={() => copyEmail(m.message)}
                  style={{
                    padding: '4px 10px',
                    background: copied ? 'rgba(126, 217, 87, 0.1)' : 'var(--jp-bg-card)',
                    border: `1px solid ${copied ? 'var(--jp-green)' : 'var(--jp-border)'}`,
                    borderRadius: 4,
                    color: copied ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {copied ? 'Copied!' : 'Copy Email'}
                </button>
              </div>
            ))}
          </div>
        )}

        {result && result.length === 0 && (
          <div style={{ marginTop: 16, padding: 20, textAlign: 'center', color: 'var(--jp-text-muted)', fontSize: 13 }}>
            No contacts found. Tag contacts as &quot;needs-onboarding&quot; or &quot;free-tier&quot; in CRM first.
          </div>
        )}
      </div>
    </div>
  )
}

function HashtagGenerator() {
  const [topic, setTopic] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  function generate() {
    if (!topic.trim()) return
    setLoading(true)

    // Generate relevant hashtags based on topic
    const topicLower = topic.toLowerCase()
    const base: string[] = []

    // Always include brand hashtags
    base.push('#0nMCP', '#0nork')

    // Topic-specific hashtags
    const hashtagMap: Record<string, string[]> = {
      ai: ['#AI', '#ArtificialIntelligence', '#MachineLearning', '#AITools', '#GenerativeAI', '#AIAutomation', '#LLM'],
      automation: ['#Automation', '#WorkflowAutomation', '#NoCode', '#LowCode', '#ProcessAutomation', '#RPA'],
      mcp: ['#MCP', '#ModelContextProtocol', '#AIProtocol', '#MCPServer', '#MCPTools'],
      api: ['#API', '#APIIntegration', '#REST', '#WebhookAutomation', '#APIDevelopment'],
      saas: ['#SaaS', '#B2BSaaS', '#SaaSStartup', '#CloudSoftware', '#SaaSGrowth'],
      crm: ['#CRM', '#CustomerSuccess', '#SalesAutomation', '#LeadGeneration'],
      devtools: ['#DevTools', '#DeveloperExperience', '#DevOps', '#OpenSource', '#GitHub'],
      marketing: ['#DigitalMarketing', '#ContentMarketing', '#GrowthHacking', '#MarketingAutomation'],
      startup: ['#Startup', '#Entrepreneurship', '#TechStartup', '#Founder', '#BuildInPublic'],
      linkedin: ['#LinkedIn', '#PersonalBranding', '#LinkedInTips', '#Networking', '#ThoughtLeadership'],
      orchestration: ['#Orchestration', '#APIOrchestration', '#ServiceMesh', '#Microservices'],
      workflow: ['#Workflow', '#WorkflowBuilder', '#BusinessProcess', '#Productivity'],
    }

    for (const [key, tags] of Object.entries(hashtagMap)) {
      if (topicLower.includes(key)) {
        base.push(...tags)
      }
    }

    // If no specific matches, add generic tech hashtags
    if (base.length <= 2) {
      base.push('#Tech', '#Innovation', '#Technology', '#Digital', '#Software', '#Cloud', '#FutureOfWork', '#TechTrends')
    }

    // Deduplicate and limit to 10
    const unique = [...new Set(base)].slice(0, 10)
    setHashtags(unique)
    setLoading(false)
  }

  function copyAll() {
    navigator.clipboard.writeText(hashtags.join(' '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: 'var(--jp-bg-card)',
      border: '1px solid var(--jp-border)',
      borderRadius: 'var(--jp-radius)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--jp-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--jp-radius-xs)',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width={16} height={16} fill="none" stroke="var(--jp-amber)" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </div>
        <h3 style={{ color: 'var(--jp-text)', fontSize: 15, fontWeight: 700, margin: 0 }}>Hashtag Generator</h3>
      </div>

      <div style={{ padding: 20 }}>
        <label style={{ color: 'var(--jp-text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
          Topic
        </label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="e.g., AI automation, MCP tools, SaaS marketing..."
            style={{
              flex: 1,
              padding: '10px 12px',
              background: 'var(--jp-bg-input)',
              border: '1px solid var(--jp-border)',
              borderRadius: 'var(--jp-radius-xs)',
              color: 'var(--jp-text)',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            style={{
              padding: '10px 20px',
              background: loading ? 'var(--jp-bg)' : 'linear-gradient(135deg, #fbbf24, #d97706)',
              color: loading ? 'var(--jp-text-muted)' : '#000',
              border: loading ? '1px solid var(--jp-border)' : 'none',
              borderRadius: 'var(--jp-radius-xs)',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading || !topic.trim() ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Generate
          </button>
        </div>

        {hashtags.length > 0 && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {hashtags.map((h, i) => (
                <span key={i} style={{
                  padding: '6px 12px',
                  background: 'rgba(251, 191, 36, 0.08)',
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                  borderRadius: 20,
                  color: 'var(--jp-amber)',
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  {h}
                </span>
              ))}
            </div>
            <button
              onClick={copyAll}
              style={{
                padding: '6px 14px',
                background: copied ? 'rgba(126, 217, 87, 0.1)' : 'var(--jp-bg)',
                border: `1px solid ${copied ? 'var(--jp-green)' : 'var(--jp-border)'}`,
                borderRadius: 'var(--jp-radius-xs)',
                color: copied ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied All!' : 'Copy All Hashtags'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
