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
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'text-core-cyan',
    },
    {
      label: 'Active Workflows',
      value: stats.workflows.toString(),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'text-core-green',
    },
    {
      label: "This Month's Runs",
      value: stats.runs.toString(),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'text-core-amber',
    },
    {
      label: 'Balance',
      value: stats.balance,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-core-green',
    },
  ]

  const quickActions = [
    { label: 'New Contact', href: '/dashboard/contacts', color: 'bg-core-cyan/10 text-core-cyan border-core-cyan/20' },
    { label: 'Run Workflow', href: '/dashboard/workflows', color: 'bg-core-green/10 text-core-green border-core-green/20' },
    { label: 'View Billing', href: '/dashboard/billing', color: 'bg-core-amber/10 text-core-amber border-amber-500/20' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-core-text">
            Welcome back, <span className="text-core-green">{userName}</span>
          </h1>
          <p className="text-core-text-dim text-sm mt-1">Here is your command center overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              mcpStatus === 'online' ? 'bg-core-green' : mcpStatus === 'offline' ? 'bg-core-red' : 'bg-core-amber'
            }`}
          />
          <span className="text-xs text-core-text-muted">
            0nMCP {mcpStatus === 'checking' ? '...' : mcpStatus}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-core-card border border-core-border rounded-xl p-5 hover:border-core-border-hi transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-core-text-dim">{card.label}</span>
              <span className={card.color}>{card.icon}</span>
            </div>
            <div className="text-2xl font-bold text-core-text">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-core-text mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:brightness-110 ${action.color}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-core-text mb-3">Recent Activity</h2>
        <div className="bg-core-card border border-core-border rounded-xl divide-y divide-core-border">
          {[
            { action: 'System initialized', time: 'Just now', icon: 'text-core-green' },
            { action: 'Connected to 0nMCP', time: 'Just now', icon: 'text-core-cyan' },
            { action: 'Dashboard loaded', time: 'Just now', icon: 'text-core-text-dim' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className={`w-1.5 h-1.5 rounded-full ${item.icon === 'text-core-green' ? 'bg-core-green' : item.icon === 'text-core-cyan' ? 'bg-core-cyan' : 'bg-core-text-muted'}`} />
                <span className="text-sm text-core-text">{item.action}</span>
              </div>
              <span className="text-xs text-core-text-muted">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
