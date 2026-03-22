'use client'

import { useState } from 'react'

type Tab = 'compose' | 'scheduled' | 'analytics' | 'accounts'
type Tone = 'Professional' | 'Casual' | 'Thought Leader'

interface ScheduledPost {
  id: string
  content: string
  platforms: string[]
  date: string
  status: 'pending' | 'posted' | 'failed'
}

interface SocialAccount {
  platform: string
  connected: boolean
  handle?: string
  comingSoon?: boolean
  color: string
}

const scheduledPosts: ScheduledPost[] = [
  { id: '1', content: 'Excited to announce 0nMCP v2.5 — now with 1,171 tools across 54 services. AI orchestration has never been this powerful.', platforms: ['LinkedIn', 'X'], date: 'Mar 24, 2026 9:00 AM', status: 'pending' },
  { id: '2', content: 'How we automated 90% of our client onboarding with a single .0n SWITCH file. Thread below.', platforms: ['X', 'Reddit'], date: 'Mar 23, 2026 2:00 PM', status: 'pending' },
  { id: '3', content: 'New blog post: Building a Universal API Orchestrator — lessons from 558 to 1,171 tools', platforms: ['LinkedIn', 'Dev.to'], date: 'Mar 21, 2026 10:00 AM', status: 'posted' },
  { id: '4', content: '0nVault Container System is now patent-pending. Secure credential transfer for AI agents.', platforms: ['LinkedIn'], date: 'Mar 18, 2026 11:00 AM', status: 'posted' },
  { id: '5', content: 'Quick tip: Use the 0nMCP engine import command to auto-map credentials across 26 services', platforms: ['X', 'Dev.to'], date: 'Mar 15, 2026 3:00 PM', status: 'failed' },
]

const socialAccounts: SocialAccount[] = [
  { platform: 'LinkedIn', connected: true, handle: '@rocketopp', color: '#0A66C2' },
  { platform: 'Reddit', connected: true, handle: 'u/0nork', color: '#FF4500' },
  { platform: 'X / Twitter', connected: false, color: '#1DA1F2' },
  { platform: 'Dev.to', connected: true, handle: '@0nmcp', color: '#0a0a0a' },
  { platform: 'Facebook', connected: false, comingSoon: true, color: '#1877F2' },
  { platform: 'Instagram', connected: false, comingSoon: true, color: '#E4405F' },
]

const platformIcons: Record<string, string> = {
  LinkedIn: 'in',
  Reddit: 'r/',
  X: 'X',
  'X / Twitter': 'X',
  'Dev.to': '</>',
  Facebook: 'f',
  Instagram: 'ig',
}

const hashtagSuggestions = ['#AI', '#MCP', '#Automation', '#APIOrchestration', '#0nMCP', '#NoCode', '#DevTools', '#SaaS']

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<Tab>('compose')
  const [postContent, setPostContent] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['LinkedIn'])
  const [tone, setTone] = useState<Tone>('Professional')

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'compose', label: 'Compose' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'accounts', label: 'Accounts' },
  ]

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
        <p className="jp-page-subtitle">Publish, schedule, and analyze your social media presence</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 2,
        marginBottom: 20,
        borderBottom: '1px solid var(--jp-border)',
        paddingBottom: 0,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--jp-green)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.key ? 600 : 500,
              cursor: 'pointer',
              transition: 'all var(--jp-transition)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div style={{ display: 'flex', gap: 20 }}>
          <div className="jp-card" style={{ flex: 1 }}>
            <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 8, display: 'block' }}>
                  Post Content
                </label>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What do you want to share with the world?"
                  rows={6}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>
                    {postContent.length} / 280 characters
                  </span>
                  <button style={{
                    padding: '6px 14px',
                    background: 'rgba(0, 212, 255, 0.12)',
                    color: 'var(--jp-cyan)',
                    border: 'none',
                    borderRadius: 'var(--jp-radius-xs)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                    Generate with AI
                  </button>
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 8, display: 'block' }}>
                  Platforms
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['LinkedIn', 'Reddit', 'X', 'Dev.to', 'Facebook', 'Instagram'].map((p) => {
                    const isSelected = selectedPlatforms.includes(p)
                    const isDisabled = p === 'Facebook' || p === 'Instagram'
                    return (
                      <button
                        key={p}
                        onClick={() => !isDisabled && togglePlatform(p)}
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
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>{platformIcons[p]}</span>
                        {p}
                        {isDisabled && <span style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>(soon)</span>}
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
                  {(['Professional', 'Casual', 'Thought Leader'] as Tone[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      style={{
                        padding: '7px 16px',
                        background: tone === t ? 'var(--jp-green-glow)' : 'var(--jp-bg-input)',
                        border: `1px solid ${tone === t ? 'var(--jp-green-dim)' : 'var(--jp-border)'}`,
                        borderRadius: 'var(--jp-radius-sm)',
                        color: tone === t ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 8, display: 'block' }}>
                  Suggested Hashtags
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {hashtagSuggestions.map((tag) => (
                    <span
                      key={tag}
                      onClick={() => setPostContent((prev) => prev + ' ' + tag)}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(167, 139, 250, 0.12)',
                        color: 'var(--jp-purple)',
                        borderRadius: 'var(--jp-radius-xs)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button style={{
                  padding: '10px 24px',
                  background: 'transparent',
                  color: 'var(--jp-text-secondary)',
                  border: '1px solid var(--jp-border)',
                  borderRadius: 'var(--jp-radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}>
                  Schedule
                </button>
                <button style={{
                  padding: '10px 28px',
                  background: 'var(--jp-green)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 'var(--jp-radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}>
                  Post Now
                </button>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="jp-card" style={{ width: 300, flexShrink: 0, alignSelf: 'flex-start' }}>
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
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--jp-green)',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
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
                  color: postContent ? 'var(--jp-text-secondary)' : 'var(--jp-text-muted)',
                  lineHeight: 1.6,
                  margin: 0,
                  minHeight: 60,
                }}>
                  {postContent || 'Your post preview will appear here...'}
                </p>
                {selectedPlatforms.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {selectedPlatforms.map((p) => (
                      <span key={p} style={{
                        fontSize: '0.6875rem',
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'var(--jp-border)',
                        color: 'var(--jp-text-secondary)',
                      }}>
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <div className="jp-card">
          <div className="jp-card-header">
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>Scheduled Posts</h4>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {post.platforms.map((p) => (
                      <span key={p} style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'var(--jp-border)',
                        color: 'var(--jp-text-secondary)',
                      }}>
                        {platformIcons[p] || p} {p}
                      </span>
                    ))}
                    <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>{post.date}</span>
                  </div>
                </div>
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="jp-stat-grid">
          {[
            { label: 'Posts This Month', value: '24', change: '+8', accent: 'green' },
            { label: 'Total Reach', value: '12.4K', change: '+22%', accent: 'cyan' },
            { label: 'Engagement Rate', value: '4.7%', change: '+0.3%', accent: 'purple' },
            { label: 'Top Platform', value: 'LinkedIn', change: '68%', accent: 'amber' },
          ].map((stat) => (
            <div key={stat.label} className={`jp-stat-card ${stat.accent}`}>
              <div className="jp-stat-header">
                <span className="jp-stat-label">{stat.label}</span>
                <div className={`jp-stat-icon ${stat.accent}`}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="jp-stat-value">{stat.value}</div>
              <span className="jp-stat-change up">{stat.change}</span>
            </div>
          ))}
        </div>
      )}

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="jp-card">
          <div className="jp-card-header">
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>Connected Accounts</h4>
          </div>
          <div>
            {socialAccounts.map((account) => (
              <div
                key={account.platform}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--jp-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--jp-radius-sm)',
                  background: account.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  {platformIcons[account.platform] || account.platform[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)' }}>
                    {account.platform}
                    {account.comingSoon && (
                      <span style={{
                        marginLeft: 8,
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>{account.handle}</div>
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
    </div>
  )
}
