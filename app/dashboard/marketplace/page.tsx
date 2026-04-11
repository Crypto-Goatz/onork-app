'use client'

import { useState, useEffect } from 'react'

/**
 * 0nMCP Marketplace Dashboard — Custom Page for CRM
 *
 * This page loads inside the CRM as an iframe (Custom Page module).
 * It receives SSO data via postMessage from the CRM parent window.
 * Shows: credits, connected services, recent activity, quick actions.
 */

interface SSOPayload {
  userId: string
  locationId: string
  companyId: string
  email: string
  role: string
}

export default function MarketplaceDashboard() {
  const [sso, setSSO] = useState<SSOPayload | null>(null)
  const [credits, setCredits] = useState(5000)
  const [creditsUsed, setCreditsUsed] = useState(0)
  const [recentActions, setRecentActions] = useState<any[]>([])
  const [embedded, setEmbedded] = useState(false)

  useEffect(() => {
    // Check if embedded in CRM iframe
    const params = new URLSearchParams(window.location.search)
    setEmbedded(params.get('embedded') === 'true' || window.parent !== window)

    // Listen for SSO postMessage from CRM parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'sso' || event.data?.userId) {
        setSSO({
          userId: event.data.userId || '',
          locationId: event.data.locationId || '',
          companyId: event.data.companyId || '',
          email: event.data.email || '',
          role: event.data.role || 'user',
        })
      }
    }
    window.addEventListener('message', handleMessage)

    // Start with empty state — actions will be populated from live data
    setRecentActions([])

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const creditsPercent = Math.round((creditsUsed / credits) * 100)

  return (
    <div style={{ minHeight: '100vh', background: embedded ? '#f9fafb' : '#0c1220', color: embedded ? '#111827' : 'var(--text-primary, #f0f4f8)', fontFamily: 'system-ui, -apple-system, sans-serif', padding: embedded ? 16 : 24 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${embedded ? '#e5e7eb' : 'var(--border, #30363d)'}` }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>
              <span style={{ color: '#10b981' }}>0n</span>MCP
              <span style={{ color: embedded ? '#9ca3af' : 'var(--text-muted, #6b7280)', fontSize: 12, fontWeight: 400, marginLeft: 8 }}>Dashboard</span>
            </h1>
            {sso && <p style={{ fontSize: 11, color: embedded ? '#9ca3af' : 'var(--text-muted, #6b7280)', marginTop: 2 }}>{sso.email} · Location: {sso.locationId?.slice(0, 8)}...</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="https://0nmcp.com" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', background: embedded ? '#f3f4f6' : 'var(--bg-card, #1f2937)', border: `1px solid ${embedded ? '#e5e7eb' : 'var(--border, #30363d)'}`, borderRadius: 8, color: embedded ? '#6b7280' : 'var(--text-secondary, #9ca3af)', fontSize: 11, textDecoration: 'none' }}>Docs</a>
            <a href="https://0nmcp.com/affiliates" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', background: '#10b981', borderRadius: 8, color: 'white', fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>Earn 30%</a>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'AI Credits', value: `${(credits - creditsUsed).toLocaleString()}`, sub: `of ${credits.toLocaleString()}`, color: '#10b981' },
            { label: 'Services', value: '95', sub: 'Connected', color: '#3b82f6' },
            { label: 'Tools', value: '926', sub: 'Available', color: '#8b5cf6' },
            { label: 'Actions Today', value: String(recentActions.length), sub: 'Executed', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: embedded ? 'white' : 'var(--bg-card, #1f2937)', border: `1px solid ${embedded ? '#e5e7eb' : 'var(--border, #30363d)'}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: embedded ? '#9ca3af' : 'var(--text-muted, #6b7280)', marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 9, color: embedded ? '#d1d5db' : '#3a4a5c' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Credits Bar */}
        <div style={{ background: embedded ? 'white' : 'var(--bg-card, #1f2937)', border: `1px solid ${embedded ? '#e5e7eb' : 'var(--border, #30363d)'}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: embedded ? '#6b7280' : 'var(--text-muted, #6b7280)', marginBottom: 6 }}>
            <span>AI Credits Used: {creditsUsed.toLocaleString()} / {credits.toLocaleString()}</span>
            <span>{creditsPercent}%</span>
          </div>
          <div style={{ height: 6, background: embedded ? '#f3f4f6' : 'var(--border, #30363d)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${creditsPercent}%`, background: creditsPercent > 80 ? '#ef4444' : '#10b981', borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Quick Actions */}
          <div>
            <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Quick Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { icon: '🔍', label: 'SXO Scan', desc: 'Scan a domain' },
                { icon: '📧', label: 'Send Email', desc: 'Email a contact' },
                { icon: '🔥', label: 'Score Leads', desc: 'AI lead scoring' },
                { icon: '📅', label: 'Book Apt', desc: 'Schedule meeting' },
                { icon: '📚', label: 'Gen Course', desc: 'Create a course' },
                { icon: '💰', label: 'Invoice', desc: 'Stripe invoice' },
                { icon: '📱', label: 'Send SMS', desc: 'Text a contact' },
                { icon: '🔗', label: 'Refer', desc: 'Earn 30%' },
              ].map(a => (
                <button key={a.label} style={{
                  background: embedded ? 'white' : 'var(--bg-card, #1f2937)', border: `1px solid ${embedded ? '#e5e7eb' : 'var(--border, #30363d)'}`,
                  borderRadius: 10, padding: '12px', textAlign: 'left', cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{a.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: embedded ? '#111827' : 'var(--text-primary, #f0f4f8)' }}>{a.label}</div>
                  <div style={{ fontSize: 10, color: embedded ? '#9ca3af' : 'var(--text-muted, #6b7280)' }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Recent Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentActions.map((a, i) => (
                <div key={i} style={{
                  background: embedded ? 'white' : 'var(--bg-card, #1f2937)', border: `1px solid ${embedded ? '#e5e7eb' : 'var(--border, #30363d)'}`,
                  borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: embedded ? '#111827' : 'var(--text-primary, #f0f4f8)' }}>{a.action}</div>
                    <div style={{ fontSize: 10, color: embedded ? '#9ca3af' : 'var(--text-muted, #6b7280)' }}>{a.detail}</div>
                  </div>
                  <span style={{ fontSize: 10, color: embedded ? '#d1d5db' : '#3a4a5c' }}>{a.time}</span>
                </div>
              ))}
            </div>

            {/* Connected Services Preview */}
            <div style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 16 }}>Connected Services</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Stripe', 'Slack', 'Gmail', 'Supabase', 'GitHub', 'SendGrid', 'Twilio', 'Shopify', 'Figma', 'Notion', '+85 more'].map(s => (
                <span key={s} style={{
                  padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 500,
                  background: embedded ? '#f3f4f6' : 'var(--border, #30363d)',
                  color: s.startsWith('+') ? '#10b981' : (embedded ? '#6b7280' : 'var(--text-secondary, #9ca3af)'),
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: `1px solid ${embedded ? '#e5e7eb' : 'var(--border, #30363d)'}`, fontSize: 10, color: embedded ? '#d1d5db' : '#3a4a5c' }}>
          0nMCP v2.9.1 · 95 services · 926 endpoints · Patent Pending · RocketOpp LLC
        </div>
      </div>
    </div>
  )
}
