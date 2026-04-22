'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLocation } from '@/lib/location-context'

type Tab = 'compose' | 'bulk' | 'scheduled' | 'analytics' | 'accounts'
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

// ── Platform definitions — CRM OAuth platforms + direct integrations ──
const CRM_PLATFORMS: SocialAccount[] = [
  { platform: 'Google Business', key: 'google', connected: false, color: '#4285F4', icon: 'G' },
  { platform: 'Facebook', key: 'facebook', connected: false, color: '#1877F2', icon: 'f' },
  { platform: 'Instagram', key: 'instagram', connected: false, color: '#E4405F', icon: 'ig' },
  { platform: 'LinkedIn', key: 'linkedin', connected: false, color: '#0A66C2', icon: 'in' },
  { platform: 'X / Twitter', key: 'twitter', connected: false, color: '#000000', icon: 'X' },
  { platform: 'TikTok', key: 'tiktok', connected: false, color: '#000000', icon: 'TT' },
  { platform: 'TikTok Business', key: 'tiktok_business', connected: false, color: '#00F2EA', icon: 'TB' },
]

const DIRECT_PLATFORMS: SocialAccount[] = [
  { platform: 'Reddit', key: 'reddit', connected: false, color: '#FF4500', icon: 'r/' },
  { platform: 'Dev.to', key: 'devto', connected: false, color: '#0a0a0a', icon: '</>' },
  { platform: 'GitHub Discussions', key: 'github', connected: false, color: '#24292e', icon: 'GH' },
  { platform: 'Hacker News', key: 'hackernews', connected: false, comingSoon: true, color: '#FF6600', icon: 'Y' },
]

const PLATFORMS: SocialAccount[] = [...CRM_PLATFORMS, ...DIRECT_PLATFORMS]

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
  const supabase = createClient()
  const [connectedAccounts, setConnectedAccounts] = useState<Record<string, boolean>>({})
  const [connecting, setConnecting] = useState<string | null>(null)
  const { locationId, refreshKey } = useLocation()

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/social/accounts', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) {
        const data = await res.json()
        const connected: Record<string, boolean> = {}
        for (const acc of (data.accounts || [])) {
          const platform = acc.type || acc.platform || acc.provider || ''
          connected[platform.toLowerCase()] = true
        }
        setConnectedAccounts(connected)
      }
    })()
  }, [supabase, refreshKey])

  const [connectError, setConnectError] = useState('')

  async function connectPlatform(key: string) {
    setConnecting(key)
    setConnectError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setConnecting(null); setConnectError('Please log in'); return }
    try {
      const res = await fetch('/api/social/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ platform: key }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.open(data.url, '_blank', 'width=600,height=700')
      } else {
        setConnectError(data.error || `Failed to connect ${key}`)
      }
    } catch (err) {
      setConnectError('Connection failed — check your network')
    }
    setConnecting(null)
  }

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

  // Bulk state
  const [bulkTopics, setBulkTopics] = useState('')
  const [bulkTone, setBulkTone] = useState<string>('professional')
  const [bulkPerTopic, setBulkPerTopic] = useState(5)
  const [bulkInterval, setBulkInterval] = useState(8)
  const [bulkStartDate, setBulkStartDate] = useState('')
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkPosts, setBulkPosts] = useState<{ topic: string; content: string; angle: string; scheduleDate: string }[]>([])
  const [bulkCsv, setBulkCsv] = useState('')
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number; total: number } | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)

  const handleBulkGenerate = useCallback(async () => {
    const topics = bulkTopics.split('\n').map(t => t.trim()).filter(Boolean)
    if (!topics.length) return
    setBulkGenerating(true)
    setBulkPosts([])
    setBulkCsv('')
    setBulkResult(null)

    try {
      const res = await fetch('/api/social/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics,
          tone: bulkTone,
          postsPerTopic: bulkPerTopic,
          startDate: bulkStartDate || undefined,
          intervalHours: bulkInterval,
          hashtags: selectedHashtags,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setBulkPosts(data.posts || [])
      setBulkCsv(data.csv || '')
    } catch (err) {
      console.error('Bulk generation error:', err)
    } finally {
      setBulkGenerating(false)
    }
  }, [bulkTopics, bulkTone, bulkPerTopic, bulkInterval, bulkStartDate, selectedHashtags])

  const handleBulkUpload = useCallback(async () => {
    setBulkUploading(true)
    setBulkResult(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBulkUploading(false); return }

    try {
      if (csvFile) {
        // Upload CSV file
        const formData = new FormData()
        formData.append('file', csvFile)
        const res = await fetch('/api/social/csv', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        setBulkResult({ success: data.imported || 0, failed: data.failed || 0, total: (data.imported || 0) + (data.failed || 0) })
      } else if (bulkPosts.length > 0) {
        // Upload generated posts as JSON
        const res = await fetch('/api/social/csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posts: bulkPosts.map(p => ({ content: p.content, scheduleDate: p.scheduleDate })) }),
        })
        const data = await res.json()
        setBulkResult({ success: data.success || 0, failed: data.failed || 0, total: data.total || 0 })
      }
    } catch (err) {
      console.error('Bulk upload error:', err)
    } finally {
      setBulkUploading(false)
    }
  }, [csvFile, bulkPosts, supabase])

  const downloadCsv = useCallback(() => {
    if (!bulkCsv) return
    const blob = new Blob([bulkCsv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `social-posts-bulk-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [bulkCsv])

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'compose', label: 'Compose', icon: 'M' },
    { key: 'bulk', label: 'Bulk', icon: 'B' },
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

  const statusColorClass = (s: string) => {
    if (s === 'posted') return 'text-core-green'
    if (s === 'failed') return 'text-core-red'
    return 'text-core-amber'
  }

  const statusBgClass = (s: string) => {
    if (s === 'posted') return 'bg-core-green/10'
    if (s === 'failed') return 'bg-core-red/10'
    return 'bg-core-amber/10'
  }

  const platformName = (key: string) => PLATFORMS.find((p) => p.key === key)?.platform || key
  const platformIcon = (key: string) => PLATFORMS.find((p) => p.key === key)?.icon || key[0].toUpperCase()
  const platformColor = (key: string) => PLATFORMS.find((p) => p.key === key)?.color || '#666'

  return (
    <div className="animate-fade-in">
      <div className="jp-page-header">
        <div className="flex items-center gap-2.5">
          <h1 className="jp-page-title">Social</h1>
          <span className="text-[0.6875rem] font-bold px-2 py-0.5 rounded-full bg-core-cyan/10 text-core-cyan">social0n</span>
        </div>
        <p className="jp-page-subtitle">AI-powered social publishing, scheduling, and analytics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 bg-core-card p-1 rounded shadow w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded text-[0.8125rem] font-medium transition-all border-none cursor-pointer ${
              activeTab === tab.key
                ? 'bg-core-green text-black font-bold'
                : 'bg-transparent text-core-text-dim'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ COMPOSE TAB ═══════════════ */}
      {activeTab === 'compose' && (
        <div className="flex gap-5 items-start">
          {/* Left: Compose form */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="jp-card">
              <div className="jp-card-body flex flex-col gap-4">
                {/* Topic input */}
                <div>
                  <label className="text-[0.8125rem] font-semibold text-core-text mb-2 block">
                    What do you want to post about?
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Describe your topic and the AI will generate optimized posts for each platform..."
                    rows={4}
                    className="w-full p-3.5 bg-core-surface border border-core-border rounded text-core-text text-sm resize-y outline-none font-inherit leading-relaxed"
                  />
                </div>

                {/* Title (for Reddit, Dev.to, HN) */}
                <div>
                  <label className="text-[0.8125rem] font-semibold text-core-text mb-2 block">
                    Post Title <span className="font-normal text-core-text-muted">(for Reddit, Dev.to, Hacker News)</span>
                  </label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Auto-generated if left blank"
                    className="w-full px-3.5 py-2.5 bg-core-surface border border-core-border rounded text-core-text text-sm outline-none font-inherit"
                  />
                </div>

                {/* Campaign */}
                <div>
                  <label className="text-[0.8125rem] font-semibold text-core-text mb-2 block">
                    Campaign <span className="font-normal text-core-text-muted">(optional tracking)</span>
                  </label>
                  <input
                    type="text"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    placeholder="e.g., v2.5-launch, weekly-tips"
                    className="w-full px-3.5 py-2.5 bg-core-surface border border-core-border rounded text-core-text text-sm outline-none font-inherit"
                  />
                </div>

                {/* Platforms */}
                <div>
                  <label className="text-[0.8125rem] font-semibold text-core-text mb-2 block">
                    Platforms
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {PLATFORMS.map((p) => {
                      const isSelected = selectedPlatforms.includes(p.key)
                      const isDisabled = !!p.comingSoon
                      return (
                        <button
                          key={p.key}
                          onClick={() => !isDisabled && togglePlatform(p.key)}
                          className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded text-[0.8125rem] font-medium transition-all border ${
                            isSelected
                              ? 'bg-core-green/10 border-core-green-dim text-core-green'
                              : 'bg-core-surface border-core-border text-core-text-dim'
                          } ${isDisabled ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                        >
                          <span
                            className="text-[0.6875rem] font-bold w-5 h-5 rounded flex items-center justify-center"
                            style={{
                              background: isSelected ? p.color : 'transparent',
                              color: isSelected ? '#fff' : 'inherit',
                            }}
                          >
                            {p.icon}
                          </span>
                          {p.platform}
                          {isDisabled && <span className="text-[0.625rem] text-core-text-muted">(soon)</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tone */}
                <div>
                  <label className="text-[0.8125rem] font-semibold text-core-text mb-2 block">
                    Tone
                  </label>
                  <div className="flex gap-2">
                    {([
                      { key: 'professional' as Tone, label: 'Professional', desc: 'Clear, authoritative' },
                      { key: 'casual' as Tone, label: 'Casual', desc: 'Friendly, conversational' },
                      { key: 'thought-leader' as Tone, label: 'Thought Leader', desc: 'Insightful, visionary' },
                    ]).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTone(t.key)}
                        className={`px-4 py-2.5 rounded text-[0.8125rem] font-medium cursor-pointer text-left transition-all border ${
                          tone === t.key
                            ? 'bg-core-green/10 border-core-green-dim text-core-green'
                            : 'bg-core-surface border-core-border text-core-text-dim'
                        }`}
                      >
                        <div className="font-semibold">{t.label}</div>
                        <div className="text-[0.6875rem] opacity-70 mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hashtags */}
                <div>
                  <label className="text-[0.8125rem] font-semibold text-core-text mb-2 block">
                    Hashtags
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {HASHTAG_SUGGESTIONS.map((tag) => {
                      const isSelected = selectedHashtags.includes(tag)
                      return (
                        <span
                          key={tag}
                          onClick={() => toggleHashtag(tag)}
                          className={`px-2.5 py-1 rounded text-xs text-core-purple cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-core-purple/25 border-core-purple font-bold'
                              : 'bg-core-purple/10 border-transparent font-medium'
                          }`}
                        >
                          {tag}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Image upload placeholder */}
                <div>
                  <label className="text-[0.8125rem] font-semibold text-core-text mb-2 block">
                    Image <span className="font-normal text-core-text-muted">(coming soon)</span>
                  </label>
                  <div className="p-6 border-2 border-dashed border-core-border rounded text-center text-core-text-muted text-[0.8125rem] opacity-60">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} className="mx-auto mb-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <div>Drag and drop an image or click to upload</div>
                  </div>
                </div>

                {/* Generate button */}
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim() || selectedPlatforms.length === 0}
                    className={`flex items-center gap-2 px-7 py-3 rounded text-sm font-bold transition-all border-none ${
                      isGenerating
                        ? 'bg-core-border text-core-text-muted cursor-default'
                        : 'bg-gradient-to-br from-core-cyan/80 to-core-cyan text-black cursor-pointer'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-core-text-muted border-t-transparent rounded-full animate-spin" />
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
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-core-text">Generated Posts</h3>
                  <button
                    onClick={() => handlePost()}
                    disabled={isPosting}
                    className={`flex items-center gap-1.5 px-6 py-2.5 rounded text-[0.8125rem] font-bold border-none ${
                      isPosting
                        ? 'bg-core-border text-core-text-muted cursor-default'
                        : 'bg-core-green text-black cursor-pointer'
                    }`}
                  >
                    {isPosting ? 'Posting...' : 'Post to All'}
                  </button>
                </div>

                {generatedContent.map((item, idx) => {
                  const result = postResults.find((r) => r.platform === item.platform)
                  return (
                    <div key={item.platform} className="jp-card">
                      <div className="jp-card-header px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center text-[0.6875rem] font-bold text-white flex-shrink-0"
                            style={{ background: platformColor(item.platform) }}
                          >
                            {platformIcon(item.platform)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-core-text">
                              {platformName(item.platform)}
                            </div>
                            <div className="text-[0.6875rem] text-core-text-muted">
                              {item.content.length} / {item.charLimit.toLocaleString()} characters
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {result && (
                            <span className={`text-[0.6875rem] font-semibold px-2.5 py-[3px] rounded-md ${
                              result.success
                                ? 'bg-core-green/10 text-core-green'
                                : 'bg-core-red/10 text-core-red'
                            }`}>
                              {result.success ? 'Posted' : result.message}
                            </span>
                          )}
                          <button
                            onClick={() => handlePost([item.platform])}
                            disabled={isPosting}
                            className={`px-3.5 py-1.5 bg-core-green text-black rounded text-xs font-semibold border-none ${
                              isPosting ? 'cursor-default' : 'cursor-pointer'
                            }`}
                          >
                            Post
                          </button>
                        </div>
                      </div>
                      <div className="jp-card-body px-5 py-3.5">
                        {item.title && (
                          <div className="text-[0.8125rem] font-bold text-core-text mb-2">
                            {item.title}
                          </div>
                        )}
                        <textarea
                          value={item.content}
                          onChange={(e) => updateGeneratedContent(idx, e.target.value)}
                          rows={Math.min(8, Math.max(3, Math.ceil(item.content.length / 80)))}
                          className="w-full p-3 bg-core-surface border border-core-border rounded text-core-text text-[0.8125rem] resize-y outline-none font-inherit leading-relaxed"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Preview sidebar */}
          <div className="w-[300px] flex-shrink-0">
            <div className="jp-card sticky top-22">
              <div className="jp-card-header">
                <h4 className="text-[0.8125rem] font-semibold text-core-text m-0">Preview</h4>
              </div>
              <div className="jp-card-body">
                <div className="p-4 bg-core-bg rounded border border-core-border">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-full bg-core-green text-black flex items-center justify-center text-[0.6875rem] font-bold">
                      MM
                    </div>
                    <div>
                      <div className="text-[0.8125rem] font-semibold text-core-text">Mike @ RocketOpp</div>
                      <div className="text-[0.6875rem] text-core-text-muted">Just now</div>
                    </div>
                  </div>
                  <p className={`text-[0.8125rem] leading-relaxed m-0 min-h-[60px] whitespace-pre-wrap ${
                    topic ? 'text-core-text-dim' : 'text-core-text-muted'
                  }`}>
                    {generatedContent.length > 0
                      ? generatedContent[0].content.slice(0, 200) + (generatedContent[0].content.length > 200 ? '...' : '')
                      : topic || 'Your post preview will appear here...'}
                  </p>
                  {selectedPlatforms.length > 0 && (
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {selectedPlatforms.map((key) => (
                        <span key={key} className="text-[0.6875rem] px-2 py-0.5 rounded-md bg-core-border text-core-text-dim">
                          {platformName(key)}
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedHashtags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {selectedHashtags.map((tag) => (
                        <span key={tag} className="text-[0.625rem] text-core-purple">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick stats */}
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-core-text-muted">Platforms</span>
                    <span className="text-core-text font-semibold">{selectedPlatforms.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-core-text-muted">Hashtags</span>
                    <span className="text-core-text font-semibold">{selectedHashtags.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-core-text-muted">Campaign</span>
                    <span className="text-core-text font-semibold">{campaign || 'none'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-core-text-muted">Tone</span>
                    <span className="text-core-text font-semibold capitalize">{tone.replace('-', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ BULK TAB ═══════════════ */}
      {activeTab === 'bulk' && (
        <div className="flex gap-5 items-start">
          {/* Left: Config */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="jp-card">
              <div className="jp-card-header px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-[0.9375rem] font-bold text-core-text m-0">Bulk Post Generator</h4>
                  <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full bg-core-red/10 text-core-red">NEW</span>
                </div>
              </div>
              <div className="jp-card-body flex flex-col gap-4">
                {/* Topics */}
                <div>
                  <label className="text-[0.8125rem] font-semibold text-core-text mb-2 block">
                    Topics <span className="font-normal text-core-text-muted">(one per line)</span>
                  </label>
                  <textarea
                    value={bulkTopics}
                    onChange={e => setBulkTopics(e.target.value)}
                    placeholder={"AI orchestration and MCP servers\nWorkflow automation tips\nHow 0nMCP saves developer time\nAPI integration best practices\nThe future of no-code AI tools"}
                    rows={6}
                    className="w-full p-3.5 bg-core-surface border border-core-border rounded text-core-text text-sm resize-y outline-none font-inherit leading-loose"
                  />
                </div>

                {/* Config row */}
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-core-text-muted mb-1.5 block">Posts per topic</label>
                    <select
                      value={bulkPerTopic}
                      onChange={e => setBulkPerTopic(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-core-surface border border-core-border rounded text-core-text text-[0.8125rem] outline-none"
                    >
                      {[3, 5, 7, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-core-text-muted mb-1.5 block">Hours between posts</label>
                    <select
                      value={bulkInterval}
                      onChange={e => setBulkInterval(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-core-surface border border-core-border rounded text-core-text text-[0.8125rem] outline-none"
                    >
                      {[4, 6, 8, 12, 24, 48].map(n => <option key={n} value={n}>{n}h</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-core-text-muted mb-1.5 block">Tone</label>
                    <select
                      value={bulkTone}
                      onChange={e => setBulkTone(e.target.value)}
                      className="w-full px-2.5 py-2 bg-core-surface border border-core-border rounded text-core-text text-[0.8125rem] outline-none"
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="thought-leader">Thought Leader</option>
                      <option value="hype">Hype</option>
                      <option value="educational">Educational</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-core-text-muted mb-1.5 block">Start date</label>
                    <input
                      type="datetime-local"
                      value={bulkStartDate}
                      onChange={e => setBulkStartDate(e.target.value)}
                      className="w-full px-2.5 py-2 bg-core-surface border border-core-border rounded text-core-text text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Generate button */}
                <div className="flex gap-2 justify-between items-center pt-1">
                  <div className="text-xs text-core-text-muted">
                    {bulkTopics.split('\n').filter(t => t.trim()).length} topics × {bulkPerTopic} posts = <strong className="text-core-green">{bulkTopics.split('\n').filter(t => t.trim()).length * bulkPerTopic} posts</strong>
                  </div>
                  <button
                    onClick={handleBulkGenerate}
                    disabled={bulkGenerating || !bulkTopics.trim()}
                    className={`flex items-center gap-2 px-7 py-3 rounded text-sm font-bold border-none ${
                      bulkGenerating
                        ? 'bg-core-border text-core-text-muted cursor-default'
                        : 'bg-core-green text-black cursor-pointer'
                    }`}
                  >
                    {bulkGenerating ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-core-text-muted border-t-transparent rounded-full animate-spin" />
                        Generating {bulkTopics.split('\n').filter(t => t.trim()).length * bulkPerTopic} posts...
                      </>
                    ) : 'Generate Bulk Posts'}
                  </button>
                </div>
              </div>
            </div>

            {/* CSV Upload */}
            <div className="jp-card">
              <div className="jp-card-header px-5 py-3.5">
                <h4 className="text-sm font-bold text-core-text m-0">CSV Import</h4>
              </div>
              <div className="jp-card-body flex flex-col gap-3">
                <div
                  className="p-5 border-2 border-dashed border-core-border rounded text-center cursor-pointer transition-colors"
                  onClick={() => document.getElementById('csv-upload')?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--core-green, #6EE05A)' }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = '' }}
                  onDrop={e => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = ''
                    const file = e.dataTransfer.files[0]
                    if (file?.name.endsWith('.csv')) setCsvFile(file)
                  }}
                >
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) setCsvFile(e.target.files[0]) }}
                  />
                  {csvFile ? (
                    <div>
                      <div className="text-sm font-semibold text-core-green">{csvFile.name}</div>
                      <div className="text-xs text-core-text-muted mt-1">{(csvFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[0.8125rem] text-core-text-muted mb-1">Drop CSV file here or click to browse</div>
                      <div className="text-[0.6875rem] text-core-text-muted opacity-60">Columns: summary, scheduleDate, accountIds, mediaUrl, mediaType, followUpComment, status</div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <a
                    href="/api/social/csv?action=template"
                    download
                    className="flex items-center gap-1 px-4 py-2 rounded border border-core-border bg-transparent text-core-text-dim text-xs font-semibold no-underline"
                  >
                    Download Template
                  </a>
                  <a
                    href="/api/social/csv?action=export"
                    download
                    className="flex items-center gap-1 px-4 py-2 rounded border border-core-border bg-transparent text-core-text-dim text-xs font-semibold no-underline"
                  >
                    Export Existing
                  </a>
                  {csvFile && (
                    <button
                      onClick={handleBulkUpload}
                      disabled={bulkUploading}
                      className={`px-4 py-2 rounded bg-core-green border-none text-black text-xs font-bold ml-auto ${
                        bulkUploading ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      {bulkUploading ? 'Uploading...' : 'Upload CSV to CRM'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Generated posts preview */}
            {bulkPosts.length > 0 && (
              <div className="jp-card">
                <div className="jp-card-header px-5 py-3.5">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-core-text m-0">
                        Generated — {bulkPosts.length} Posts
                      </h4>
                      {bulkResult && (
                        <span className={`text-[0.6875rem] font-semibold px-2 py-0.5 rounded-md ${
                          bulkResult.failed === 0
                            ? 'bg-core-green/10 text-core-green'
                            : 'bg-core-red/10 text-core-red'
                        }`}>
                          {bulkResult.success}/{bulkResult.total} uploaded
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={downloadCsv}
                        className="px-3.5 py-1.5 rounded border border-core-border bg-transparent text-core-text-dim text-xs font-semibold cursor-pointer"
                      >
                        Download CSV
                      </button>
                      <button
                        onClick={handleBulkUpload}
                        disabled={bulkUploading}
                        className={`px-3.5 py-1.5 rounded bg-core-green border-none text-black text-xs font-bold ${
                          bulkUploading ? 'cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        {bulkUploading ? 'Uploading...' : 'Upload All to CRM'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-5 max-h-[500px] overflow-y-auto">
                  <div className="flex flex-col gap-1">
                    {bulkPosts.map((post, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 py-2.5 ${i < bulkPosts.length - 1 ? 'border-b border-core-border' : ''}`}
                      >
                        <div className="w-7 h-7 rounded-md flex-shrink-0 bg-core-surface flex items-center justify-center text-[0.6875rem] font-bold text-core-text-muted">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.8125rem] text-core-text leading-snug">
                            {post.content}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[0.625rem] text-core-text-muted">
                              {new Date(post.scheduleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[0.625rem] px-1.5 rounded bg-core-purple/10 text-core-purple">
                              {post.angle}
                            </span>
                            <span className="text-[0.625rem] px-1.5 rounded bg-core-surface text-core-text-muted">
                              {post.topic.slice(0, 30)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Stats sidebar */}
          <div className="w-[280px] flex-shrink-0">
            <div className="jp-card sticky top-22">
              <div className="jp-card-header">
                <h4 className="text-[0.8125rem] font-semibold text-core-text m-0">Bulk Stats</h4>
              </div>
              <div className="jp-card-body flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded bg-core-surface text-center">
                    <div className="text-xl font-bold text-core-green">
                      {bulkPosts.length}
                    </div>
                    <div className="text-[0.625rem] text-core-text-muted font-semibold">Generated</div>
                  </div>
                  <div className="p-3 rounded bg-core-surface text-center">
                    <div className="text-xl font-bold text-core-cyan">
                      {bulkResult?.success || 0}
                    </div>
                    <div className="text-[0.625rem] text-core-text-muted font-semibold">Uploaded</div>
                  </div>
                </div>

                {bulkPosts.length > 0 && (
                  <>
                    <div className="h-px bg-core-border" />
                    <div className="text-xs text-core-text-muted">
                      <div className="flex justify-between mb-1">
                        <span>First post</span>
                        <span className="text-core-text font-semibold">
                          {new Date(bulkPosts[0].scheduleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Last post</span>
                        <span className="text-core-text font-semibold">
                          {new Date(bulkPosts[bulkPosts.length - 1].scheduleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Interval</span>
                        <span className="text-core-text font-semibold">{bulkInterval}h</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="h-px bg-core-border" />
                <div className="text-[0.6875rem] text-core-text-muted leading-relaxed">
                  AI generates varied posts per topic — hooks, questions, hot takes, tips, stats. Posts are scheduled at your chosen interval across all connected accounts.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ SCHEDULED TAB ═══════════════ */}
      {activeTab === 'scheduled' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-1 bg-core-card p-[3px] rounded">
              <button
                onClick={() => setScheduleView('list')}
                className={`px-3.5 py-1.5 rounded border-none text-xs font-semibold cursor-pointer ${
                  scheduleView === 'list'
                    ? 'bg-core-green/10 text-core-green'
                    : 'bg-transparent text-core-text-dim'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setScheduleView('calendar')}
                className={`px-3.5 py-1.5 rounded border-none text-xs font-semibold cursor-pointer ${
                  scheduleView === 'calendar'
                    ? 'bg-core-green/10 text-core-green'
                    : 'bg-transparent text-core-text-dim'
                }`}
              >
                Calendar
              </button>
            </div>
            <button className="px-4 py-2 bg-core-green text-black border-none rounded text-[0.8125rem] font-semibold cursor-pointer">
              + New Scheduled Post
            </button>
          </div>

          {scheduleView === 'list' ? (
            <div className="jp-card">
              <div className="jp-card-header">
                <h4 className="text-sm font-semibold text-core-text m-0">Scheduled Posts</h4>
                <span className="text-xs text-core-text-muted">{scheduledPosts.length} total</span>
              </div>
              <div>
                {scheduledPosts.map((post) => (
                  <div
                    key={post.id}
                    className="px-5 py-4 border-b border-core-border flex items-start gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-core-text leading-snug m-0 mb-2 overflow-hidden text-ellipsis whitespace-nowrap">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.platforms.map((p) => (
                          <span key={p} className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-md bg-core-border text-core-text-dim">
                            {p}
                          </span>
                        ))}
                        <span className="text-xs text-core-text-muted">
                          {post.date} at {post.time}
                        </span>
                        {post.campaign && (
                          <span className="text-[0.625rem] px-1.5 py-0.5 rounded bg-core-cyan/10 text-core-cyan font-semibold">
                            {post.campaign}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[0.6875rem] font-semibold px-2.5 py-[3px] rounded-md capitalize whitespace-nowrap ${statusBgClass(post.status)} ${statusColorClass(post.status)}`}>
                        {post.status}
                      </span>
                      {post.status === 'pending' && (
                        <div className="flex gap-1">
                          <button className="px-2 py-1 bg-transparent border border-core-border rounded text-core-text-dim text-[0.6875rem] cursor-pointer">
                            Edit
                          </button>
                          <button className="px-2 py-1 bg-transparent border border-core-border rounded text-core-red text-[0.6875rem] cursor-pointer">
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
                <h4 className="text-sm font-semibold text-core-text m-0">March 2026</h4>
              </div>
              <div className="jp-card-body">
                <div className="grid grid-cols-7 gap-0.5">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-2 px-1 text-[0.6875rem] font-semibold text-core-text-muted text-center">
                      {d}
                    </div>
                  ))}
                  {/* March 2026 starts on Sunday */}
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1
                    const dateStr = `2026-03-${String(day).padStart(2, '0')}`
                    const postsOnDay = scheduledPosts.filter((p) => p.date === dateStr)
                    return (
                      <div
                        key={day}
                        className={`p-2 min-h-[60px] rounded border border-core-border ${
                          postsOnDay.length > 0 ? 'bg-core-green/10' : 'bg-core-bg'
                        }`}
                      >
                        <div className="text-xs font-semibold text-core-text mb-1">
                          {day}
                        </div>
                        {postsOnDay.map((p) => (
                          <div
                            key={p.id}
                            className={`text-[0.5625rem] px-1 py-[1px] rounded mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap ${statusBgClass(p.status)} ${statusColorClass(p.status)}`}
                          >
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
        <div className="flex flex-col gap-5">
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
              <h4 className="text-sm font-semibold text-core-text m-0">
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
              <div className="flex justify-between mt-2">
                <span className="text-[0.6875rem] text-core-text-muted">Mar 1</span>
                <span className="text-[0.6875rem] text-core-text-muted">Mar 15</span>
                <span className="text-[0.6875rem] text-core-text-muted">Mar 30</span>
              </div>
            </div>
          </div>

          {/* Per-platform breakdown */}
          <div className="jp-card">
            <div className="jp-card-header">
              <h4 className="text-sm font-semibold text-core-text m-0">
                Platform Breakdown
              </h4>
            </div>
            <div>
              {/* Table header */}
              <div className="grid px-5 py-3 border-b border-core-border text-[0.6875rem] font-semibold text-core-text-muted uppercase tracking-wide" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                <div>Platform</div>
                <div>Posts</div>
                <div>Reach</div>
                <div>Engagement</div>
                <div>Clicks</div>
              </div>
              {ANALYTICS_PLATFORMS.map((p) => (
                <div
                  key={p.platform}
                  className="grid px-5 py-3.5 border-b border-core-border items-center transition-colors"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: p.color }}
                    />
                    <span className="text-sm font-semibold text-core-text">{p.platform}</span>
                  </div>
                  <div className="text-sm text-core-text-dim">{p.posts}</div>
                  <div className="text-sm text-core-text-dim">{p.reach}</div>
                  <div className="text-sm text-core-green font-semibold">{p.engagement}</div>
                  <div className="text-sm text-core-text-dim">{p.clicks}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top performing posts */}
          <div className="jp-card">
            <div className="jp-card-header">
              <h4 className="text-sm font-semibold text-core-text m-0">
                Top Performing Posts
              </h4>
            </div>
            <div>
              {TOP_POSTS.map((post, i) => (
                <div
                  key={i}
                  className="px-5 py-3.5 border-b border-core-border flex items-center gap-3.5"
                >
                  <div className="w-7 h-7 rounded-full bg-core-green/10 text-core-green flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] text-core-text m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                      {post.content}
                    </p>
                    <span className="text-[0.6875rem] text-core-text-muted">{post.platform}</span>
                  </div>
                  <div className="flex gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-[0.8125rem] font-bold text-core-text">{post.reach}</div>
                      <div className="text-[0.625rem] text-core-text-muted">reach</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[0.8125rem] font-bold text-core-green">{post.engagement}</div>
                      <div className="text-[0.625rem] text-core-text-muted">engagement</div>
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
        <div>
          {/* Error display */}
          {connectError && (
            <div className="flex items-center justify-between px-4 py-3 mb-4 rounded-lg bg-core-red/[0.08] border border-core-red/20 text-core-red text-sm">
              <span>{connectError}</span>
              <button onClick={() => setConnectError('')} className="bg-transparent border-none text-core-red cursor-pointer text-base">×</button>
            </div>
          )}

          {/* Quick tip */}
          <div className="px-4 py-3 mb-4 rounded-lg bg-core-green/[0.06] border border-core-green/10 text-xs text-core-text-dim leading-relaxed">
            <strong className="text-core-green">Tip:</strong> Social accounts are connected through your CRM. If the connect button doesn't work, you can connect directly in your{' '}
            <a href="https://app.gohighlevel.com" target="_blank" rel="noopener noreferrer" className="text-core-green no-underline font-semibold">CRM Dashboard → Social Planner → Settings</a>
            {' '}and it will sync here automatically.
          </div>

          {/* CRM OAuth Platforms */}
          <div className="jp-card mb-4">
            <div className="jp-card-header">
              <h4 className="text-sm font-semibold text-core-text m-0">Social Accounts (CRM OAuth)</h4>
              <span className="text-xs text-core-text-muted">
                Connect via CRM — accounts sync to your location
              </span>
            </div>
            <div>
              {CRM_PLATFORMS.map((account) => {
                const isConnected = connectedAccounts[account.key] || false
                return (
                  <div key={account.key} className="flex items-center gap-3.5 px-5 py-4 border-b border-core-border">
                    <div
                      className="w-11 h-11 rounded flex items-center justify-center text-[0.8125rem] font-bold text-white flex-shrink-0"
                      style={{ background: account.color }}
                    >
                      {account.icon}
                    </div>
                    <div className="flex-1">
                      <span className="text-[0.9375rem] font-semibold text-core-text">{account.platform}</span>
                      {isConnected && <div className="text-xs text-core-text-muted mt-0.5">Connected via CRM</div>}
                    </div>
                    <div className="flex items-center gap-2.5">
                      {isConnected && (
                        <span className="text-[0.6875rem] font-semibold px-2.5 py-[3px] rounded-md bg-core-green/10 text-core-green">
                          Connected
                        </span>
                      )}
                      <button
                        onClick={() => !isConnected && connectPlatform(account.key)}
                        disabled={connecting === account.key}
                        className={`px-4 py-[7px] rounded text-[0.8125rem] font-semibold cursor-pointer ${
                          isConnected
                            ? 'bg-transparent text-core-red border border-core-border'
                            : 'bg-core-green text-black border-none'
                        } ${connecting === account.key ? 'opacity-50' : ''}`}
                      >
                        {connecting === account.key ? 'Connecting...' : isConnected ? 'Reconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Direct Platforms */}
          <div className="jp-card">
            <div className="jp-card-header">
              <h4 className="text-sm font-semibold text-core-text m-0">Direct Integrations</h4>
              <span className="text-xs text-core-text-muted">
                Connected via API keys in Settings
              </span>
            </div>
            <div>
              {DIRECT_PLATFORMS.map((account) => (
                <div key={account.key} className="flex items-center gap-3.5 px-5 py-4 border-b border-core-border">
                  <div
                    className="w-11 h-11 rounded flex items-center justify-center text-[0.8125rem] font-bold text-white flex-shrink-0"
                    style={{ background: account.color }}
                  >
                    {account.icon}
                  </div>
                  <div className="flex-1">
                    <span className="text-[0.9375rem] font-semibold text-core-text">{account.platform}</span>
                  </div>
                  <button
                    className={`px-4 py-[7px] rounded border-none text-[0.8125rem] font-semibold ${
                      account.comingSoon
                        ? 'bg-core-border text-core-text-muted opacity-50 cursor-default'
                        : 'bg-core-green text-black cursor-pointer'
                    }`}
                    disabled={account.comingSoon}
                    onClick={() => !account.comingSoon && (window.location.href = '/dashboard/integrations')}
                  >
                    {account.comingSoon ? 'Coming Soon' : 'Configure'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
