'use client'

import { useState, useCallback } from 'react'

type Tab = 'compose' | 'scheduled' | 'analytics' | 'accounts'
type Tone = 'professional' | 'casual' | 'thought-leader'

interface PlatformContent {
  platform: string
  content: string
  title?: string
  charLimit: number
}

interface PostResult {
  platform: string
  success: boolean
  message: string
  url?: string
}

interface ScheduledPost {
  id: string
  content: string
  platforms: string[]
  date: string
  time: string
  status: 'pending' | 'posted' | 'failed'
  campaign?: string
}

interface SocialAccount {
  platform: string
  key: string
  connected: boolean
  handle?: string
  comingSoon?: boolean
  color: string
  icon: string
}

// ── Platform definitions ──────────────────────────────────────
const PLATFORMS: SocialAccount[] = [
  { platform: 'X / Twitter', key: 'twitter', connected: false, color: '#000000', icon: 'X' },
  { platform: 'LinkedIn', key: 'linkedin', connected: true, handle: '@rocketopp', color: '#0A66C2', icon: 'in' },
  { platform: 'Reddit', key: 'reddit', connected: true, handle: 'u/0nork', color: '#FF4500', icon: 'r/' },
  { platform: 'Dev.to', key: 'devto', connected: true, handle: '@0nmcp', color: '#0a0a0a', icon: '</>' },
  { platform: 'Facebook', key: 'facebook', connected: false, comingSoon: true, color: '#1877F2', icon: 'f' },
  { platform: 'Instagram', key: 'instagram', connected: false, comingSoon: true, color: '#E4405F', icon: 'ig' },
  { platform: 'Hacker News', key: 'hackernews', connected: false, comingSoon: true, color: '#FF6600', icon: 'Y' },
  { platform: 'GitHub Discussions', key: 'github', connected: true, handle: '0nork', color: '#24292e', icon: 'GH' },
]

const CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  reddit: 40000,
  devto: 100000,
  facebook: 63206,
  instagram: 2200,
  hackernews: 2000,
  github: 65536,
}

const HASHTAG_SUGGESTIONS = [
  '#AI', '#MCP', '#Automation', '#APIOrchestration', '#0nMCP',
  '#NoCode', '#DevTools', '#SaaS', '#OpenSource', '#AIAgents',
]

// ── Scheduled posts (demo data) ──────────────────────────────
const DEMO_SCHEDULED: ScheduledPost[] = []

// ── Analytics demo data ──────────────────────────────────────
const ANALYTICS_PLATFORMS: { platform: string; posts: number; reach: string; engagement: string; clicks: number; color: string }[] = []

const TOP_POSTS: { content: string; platform: string; reach: string; engagement: string }[] = []

// ── Chart bars (30 days) ─────────────────────────────────────
const CHART_BARS = Array(30).fill(0)

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<Tab>('compose')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<Tone>('professional')
  const [campaign, setCampaign] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'devto'])
  const [generatedContent, setGeneratedContent] = useState<PlatformContent[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [postResults, setPostResults] = useState<PostResult[]>([])
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([])
  const [scheduledPosts] = useState<ScheduledPost[]>(DEMO_SCHEDULED)
  const [scheduleView, setScheduleView] = useState<'list' | 'calendar'>('list')
  const [postTitle, setPostTitle] = useState('')

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    )
  }

  const toggleHashtag = (tag: string) => {
    setSelectedHashtags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
    )
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'compose', label: 'Compose', icon: 'M' },
    { key: 'scheduled', label: 'Scheduled', icon: 'S' },
    { key: 'analytics', label: 'Analytics', icon: 'A' },
    { key: 'accounts', label: 'Accounts', icon: 'C' },
  ]

  // ── AI Generate ──────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return
    setIsGenerating(true)
    setGeneratedContent([])
    setPostResults([])

    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          tone,
          platforms: selectedPlatforms,
          hashtags: selectedHashtags,
          title: postTitle || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const content: PlatformContent[] = selectedPlatforms.map((key) => ({
        platform: key,
        content: data.content?.[key] || '',
        title: data.titles?.[key] || postTitle || '',
        charLimit: CHAR_LIMITS[key] || 5000,
      }))
      setGeneratedContent(content)
    } catch (err) {
      console.error('Generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [topic, tone, selectedPlatforms, selectedHashtags, postTitle])

  // ── Post to platforms ────────────────────────────────────
  const handlePost = useCallback(async (platformKeys?: string[]) => {
    const targets = platformKeys || selectedPlatforms
    if (!generatedContent.length) return
    setIsPosting(true)
    setPostResults([])

    try {
      const contentMap: Record<string, string> = {}
      const titleMap: Record<string, string> = {}
      generatedContent.forEach((c) => {
        contentMap[c.platform] = c.content
        if (c.title) titleMap[c.platform] = c.title
      })

      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentMap,
          platforms: targets,
          campaign: campaign || undefined,
          hashtags: selectedHashtags,
          titles: titleMap,
        }),
      })
      const data = await res.json()
      setPostResults(data.results || [])
    } catch (err) {
      console.error('Post error:', err)
    } finally {
      setIsPosting(false)
    }
  }, [generatedContent, selectedPlatforms, campaign, selectedHashtags])

  const updateGeneratedContent = (index: number, newContent: string) => {
    setGeneratedContent((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], content: newContent }
      return updated
    })
  }

  const statusColor = (s: string) => {
    if (s === 'posted') return 'var(--jp-green)'
    if (s === 'failed') return 'var(--jp-red)'
    return 'var(--jp-amber)'
  }

  const statusBg = (s: string) => {
    if (s === 'posted') return 'var(--jp-green-glow)'
    if (s === 'failed') return 'rgba(248, 113, 113, 0.12)'
    return 'rgba(251, 191, 36, 0.12)'
  }

  const platformName = (key: string) => PLATFORMS.find((p) => p.key === key)?.platform || key
  const platformIcon = (key: string) => PLATFORMS.find((p) => p.key === key)?.icon || key[0].toUpperCase()
  const platformColor = (key: string) => PLATFORMS.find((p) => p.key === key)?.color || '#666'

  return (
    <div>
      <div className="jp-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="jp-page-title">Social</h1>
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 10,
            background: 'rgba(0, 212, 255, 0.12)',
            color: 'var(--jp-cyan)',
          }}>social0n</span>
        </div>
        <p className="jp-page-subtitle">AI-powered social publishing, scheduling, and analytics</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 24,
        background: 'var(--jp-bg-card)',
        padding: 4,
        borderRadius: 'var(--jp-radius-sm)',
        boxShadow: 'var(--jp-shadow)',
        width: 'fit-content',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 22px',
              background: activeTab === tab.key ? 'var(--jp-green)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--jp-radius-xs)',
              color: activeTab === tab.key ? '#000' : 'var(--jp-text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: activeTab === tab.key ? 700 : 500,
              cursor: 'pointer',
              transition: 'all var(--jp-transition)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ COMPOSE TAB ═══════════════ */}
      {activeTab === 'compose' && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Left: Compose form */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="jp-card">
              <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Topic input */}
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 8, display: 'block' }}>
                    What do you want to post about?
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Describe your topic and the AI will generate optimized posts for each platform..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: 14,
                      background: 'var(--jp-bg-input)',
                      border: '1px solid var(--jp-border)',
                      borderRadius: 'var(--jp-radius-sm)',
                      color: 'var(--jp-text)',
                      fontSize: '0.875rem',
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit',
                      lineHeight: 1.6,
                    }}
                  />
                </div>

                {/* Title (for Reddit, Dev.to, HN) */}
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 8, display: 'block' }}>
                    Post Title <span style={{ fontWeight: 400, color: 'var(--jp-text-muted)' }}>(for Reddit, Dev.to, Hacker News)</span>
                  </label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Auto-generated if left blank"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--jp-bg-input)',
                      border: '1px solid var(--jp-border)',
                      borderRadius: 'var(--jp-radius-sm)',
                      color: 'var(--jp-text)',
                      fontSize: '0.875rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Campaign */}
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 8, display: 'block' }}>
                    Campaign <span style={{ fontWeight: 400, color: 'var(--jp-text-muted)' }}>(optional tracking)</span>
                  </label>
                  <input
                    type="text"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    placeholder="e.g., v2.5-launch, weekly-tips"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--jp-bg-input)',
                      border: '1px solid var(--jp-border)',
                      borderRadius: 'var(--jp-radius-sm)',
                      color: 'var(--jp-text)',
                      fontSize: '0.875rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Platforms */}
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 8, display: 'block' }}>
                    Platforms
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {PLATFORMS.map((p) => {
                      const isSelected = selectedPlatforms.includes(p.key)
                      const isDisabled = !!p.comingSoon
                      return (
                        <button
                          key={p.key}
                          onClick={() => !isDisabled && togglePlatform(p.key)}
                          style={{
                            padding: '7px 14px',
                            background: isSelected ? 'var(--jp-green-glow)' : 'var(--jp-bg-input)',
                            border: `1px solid ${isSelected ? 'var(--jp-green-dim)' : 'var(--jp-border)'}`,
                            borderRadius: 'var(--jp-radius-sm)',
                            color: isDisabled ? 'var(--jp-text-muted)' : isSelected ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            cursor: isDisabled ? 'default' : 'pointer',
                            opacity: isDisabled ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all var(--jp-transition)',
                          }}
                        >
                          <span style={{
                            fontWeight: 700,
                            fontSize: '0.6875rem',
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            background: isSelected ? p.color : 'transparent',
                            color: isSelected ? '#fff' : 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {p.icon}
                          </span>
                          {p.platform}
                          {isDisabled && <span style={{ fontSize: '0.625rem', color: 'var(--jp-text-muted)' }}>(soon)</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tone */}
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 8, display: 'block' }}>
                    Tone
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([
                      { key: 'professional' as Tone, label: 'Professional', desc: 'Clear, authoritative' },
                      { key: 'casual' as Tone, label: 'Casual', desc: 'Friendly, conversational' },
                      { key: 'thought-leader' as Tone, label: 'Thought Leader', desc: 'Insightful, visionary' },
                    ]).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTone(t.key)}
                        style={{
                          padding: '10px 18px',
                          background: tone === t.key ? 'var(--jp-green-glow)' : 'var(--jp-bg-input)',
                          border: `1px solid ${tone === t.key ? 'var(--jp-green-dim)' : 'var(--jp-border)'}`,
                          borderRadius: 'var(--jp-radius-sm)',
                          color: tone === t.key ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all var(--jp-transition)',
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{t.label}</div>
                        <div style={{ fontSize: '0.6875rem', opacity: 0.7, marginTop: 2 }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hashtags */}
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 8, display: 'block' }}>
                    Hashtags
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {HASHTAG_SUGGESTIONS.map((tag) => {
                      const isSelected = selectedHashtags.includes(tag)
                      return (
                        <span
                          key={tag}
                          onClick={() => toggleHashtag(tag)}
                          style={{
                            padding: '4px 10px',
                            background: isSelected ? 'rgba(167, 139, 250, 0.25)' : 'rgba(167, 139, 250, 0.12)',
                            color: 'var(--jp-purple)',
                            borderRadius: 'var(--jp-radius-xs)',
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            border: isSelected ? '1px solid var(--jp-purple)' : '1px solid transparent',
                            transition: 'all var(--jp-transition)',
                          }}
                        >
                          {tag}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Image upload placeholder */}
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 8, display: 'block' }}>
                    Image <span style={{ fontWeight: 400, color: 'var(--jp-text-muted)' }}>(coming soon)</span>
                  </label>
                  <div style={{
                    padding: 24,
                    border: '2px dashed var(--jp-border)',
                    borderRadius: 'var(--jp-radius-sm)',
                    textAlign: 'center',
                    color: 'var(--jp-text-muted)',
                    fontSize: '0.8125rem',
                    opacity: 0.6,
                  }}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 8px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <div>Drag and drop an image or click to upload</div>
                  </div>
                </div>

                {/* Generate button */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim() || selectedPlatforms.length === 0}
                    style={{
                      padding: '12px 28px',
                      background: isGenerating ? 'var(--jp-border)' : 'linear-gradient(135deg, var(--jp-cyan-dim), var(--jp-cyan))',
                      color: isGenerating ? 'var(--jp-text-muted)' : '#000',
                      border: 'none',
                      borderRadius: 'var(--jp-radius-sm)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: isGenerating ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all var(--jp-transition)',
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <span style={{
                          width: 14, height: 14,
                          border: '2px solid var(--jp-text-muted)',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        Generate with AI
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Generated content previews */}
            {generatedContent.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--jp-text)' }}>Generated Posts</h3>
                  <button
                    onClick={() => handlePost()}
                    disabled={isPosting}
                    style={{
                      padding: '10px 24px',
                      background: isPosting ? 'var(--jp-border)' : 'var(--jp-green)',
                      color: isPosting ? 'var(--jp-text-muted)' : '#000',
                      border: 'none',
                      borderRadius: 'var(--jp-radius-sm)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: isPosting ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {isPosting ? 'Posting...' : 'Post to All'}
                  </button>
                </div>

                {generatedContent.map((item, idx) => {
                  const result = postResults.find((r) => r.platform === item.platform)
                  return (
                    <div key={item.platform} className="jp-card">
                      <div className="jp-card-header" style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32,
                            borderRadius: 'var(--jp-radius-xs)',
                            background: platformColor(item.platform),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6875rem', fontWeight: 700, color: '#fff',
                          }}>
                            {platformIcon(item.platform)}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)' }}>
                              {platformName(item.platform)}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>
                              {item.content.length} / {item.charLimit.toLocaleString()} characters
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {result && (
                            <span style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '3px 10px',
                              borderRadius: 6,
                              background: result.success ? 'var(--jp-green-glow)' : 'rgba(248, 113, 113, 0.12)',
                              color: result.success ? 'var(--jp-green)' : 'var(--jp-red)',
                            }}>
                              {result.success ? 'Posted' : result.message}
                            </span>
                          )}
                          <button
                            onClick={() => handlePost([item.platform])}
                            disabled={isPosting}
                            style={{
                              padding: '6px 14px',
                              background: 'var(--jp-green)',
                              color: '#000',
                              border: 'none',
                              borderRadius: 'var(--jp-radius-xs)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: isPosting ? 'default' : 'pointer',
                            }}
                          >
                            Post
                          </button>
                        </div>
                      </div>
                      <div className="jp-card-body" style={{ padding: '14px 20px' }}>
                        {item.title && (
                          <div style={{
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: 'var(--jp-text)',
                            marginBottom: 8,
                          }}>
                            {item.title}
                          </div>
                        )}
                        <textarea
                          value={item.content}
                          onChange={(e) => updateGeneratedContent(idx, e.target.value)}
                          rows={Math.min(8, Math.max(3, Math.ceil(item.content.length / 80)))}
                          style={{
                            width: '100%',
                            padding: 12,
                            background: 'var(--jp-bg-input)',
                            border: '1px solid var(--jp-border)',
                            borderRadius: 'var(--jp-radius-xs)',
                            color: 'var(--jp-text)',
                            fontSize: '0.8125rem',
                            resize: 'vertical',
                            outline: 'none',
                            fontFamily: 'inherit',
                            lineHeight: 1.6,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Preview sidebar */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <div className="jp-card" style={{ position: 'sticky', top: 88 }}>
              <div className="jp-card-header">
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>Preview</h4>
              </div>
              <div className="jp-card-body">
                <div style={{
                  padding: 16,
                  background: 'var(--jp-bg)',
                  borderRadius: 'var(--jp-radius-sm)',
                  border: '1px solid var(--jp-border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 32, height: 32,
                      borderRadius: '50%',
                      background: 'var(--jp-green)',
                      color: '#000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6875rem', fontWeight: 700,
                    }}>
                      MM
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>Mike @ RocketOpp</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>Just now</div>
                    </div>
                  </div>
                  <p style={{
                    fontSize: '0.8125rem',
                    color: topic ? 'var(--jp-text-secondary)' : 'var(--jp-text-muted)',
                    lineHeight: 1.6,
                    margin: 0,
                    minHeight: 60,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {generatedContent.length > 0
                      ? generatedContent[0].content.slice(0, 200) + (generatedContent[0].content.length > 200 ? '...' : '')
                      : topic || 'Your post preview will appear here...'}
                  </p>
                  {selectedPlatforms.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                      {selectedPlatforms.map((key) => (
                        <span key={key} style={{
                          fontSize: '0.6875rem',
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: 'var(--jp-border)',
                          color: 'var(--jp-text-secondary)',
                        }}>
                          {platformName(key)}
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedHashtags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                      {selectedHashtags.map((tag) => (
                        <span key={tag} style={{
                          fontSize: '0.625rem',
                          color: 'var(--jp-purple)',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick stats */}
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--jp-text-muted)' }}>Platforms</span>
                    <span style={{ color: 'var(--jp-text)', fontWeight: 600 }}>{selectedPlatforms.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--jp-text-muted)' }}>Hashtags</span>
                    <span style={{ color: 'var(--jp-text)', fontWeight: 600 }}>{selectedHashtags.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--jp-text-muted)' }}>Campaign</span>
                    <span style={{ color: 'var(--jp-text)', fontWeight: 600 }}>{campaign || 'none'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--jp-text-muted)' }}>Tone</span>
                    <span style={{ color: 'var(--jp-text)', fontWeight: 600, textTransform: 'capitalize' }}>{tone.replace('-', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ SCHEDULED TAB ═══════════════ */}
      {activeTab === 'scheduled' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--jp-bg-card)', padding: 3, borderRadius: 'var(--jp-radius-xs)' }}>
              <button
                onClick={() => setScheduleView('list')}
                style={{
                  padding: '6px 14px',
                  background: scheduleView === 'list' ? 'var(--jp-green-glow)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--jp-radius-xs)',
                  color: scheduleView === 'list' ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                List
              </button>
              <button
                onClick={() => setScheduleView('calendar')}
                style={{
                  padding: '6px 14px',
                  background: scheduleView === 'calendar' ? 'var(--jp-green-glow)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--jp-radius-xs)',
                  color: scheduleView === 'calendar' ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Calendar
              </button>
            </div>
            <button style={{
              padding: '8px 18px',
              background: 'var(--jp-green)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--jp-radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              + New Scheduled Post
            </button>
          </div>

          {scheduleView === 'list' ? (
            <div className="jp-card">
              <div className="jp-card-header">
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>Scheduled Posts</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>{scheduledPosts.length} total</span>
              </div>
              <div>
                {scheduledPosts.map((post) => (
                  <div
                    key={post.id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--jp-border)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--jp-text)',
                        lineHeight: 1.5,
                        margin: '0 0 8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {post.content}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {post.platforms.map((p) => (
                          <span key={p} style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'var(--jp-border)',
                            color: 'var(--jp-text-secondary)',
                          }}>
                            {p}
                          </span>
                        ))}
                        <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>
                          {post.date} at {post.time}
                        </span>
                        {post.campaign && (
                          <span style={{
                            fontSize: '0.625rem',
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(0, 212, 255, 0.12)',
                            color: 'var(--jp-cyan)',
                            fontWeight: 600,
                          }}>
                            {post.campaign}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: 6,
                        background: statusBg(post.status),
                        color: statusColor(post.status),
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                      }}>
                        {post.status}
                      </span>
                      {post.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button style={{
                            padding: '4px 8px',
                            background: 'none',
                            border: '1px solid var(--jp-border)',
                            borderRadius: 'var(--jp-radius-xs)',
                            color: 'var(--jp-text-secondary)',
                            fontSize: '0.6875rem',
                            cursor: 'pointer',
                          }}>
                            Edit
                          </button>
                          <button style={{
                            padding: '4px 8px',
                            background: 'none',
                            border: '1px solid var(--jp-border)',
                            borderRadius: 'var(--jp-radius-xs)',
                            color: 'var(--jp-red)',
                            fontSize: '0.6875rem',
                            cursor: 'pointer',
                          }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Calendar View */
            <div className="jp-card">
              <div className="jp-card-header">
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>March 2026</h4>
              </div>
              <div className="jp-card-body">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 2,
                }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} style={{
                      padding: '8px 4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--jp-text-muted)',
                      textAlign: 'center',
                    }}>
                      {d}
                    </div>
                  ))}
                  {/* March 2026 starts on Sunday */}
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1
                    const dateStr = `2026-03-${String(day).padStart(2, '0')}`
                    const postsOnDay = scheduledPosts.filter((p) => p.date === dateStr)
                    return (
                      <div key={day} style={{
                        padding: 8,
                        minHeight: 60,
                        background: postsOnDay.length > 0 ? 'var(--jp-green-glow)' : 'var(--jp-bg)',
                        borderRadius: 'var(--jp-radius-xs)',
                        border: '1px solid var(--jp-border)',
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 4 }}>
                          {day}
                        </div>
                        {postsOnDay.map((p) => (
                          <div key={p.id} style={{
                            fontSize: '0.5625rem',
                            padding: '1px 4px',
                            borderRadius: 3,
                            background: statusBg(p.status),
                            color: statusColor(p.status),
                            marginBottom: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {p.time} - {p.platforms.join(', ')}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ ANALYTICS TAB ═══════════════ */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stat cards */}
          <div className="jp-stat-grid">
            {[
              { label: 'Posts This Month', value: '24', change: '+8', accent: 'green', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
              { label: 'Total Reach', value: '12.4K', change: '+22%', accent: 'cyan', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
              { label: 'Engagement Rate', value: '4.7%', change: '+0.3%', accent: 'purple', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
              { label: 'Click-throughs', value: '608', change: '+15%', accent: 'amber', icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122' },
            ].map((stat) => (
              <div key={stat.label} className={`jp-stat-card ${stat.accent}`}>
                <div className="jp-stat-header">
                  <span className="jp-stat-label">{stat.label}</span>
                  <div className={`jp-stat-icon ${stat.accent}`}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                    </svg>
                  </div>
                </div>
                <div className="jp-stat-value">{stat.value}</div>
                <span className="jp-stat-change up">{stat.change}</span>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="jp-card">
            <div className="jp-card-header">
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>
                Engagement — Last 30 Days
              </h4>
            </div>
            <div className="jp-card-body">
              <div className="jp-chart-area" style={{ height: 180 }}>
                {CHART_BARS.map((val, i) => (
                  <div
                    key={i}
                    className="jp-chart-bar"
                    style={{ height: `${(val / 100) * 100}%` }}
                    title={`Day ${i + 1}: ${val} engagements`}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>Mar 1</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>Mar 15</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>Mar 30</span>
              </div>
            </div>
          </div>

          {/* Per-platform breakdown */}
          <div className="jp-card">
            <div className="jp-card-header">
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>
                Platform Breakdown
              </h4>
            </div>
            <div>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                padding: '12px 20px',
                borderBottom: '1px solid var(--jp-border)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'var(--jp-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                <div>Platform</div>
                <div>Posts</div>
                <div>Reach</div>
                <div>Engagement</div>
                <div>Clicks</div>
              </div>
              {ANALYTICS_PLATFORMS.map((p) => (
                <div
                  key={p.platform}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--jp-border)',
                    alignItems: 'center',
                    transition: 'background var(--jp-transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 8, height: 8,
                      borderRadius: '50%',
                      background: p.color,
                    }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)' }}>{p.platform}</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--jp-text-secondary)' }}>{p.posts}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--jp-text-secondary)' }}>{p.reach}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--jp-green)', fontWeight: 600 }}>{p.engagement}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--jp-text-secondary)' }}>{p.clicks}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top performing posts */}
          <div className="jp-card">
            <div className="jp-card-header">
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>
                Top Performing Posts
              </h4>
            </div>
            <div>
              {TOP_POSTS.map((post, i) => (
                <div
                  key={i}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--jp-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    background: 'var(--jp-green-glow)',
                    color: 'var(--jp-green)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.8125rem',
                      color: 'var(--jp-text)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {post.content}
                    </p>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>{post.platform}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--jp-text)' }}>{post.reach}</div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--jp-text-muted)' }}>reach</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--jp-green)' }}>{post.engagement}</div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--jp-text-muted)' }}>engagement</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ ACCOUNTS TAB ═══════════════ */}
      {activeTab === 'accounts' && (
        <div className="jp-card">
          <div className="jp-card-header">
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>Connected Accounts</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>
              {PLATFORMS.filter((p) => p.connected).length} / {PLATFORMS.length} connected
            </span>
          </div>
          <div>
            {PLATFORMS.map((account) => (
              <div
                key={account.key}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--jp-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--jp-radius-sm)',
                  background: account.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  {account.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--jp-text)' }}>
                      {account.platform}
                    </span>
                    {account.comingSoon && (
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(251, 191, 36, 0.12)',
                        color: 'var(--jp-amber)',
                      }}>
                        Coming Soon
                      </span>
                    )}
                  </div>
                  {account.handle && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)', marginTop: 2 }}>{account.handle}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {account.connected && (
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 6,
                      background: 'var(--jp-green-glow)',
                      color: 'var(--jp-green)',
                    }}>
                      Connected
                    </span>
                  )}
                  <button
                    style={{
                      padding: '7px 16px',
                      background: account.connected ? 'transparent' : account.comingSoon ? 'var(--jp-border)' : 'var(--jp-green)',
                      color: account.connected ? 'var(--jp-red)' : account.comingSoon ? 'var(--jp-text-muted)' : '#000',
                      border: account.connected ? '1px solid var(--jp-border)' : 'none',
                      borderRadius: 'var(--jp-radius-sm)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: account.comingSoon ? 'default' : 'pointer',
                      opacity: account.comingSoon ? 0.5 : 1,
                    }}
                    disabled={account.comingSoon}
                  >
                    {account.connected ? 'Disconnect' : account.comingSoon ? 'Unavailable' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
