'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  contacts: number
  workflows: number
  runs: number
  balance: string
}

export default function DashboardHome() {
  const [userName, setUserName] = useState('')
  const [stats] = useState<Stats>({
    contacts: 0,
    workflows: 0,
    runs: 0,
    balance: '$0.00',
  })
  const [mcpStatus, setMcpStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [activeTab, setActiveTab] = useState('overview')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User')
      }
    })

    fetch('/api/0nmcp/health')
      .then((r) => r.json())
      .then((d) => setMcpStatus(d.status === 'offline' ? 'offline' : 'online'))
      .catch(() => setMcpStatus('offline'))
  }, [supabase.auth])

  const statCards = [
    {
      label: 'Total Contacts',
      value: stats.contacts.toString(),
      change: '+12%',
      changeDir: 'up' as const,
      colorClass: 'cyan',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: 'Active Workflows',
      value: stats.workflows.toString(),
      change: '+3',
      changeDir: 'up' as const,
      colorClass: 'green',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: "Month's Executions",
      value: stats.runs.toString(),
      change: '+28%',
      changeDir: 'up' as const,
      colorClass: 'purple',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: 'Balance',
      value: stats.balance,
      change: 'Active',
      changeDir: 'up' as const,
      colorClass: 'amber',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  // Generate random-ish bar heights for the chart
  const chartBars = [35, 55, 42, 68, 48, 75, 58, 82, 65, 45, 72, 52, 60, 78, 50, 85, 62, 70, 55, 88, 64, 48, 76, 58]

  const recentActivity = [
    { text: 'System initialized', meta: '0nCore connected', time: 'Just now', dot: 'green' as const },
    { text: '0nMCP engine ready', meta: '1,171 tools loaded', time: '1m ago', dot: 'cyan' as const },
    { text: 'Dashboard loaded', meta: 'All systems nominal', time: '2m ago', dot: 'muted' as const },
    { text: 'Credential vault sealed', meta: 'AES-256-GCM active', time: '5m ago', dot: 'purple' as const },
    { text: 'Webhook listeners active', meta: 'Stripe, CRM, Slack', time: '5m ago', dot: 'amber' as const },
  ]

  const quickActions = [
    { label: 'New Contact', href: '/dashboard/contacts', color: 'cyan' },
    { label: 'Run Workflow', href: '/dashboard/workflows', color: 'green' },
    { label: 'Chat with Jaxx', href: '/dashboard/chat', color: 'purple' },
    { label: 'View Billing', href: '/dashboard/billing', color: 'amber' },
  ]

  const quickActionColors: Record<string, React.CSSProperties> = {
    cyan: { background: 'rgba(0,212,255,0.08)', color: 'var(--jp-cyan)', border: '1px solid rgba(0,212,255,0.2)' },
    green: { background: 'var(--jp-green-glow)', color: 'var(--jp-green)', border: '1px solid rgba(126,217,87,0.2)' },
    purple: { background: 'rgba(167,139,250,0.08)', color: 'var(--jp-purple)', border: '1px solid rgba(167,139,250,0.2)' },
    amber: { background: 'rgba(251,191,36,0.08)', color: 'var(--jp-amber)', border: '1px solid rgba(251,191,36,0.2)' },
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="jp-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="jp-page-title">
            Welcome back, <span style={{ color: 'var(--jp-green)' }}>{userName}</span>
          </h1>
          <p className="jp-page-subtitle">Your command center overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: mcpStatus === 'online' ? 'var(--jp-green)' : mcpStatus === 'offline' ? 'var(--jp-red)' : 'var(--jp-amber)',
            boxShadow: mcpStatus === 'online' ? '0 0 8px rgba(126,217,87,0.4)' : undefined,
          }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>
            0nMCP {mcpStatus === 'checking' ? '...' : mcpStatus}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="jp-tabs">
        {['overview', 'analytics', 'operations'].map((tab) => (
          <button
            key={tab}
            className={`jp-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="jp-stat-grid" style={{ marginBottom: 24 }}>
        {statCards.map((card) => (
          <div key={card.label} className={`jp-stat-card ${card.colorClass}`}>
            <div className="jp-stat-header">
              <span className="jp-stat-label">{card.label}</span>
              <div className={`jp-stat-icon ${card.colorClass}`}>{card.icon}</div>
            </div>
            <div className="jp-stat-value">{card.value}</div>
            <span className={`jp-stat-change ${card.changeDir}`}>
              {card.changeDir === 'up' ? '\u2191' : '\u2193'} {card.change}
            </span>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Chart Card */}
        <div className="jp-card">
          <div className="jp-card-header">
            <h6>Execution Overview</h6>
            <div style={{ display: 'flex', gap: 4 }}>
              {['7D', '30D', '90D'].map((period) => (
                <button
                  key={period}
                  className="jp-btn-outline"
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    borderRadius: 6,
                    ...(period === '30D' ? { borderColor: 'var(--jp-green-dim)', color: 'var(--jp-green)' } : {}),
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="jp-card-body">
            <div className="jp-chart-area">
              {chartBars.map((height, i) => (
                <div
                  key={i}
                  className="jp-chart-bar"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20 }}>
              {[
                { label: 'Total Runs', value: '0', change: '+0%', color: 'var(--jp-green)' },
                { label: 'Success Rate', value: '100%', change: '+0%', color: 'var(--jp-cyan)' },
                { label: 'Avg Duration', value: '0s', change: '0%', color: 'var(--jp-purple)' },
                { label: 'API Calls', value: '0', change: '+0%', color: 'var(--jp-amber)' },
              ].map((metric) => (
                <div key={metric.label}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)', marginBottom: 4 }}>{metric.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--jp-text)' }}>{metric.value}</span>
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: metric.color,
                      background: `color-mix(in srgb, ${metric.color} 12%, transparent)`,
                      padding: '1px 6px',
                      borderRadius: 4,
                    }}>
                      {metric.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions + System Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Actions */}
          <div className="jp-card">
            <div className="jp-card-header">
              <h6>Quick Actions</h6>
            </div>
            <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--jp-radius-sm)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                    ...quickActionColors[action.color],
                  }}
                >
                  {action.label}
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="jp-card" style={{ flex: 1 }}>
            <div className="jp-card-header">
              <h6>System Status</h6>
            </div>
            <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: '0nMCP Engine', status: mcpStatus === 'online', pct: 100 },
                { label: 'Vault Encryption', status: true, pct: 100 },
                { label: 'Webhook Handlers', status: true, pct: 100 },
                { label: 'CRM Sync', status: false, pct: 0 },
              ].map((sys) => (
                <div key={sys.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>{sys.label}</span>
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: sys.status ? 'var(--jp-green)' : 'var(--jp-text-muted)',
                    }}>
                      {sys.status ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="jp-progress">
                    <div
                      className={`jp-progress-bar ${sys.status ? 'green' : ''}`}
                      style={{ width: `${sys.pct}%`, background: sys.status ? undefined : 'var(--jp-border-hi)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="jp-card">
        <div className="jp-card-header">
          <h6>Recent Activity</h6>
          <button className="jp-btn-outline" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
            View All
          </button>
        </div>
        <ul className="jp-activity-list">
          {recentActivity.map((item, i) => (
            <li key={i} className="jp-activity-item">
              <span className={`jp-activity-dot ${item.dot}`} />
              <div className="jp-activity-content">
                <div className="jp-activity-text">{item.text}</div>
                <div className="jp-activity-meta">{item.meta}</div>
              </div>
              <span className="jp-activity-time">{item.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
