'use client'

import { useEffect, useState, useCallback } from 'react'

type Tab = 'overview' | 'database' | 'users' | 'training' | 'ecosystem' | 'sitemaps'

interface TableInfo {
  name: string
  row_count: number
  group: string
}

interface UserProfile {
  id: string
  email?: string
  full_name?: string
  plan?: string
  is_admin?: boolean
  stripe_customer_id?: string
  crm_contact_id?: string
  created_at?: string
  [key: string]: unknown
}

interface TrainingData {
  sources: { total: number; recent: { id: string; title: string; source_type: string; status: string; token_count: number; created_at: string }[] }
  pairs: { total: number; recent: { id: string; user_input: string; assistant_output: string; domain: string; quality_score: number; approved: boolean; human_reviewed: boolean; created_at: string }[] }
  datasets: { id: string; name: string; pair_count?: number; status: string; created_at: string }[]
  feeds: { id: string; name: string; status: string }[]
  knowledge: { total: number; avg_score: number }
  runs: { id: string; created_at: string; status?: string; [key: string]: unknown }[]
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<{ total_users: number; total_training_sources: number; total_training_pairs: number; total_knowledge: number } | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [training, setTraining] = useState<TrainingData | null>(null)
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [tableData, setTableData] = useState<{ rows: Record<string, unknown>[]; total: number }>({ rows: [], total: 0 })
  const [tableOffset, setTableOffset] = useState(0)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedLoading, setFeedLoading] = useState(false)

  const fetchApi = useCallback(async (action: string, params: Record<string, string> = {}) => {
    const sp = new URLSearchParams({ action, ...params })
    const res = await fetch(`/api/admin?${sp.toString()}`)
    return res.json()
  }, [])

  // Load stats on mount
  useEffect(() => {
    fetchApi('stats').then(d => setStats(d.stats))
  }, [fetchApi])

  // Load tab data
  useEffect(() => {
    setLoading(true)
    const load = async () => {
      switch (tab) {
        case 'database':
          if (tables.length === 0) {
            const d = await fetchApi('tables')
            setTables(d.tables || [])
          }
          break
        case 'users':
          if (users.length === 0) {
            const d = await fetchApi('users')
            setUsers(d.users || [])
            setUsersTotal(d.total || 0)
          }
          break
        case 'training':
          if (!training) {
            const d = await fetchApi('training')
            setTraining(d.training)
          }
          break
      }
      setLoading(false)
    }
    load()
  }, [tab, fetchApi, tables.length, users.length, training])

  // Load table data when selected
  useEffect(() => {
    if (!selectedTable) return
    setLoading(true)
    fetchApi('table_data', { table: selectedTable, offset: String(tableOffset), limit: '20' }).then(d => {
      setTableData({ rows: d.rows || [], total: d.total || 0 })
      setLoading(false)
    })
  }, [selectedTable, tableOffset, fetchApi])

  async function handleFeed() {
    setFeedLoading(true)
    try {
      await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feed' }),
      })
      // Refresh training data
      const d = await fetchApi('training')
      setTraining(d.training)
    } catch {}
    setFeedLoading(false)
  }

  async function handleApprove(pairId: string) {
    await fetch('/api/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', pair_id: pairId }),
    })
    const d = await fetchApi('training')
    setTraining(d.training)
  }

  async function handleReject(pairId: string) {
    await fetch('/api/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', pair_id: pairId }),
    })
    const d = await fetchApi('training')
    setTraining(d.training)
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z' },
    { key: 'database', label: 'Database', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
    { key: 'users', label: 'Users', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { key: 'training', label: '0nAI Training', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { key: 'ecosystem', label: 'Ecosystem', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9' },
    { key: 'sitemaps', label: 'Sitemaps', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  ]

  const tableGroups = tables.reduce<Record<string, TableInfo[]>>((acc, t) => {
    const g = t.group || 'other'
    if (!acc[g]) acc[g] = []
    acc[g].push(t)
    return acc
  }, {})

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--jp-green)', margin: 0, letterSpacing: -0.5 }}>
            Admin Control Panel
          </h1>
          <p style={{ color: 'var(--jp-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            Master dashboard for the 0n ecosystem
          </p>
        </div>
        <div style={{
          padding: '6px 14px',
          background: 'rgba(126, 217, 87, 0.08)',
          border: '1px solid rgba(126, 217, 87, 0.2)',
          borderRadius: 'var(--jp-radius-xs)',
          color: 'var(--jp-green)',
          fontSize: 12,
          fontWeight: 600,
        }}>
          mike@rocketopp.com
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid var(--jp-border)',
        marginBottom: 24,
        overflowX: 'auto',
        paddingBottom: 0,
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--jp-green)' : '2px solid transparent',
              color: tab === t.key ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Total Users', value: stats?.total_users || 0, color: 'var(--jp-green)' },
              { label: 'Training Sources', value: stats?.total_training_sources || 0, color: 'var(--jp-cyan)' },
              { label: 'Training Pairs', value: stats?.total_training_pairs || 0, color: 'var(--jp-purple)' },
              { label: 'Knowledge Entries', value: stats?.total_knowledge || 0, color: 'var(--jp-amber)' },
            ].map((card, i) => (
              <div key={i} style={{
                background: 'var(--jp-bg-card)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius)',
                padding: 20,
              }}>
                <div style={{ color: 'var(--jp-text-muted)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: card.color }}>
                  {card.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Ecosystem Map */}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--jp-text)', marginBottom: 16 }}>Ecosystem Map</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { name: '0nMCP', desc: 'Universal AI API Orchestrator', stats: '1,171 tools / 54 services', url: 'https://www.npmjs.com/package/0nmcp', github: 'https://github.com/0nork/0nMCP', color: 'var(--jp-green)' },
              { name: '0nmcp.com', desc: 'Marketing + Community Hub', stats: '48 pages / 33 API routes', url: 'https://0nmcp.com', vercel: 'prj_Ccq53WXdb5CQd4iIBRR0qr4QToge', color: 'var(--jp-cyan)' },
              { name: '0nCore', desc: 'Client CRM Portal', stats: 'PIN auth / Metered billing', url: 'https://0ncore.com', vercel: 'prj_OJ0gi5HItdtUmQYclXirYk1BSJnt', color: 'var(--jp-green)' },
              { name: '0nCommand', desc: 'Command Center', stats: '80 routes / 10 engines', url: 'https://0n-command-center.vercel.app', color: 'var(--jp-purple)' },
              { name: 'Marketplace', desc: 'SaaS Platform', stats: 'Pay-per-execution', url: 'https://marketplace.rocketclients.com', vercel: 'prj_fWdT7RGwoK01RqhxNN6M7USSCIZj', color: 'var(--jp-amber)' },
              { name: 'social0n', desc: 'LinkedIn Extension', stats: 'Chrome Extension', github: 'https://github.com/0nork/0n-linkedin', color: 'var(--jp-cyan)' },
            ].map((p, i) => (
              <div key={i} style={{
                background: 'var(--jp-bg-card)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius)',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: p.color }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--jp-text-muted)', background: 'var(--jp-bg)', padding: '2px 8px', borderRadius: 4 }}>
                    {p.stats}
                  </span>
                </div>
                <p style={{ color: 'var(--jp-text-secondary)', fontSize: 13, margin: 0 }}>{p.desc}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--jp-cyan)', textDecoration: 'none' }}>
                      Open
                    </a>
                  )}
                  {p.github && (
                    <a href={p.github} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--jp-text-muted)', textDecoration: 'none' }}>
                      GitHub
                    </a>
                  )}
                  {p.vercel && (
                    <span style={{ fontSize: 11, color: 'var(--jp-text-muted)' }}>Vercel: {p.vercel.slice(4, 12)}...</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--jp-text)', marginBottom: 16 }}>Quick Links</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Supabase', url: 'https://supabase.com/dashboard/project/yaehbwimocvvnnlojkxe' },
              { label: 'Stripe', url: 'https://dashboard.stripe.com' },
              { label: 'Vercel', url: 'https://vercel.com/cryptogoatz' },
              { label: 'GitHub (0nork)', url: 'https://github.com/0nork' },
              { label: 'GitHub (Crypto-Goatz)', url: 'https://github.com/Crypto-Goatz' },
              { label: 'CRM', url: 'https://app.clientclub.net' },
              { label: 'npm (0nmcp)', url: 'https://www.npmjs.com/package/0nmcp' },
            ].map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px',
                  background: 'var(--jp-bg-card)',
                  border: '1px solid var(--jp-border)',
                  borderRadius: 'var(--jp-radius-sm)',
                  color: 'var(--jp-text-secondary)',
                  fontSize: 13,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--jp-green)'; e.currentTarget.style.color = 'var(--jp-green)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--jp-border)'; e.currentTarget.style.color = 'var(--jp-text-secondary)' }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CRM Info */}
          <div style={{ marginTop: 32, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)', borderRadius: 'var(--jp-radius)', padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--jp-text)', marginBottom: 12, marginTop: 0 }}>CRM Status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
              <div>
                <span style={{ color: 'var(--jp-text-muted)', fontSize: 12 }}>Sub-location PIT</span>
                <div style={{ color: 'var(--jp-text-secondary)', fontSize: 13, fontFamily: 'monospace', marginTop: 2 }}>pit-bd4efaef-...-85e941572675</div>
              </div>
              <div>
                <span style={{ color: 'var(--jp-text-muted)', fontSize: 12 }}>RocketOpp Location</span>
                <div style={{ color: 'var(--jp-text-secondary)', fontSize: 13, fontFamily: 'monospace', marginTop: 2 }}>6MSqx0trfxgLxeHBJE1k</div>
              </div>
              <div>
                <span style={{ color: 'var(--jp-text-muted)', fontSize: 12 }}>Agency PIT</span>
                <div style={{ color: 'var(--jp-text-secondary)', fontSize: 13, fontFamily: 'monospace', marginTop: 2 }}>pit-e789d87e-...-ff46aa47a316</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'database' && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedTable}
              onChange={e => { setSelectedTable(e.target.value); setTableOffset(0) }}
              style={{
                padding: '8px 14px',
                background: 'var(--jp-bg-input)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius-xs)',
                color: 'var(--jp-text)',
                fontSize: 13,
                minWidth: 260,
              }}
            >
              <option value="">Select a table...</option>
              {Object.entries(tableGroups).sort(([a], [b]) => a.localeCompare(b)).map(([group, items]) => (
                <optgroup key={group} label={group.toUpperCase()}>
                  {items.sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.row_count} rows)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span style={{ color: 'var(--jp-text-muted)', fontSize: 13 }}>
              {tables.length} tables found
            </span>
          </div>

          {/* Table list badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
            {tables.sort((a, b) => b.row_count - a.row_count).slice(0, 20).map(t => (
              <button
                key={t.name}
                onClick={() => { setSelectedTable(t.name); setTableOffset(0) }}
                style={{
                  padding: '4px 10px',
                  background: selectedTable === t.name ? 'rgba(126, 217, 87, 0.1)' : 'var(--jp-bg-card)',
                  border: `1px solid ${selectedTable === t.name ? 'var(--jp-green)' : 'var(--jp-border)'}`,
                  borderRadius: 20,
                  color: selectedTable === t.name ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {t.name} <span style={{ opacity: 0.6 }}>({t.row_count})</span>
              </button>
            ))}
          </div>

          {/* Table data */}
          {selectedTable && (
            <div style={{ background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)', borderRadius: 'var(--jp-radius)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--jp-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--jp-green)', fontWeight: 600, fontSize: 14 }}>{selectedTable}</span>
                <span style={{ color: 'var(--jp-text-muted)', fontSize: 12 }}>{tableData.total} total rows</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                {loading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--jp-text-muted)' }}>Loading...</div>
                ) : tableData.rows.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--jp-text-muted)' }}>No rows</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {Object.keys(tableData.rows[0]).map(col => (
                          <th key={col} style={{
                            padding: '8px 12px',
                            textAlign: 'left',
                            color: 'var(--jp-text-muted)',
                            fontWeight: 600,
                            borderBottom: '1px solid var(--jp-border)',
                            whiteSpace: 'nowrap',
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: '1px solid var(--jp-border)' }}>
                          {Object.values(row).map((val, ci) => (
                            <td key={ci} style={{
                              padding: '8px 12px',
                              color: 'var(--jp-text-secondary)',
                              maxWidth: 300,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {val === null ? <span style={{ color: 'var(--jp-text-muted)', fontStyle: 'italic' }}>null</span> :
                               typeof val === 'object' ? <span style={{ color: 'var(--jp-purple)', fontFamily: 'monospace' }}>{JSON.stringify(val).slice(0, 80)}</span> :
                               typeof val === 'boolean' ? <span style={{ color: val ? 'var(--jp-green)' : 'var(--jp-red)' }}>{String(val)}</span> :
                               String(val).slice(0, 100)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {/* Pagination */}
              {tableData.total > 20 && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--jp-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    disabled={tableOffset === 0}
                    onClick={() => setTableOffset(Math.max(0, tableOffset - 20))}
                    style={{
                      padding: '6px 14px',
                      background: tableOffset === 0 ? 'var(--jp-bg)' : 'var(--jp-bg-elevated)',
                      border: '1px solid var(--jp-border)',
                      borderRadius: 'var(--jp-radius-xs)',
                      color: tableOffset === 0 ? 'var(--jp-text-muted)' : 'var(--jp-text)',
                      fontSize: 12,
                      cursor: tableOffset === 0 ? 'default' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ color: 'var(--jp-text-muted)', fontSize: 12 }}>
                    {tableOffset + 1}-{Math.min(tableOffset + 20, tableData.total)} of {tableData.total}
                  </span>
                  <button
                    disabled={tableOffset + 20 >= tableData.total}
                    onClick={() => setTableOffset(tableOffset + 20)}
                    style={{
                      padding: '6px 14px',
                      background: tableOffset + 20 >= tableData.total ? 'var(--jp-bg)' : 'var(--jp-bg-elevated)',
                      border: '1px solid var(--jp-border)',
                      borderRadius: 'var(--jp-radius-xs)',
                      color: tableOffset + 20 >= tableData.total ? 'var(--jp-text-muted)' : 'var(--jp-text)',
                      fontSize: 12,
                      cursor: tableOffset + 20 >= tableData.total ? 'default' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div style={{ marginBottom: 16, color: 'var(--jp-text-muted)', fontSize: 13 }}>
            {usersTotal} total users
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map(user => (
              <div
                key={user.id}
                style={{
                  background: 'var(--jp-bg-card)',
                  border: '1px solid var(--jp-border)',
                  borderRadius: 'var(--jp-radius)',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: user.is_admin ? 'rgba(126, 217, 87, 0.1)' : 'var(--jp-bg)',
                      border: `1px solid ${user.is_admin ? 'var(--jp-green)' : 'var(--jp-border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: user.is_admin ? 'var(--jp-green)' : 'var(--jp-text-muted)',
                      fontSize: 14,
                      fontWeight: 700,
                    }}>
                      {(user.full_name || user.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ color: 'var(--jp-text)', fontSize: 14, fontWeight: 600 }}>
                        {user.full_name || 'No name'}
                      </div>
                      <div style={{ color: 'var(--jp-text-muted)', fontSize: 12 }}>
                        {user.email || user.id}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {user.is_admin && (
                      <span style={{
                        padding: '2px 8px',
                        background: 'rgba(126, 217, 87, 0.1)',
                        border: '1px solid rgba(126, 217, 87, 0.2)',
                        borderRadius: 4,
                        color: 'var(--jp-green)',
                        fontSize: 10,
                        fontWeight: 600,
                      }}>ADMIN</span>
                    )}
                    {user.plan && (
                      <span style={{
                        padding: '2px 8px',
                        background: 'rgba(0, 212, 255, 0.1)',
                        border: '1px solid rgba(0, 212, 255, 0.2)',
                        borderRadius: 4,
                        color: 'var(--jp-cyan)',
                        fontSize: 10,
                        fontWeight: 600,
                      }}>{user.plan}</span>
                    )}
                    <span style={{ color: 'var(--jp-text-muted)', fontSize: 11 }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
                    </span>
                    <svg width={14} height={14} fill="none" stroke="var(--jp-text-muted)" viewBox="0 0 24 24" strokeWidth={2}
                      style={{ transform: expandedUser === user.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expandedUser === user.id && (
                  <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--jp-border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, paddingTop: 16 }}>
                      {Object.entries(user).filter(([k]) => !['id'].includes(k)).map(([key, val]) => (
                        <div key={key}>
                          <div style={{ color: 'var(--jp-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{key}</div>
                          <div style={{ color: 'var(--jp-text-secondary)', fontSize: 13, fontFamily: typeof val === 'string' && val.length > 20 ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
                            {val === null ? <span style={{ color: 'var(--jp-text-muted)', fontStyle: 'italic' }}>null</span> :
                             typeof val === 'boolean' ? <span style={{ color: val ? 'var(--jp-green)' : 'var(--jp-red)' }}>{String(val)}</span> :
                             typeof val === 'object' ? JSON.stringify(val) :
                             String(val)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'training' && training && (
        <div>
          {/* Training Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Sources', value: training.sources.total, color: 'var(--jp-green)' },
              { label: 'Pairs', value: training.pairs.total, color: 'var(--jp-cyan)' },
              { label: 'Datasets', value: training.datasets.length, color: 'var(--jp-purple)' },
              { label: 'Knowledge', value: training.knowledge.total, color: 'var(--jp-amber)' },
              { label: 'Avg Score', value: training.knowledge.avg_score, color: 'var(--jp-green)' },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'var(--jp-bg-card)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius-sm)',
                padding: 16,
              }}>
                <div style={{ color: 'var(--jp-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <button
              onClick={handleFeed}
              disabled={feedLoading}
              style={{
                padding: '10px 20px',
                background: feedLoading ? 'var(--jp-bg)' : 'var(--jp-green)',
                color: feedLoading ? 'var(--jp-text-muted)' : '#000',
                border: 'none',
                borderRadius: 'var(--jp-radius-xs)',
                fontSize: 13,
                fontWeight: 600,
                cursor: feedLoading ? 'default' : 'pointer',
              }}
            >
              {feedLoading ? 'Running Feed...' : 'Run Feed Now'}
            </button>
          </div>

          {/* Feed Sources */}
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--jp-text)', marginBottom: 12 }}>Feed Sources (11)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {training.feeds.map(f => (
              <div key={f.id} style={{
                padding: '6px 12px',
                background: 'var(--jp-bg-card)',
                border: `1px solid ${f.status === 'active' ? 'rgba(126, 217, 87, 0.3)' : 'var(--jp-border)'}`,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: f.status === 'active' ? 'var(--jp-green)' : 'var(--jp-text-muted)',
                }} />
                <span style={{ color: 'var(--jp-text-secondary)', fontSize: 12 }}>{f.name}</span>
              </div>
            ))}
          </div>

          {/* Recent Sources */}
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--jp-text)', marginBottom: 12 }}>Recent Sources</h3>
          <div style={{ background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)', borderRadius: 'var(--jp-radius)', overflow: 'hidden', marginBottom: 24 }}>
            {training.sources.recent.map((s, i) => (
              <div key={s.id} style={{
                padding: '10px 16px',
                borderBottom: i < training.sources.recent.length - 1 ? '1px solid var(--jp-border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--jp-text-secondary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{
                    padding: '2px 8px',
                    background: 'var(--jp-bg)',
                    borderRadius: 4,
                    color: 'var(--jp-text-muted)',
                    fontSize: 10,
                  }}>{s.source_type}</span>
                  <span style={{
                    padding: '2px 8px',
                    background: s.status === 'raw' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(126, 217, 87, 0.1)',
                    borderRadius: 4,
                    color: s.status === 'raw' ? 'var(--jp-amber)' : 'var(--jp-green)',
                    fontSize: 10,
                  }}>{s.status}</span>
                  <span style={{ color: 'var(--jp-text-muted)', fontSize: 10 }}>{s.token_count} tok</span>
                </div>
              </div>
            ))}
            {training.sources.recent.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--jp-text-muted)', fontSize: 13 }}>No sources yet</div>
            )}
          </div>

          {/* Recent Pairs with Approve/Reject */}
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--jp-text)', marginBottom: 12 }}>Recent Training Pairs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {training.pairs.recent.map(p => (
              <div key={p.id} style={{
                background: 'var(--jp-bg-card)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius-sm)',
                padding: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--jp-text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>User Input</div>
                    <div style={{ color: 'var(--jp-text-secondary)', fontSize: 13 }}>{p.user_input?.slice(0, 200)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    {p.approved ? (
                      <span style={{ padding: '3px 10px', background: 'rgba(126, 217, 87, 0.1)', color: 'var(--jp-green)', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>Approved</span>
                    ) : p.human_reviewed ? (
                      <span style={{ padding: '3px 10px', background: 'rgba(248, 113, 113, 0.1)', color: 'var(--jp-red)', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>Rejected</span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(p.id)}
                          style={{ padding: '3px 10px', background: 'rgba(126, 217, 87, 0.1)', border: '1px solid rgba(126, 217, 87, 0.3)', color: 'var(--jp-green)', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >Approve</button>
                        <button
                          onClick={() => handleReject(p.id)}
                          style={{ padding: '3px 10px', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)', color: 'var(--jp-red)', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >Reject</button>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ color: 'var(--jp-text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Assistant Output</div>
                <div style={{ color: 'var(--jp-text-secondary)', fontSize: 13 }}>{p.assistant_output?.slice(0, 200)}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <span style={{ color: 'var(--jp-text-muted)', fontSize: 10 }}>Domain: {p.domain}</span>
                  {p.quality_score && <span style={{ color: 'var(--jp-text-muted)', fontSize: 10 }}>Score: {p.quality_score}</span>}
                </div>
              </div>
            ))}
            {training.pairs.recent.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--jp-text-muted)', fontSize: 13, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)', borderRadius: 'var(--jp-radius-sm)' }}>No training pairs yet</div>
            )}
          </div>

          {/* Datasets */}
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--jp-text)', marginBottom: 12 }}>Datasets</h3>
          <div style={{ background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)', borderRadius: 'var(--jp-radius)', overflow: 'hidden', marginBottom: 24 }}>
            {training.datasets.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--jp-text-muted)', fontSize: 13 }}>No datasets yet</div>
            ) : training.datasets.map((d, i) => (
              <div key={d.id} style={{
                padding: '10px 16px',
                borderBottom: i < training.datasets.length - 1 ? '1px solid var(--jp-border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: 'var(--jp-text-secondary)', fontSize: 13 }}>{d.name}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'var(--jp-text-muted)', fontSize: 11 }}>{d.pair_count || 0} pairs</span>
                  <span style={{
                    padding: '2px 8px',
                    background: d.status === 'ready' ? 'rgba(126, 217, 87, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                    borderRadius: 4,
                    color: d.status === 'ready' ? 'var(--jp-green)' : 'var(--jp-amber)',
                    fontSize: 10,
                  }}>{d.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Training Runs */}
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--jp-text)', marginBottom: 12 }}>Training Runs</h3>
          <div style={{ background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)', borderRadius: 'var(--jp-radius)', overflow: 'hidden' }}>
            {training.runs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--jp-text-muted)', fontSize: 13 }}>No training runs yet</div>
            ) : training.runs.map((r, i) => (
              <div key={r.id} style={{
                padding: '10px 16px',
                borderBottom: i < training.runs.length - 1 ? '1px solid var(--jp-border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: 'var(--jp-text-secondary)', fontSize: 13, fontFamily: 'monospace' }}>{String(r.id).slice(0, 8)}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'var(--jp-text-muted)', fontSize: 11 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    background: 'rgba(126, 217, 87, 0.1)',
                    color: 'var(--jp-green)',
                  }}>{r.status || 'completed'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'training' && !training && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--jp-text-muted)' }}>Loading training data...</div>
      )}

      {tab === 'ecosystem' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--jp-text)', marginBottom: 16 }}>All Ecosystem Links</h3>

          {[
            {
              title: 'Supabase Projects',
              links: [
                { label: '0nmcp.com + Marketplace (pwujhhmlrtxjmjzyttwn)', url: 'https://supabase.com/dashboard/project/pwujhhmlrtxjmjzyttwn' },
                { label: '0nork Customers (yaehbwimocvvnnlojkxe)', url: 'https://supabase.com/dashboard/project/yaehbwimocvvnnlojkxe' },
                { label: 'Rocket+ Master DB (rtwtaisjtvdajrdyivkn)', url: 'https://supabase.com/dashboard/project/rtwtaisjtvdajrdyivkn' },
              ],
            },
            {
              title: 'Vercel Projects',
              links: [
                { label: '0nmcp.com', url: 'https://vercel.com/cryptogoatz/0nmcp-website' },
                { label: '0nCore', url: 'https://vercel.com/cryptogoatz/onork-app' },
                { label: 'Marketplace', url: 'https://vercel.com/cryptogoatz/0n-marketplace' },
                { label: 'Vercel Dashboard', url: 'https://vercel.com/cryptogoatz' },
              ],
            },
            {
              title: 'GitHub',
              links: [
                { label: '0nork Organization', url: 'https://github.com/0nork' },
                { label: 'Crypto-Goatz Organization', url: 'https://github.com/Crypto-Goatz' },
                { label: '0nMCP Repository', url: 'https://github.com/0nork/0nMCP' },
              ],
            },
            {
              title: 'Payments & CRM',
              links: [
                { label: 'Stripe Dashboard', url: 'https://dashboard.stripe.com' },
                { label: 'CRM Dashboard', url: 'https://app.clientclub.net' },
              ],
            },
            {
              title: 'Products',
              links: [
                { label: 'npm: 0nmcp', url: 'https://www.npmjs.com/package/0nmcp' },
                { label: '0nmcp.com', url: 'https://0nmcp.com' },
                { label: '0nCore', url: 'https://0ncore.com' },
                { label: 'Marketplace', url: 'https://marketplace.rocketclients.com' },
                { label: '0nCommand', url: 'https://0n-command-center.vercel.app' },
              ],
            },
          ].map((group, gi) => (
            <div key={gi} style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--jp-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{group.title}</h4>
              <div style={{
                background: 'var(--jp-bg-card)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius)',
                overflow: 'hidden',
              }}>
                {group.links.map((link, li) => (
                  <a
                    key={li}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: li < group.links.length - 1 ? '1px solid var(--jp-border)' : 'none',
                      color: 'var(--jp-text-secondary)',
                      fontSize: 13,
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--jp-bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>{link.label}</span>
                    <svg width={14} height={14} fill="none" stroke="var(--jp-text-muted)" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'sitemaps' && (
        <div>
          {[
            {
              title: '0nCore Routes',
              routes: [
                '/dashboard',
                '/dashboard/contacts',
                '/dashboard/pipeline',
                '/dashboard/workflows',
                '/dashboard/training',
                '/dashboard/chat',
                '/dashboard/email',
                '/dashboard/social',
                '/dashboard/files',
                '/dashboard/calendar',
                '/dashboard/integrations',
                '/dashboard/invoices',
                '/dashboard/settings',
                '/dashboard/admin',
              ],
            },
            {
              title: '0nCore API Routes',
              routes: [
                '/api/admin',
                '/api/auth/callback',
                '/api/chat',
                '/api/crm/contacts',
                '/api/crm/conversations',
                '/api/crm/pipeline',
                '/api/crm/calendar',
                '/api/crm/invoices',
                '/api/dashboard/stats',
                '/api/health',
                '/api/provision',
                '/api/stripe',
                '/api/training',
                '/api/workflows',
                '/api/0nmcp/execute',
                '/api/0nmcp/health',
                '/api/0nmcp/workflows',
              ],
            },
            {
              title: '0nmcp.com Key Pages',
              routes: [
                '/',
                '/login',
                '/signup',
                '/forgot-password',
                '/reset-password',
                '/0nboarding',
                '/forum',
                '/forum/new',
                '/community',
                '/builder',
                '/store/onork-mini',
                '/convert',
                '/learn',
                '/downloads',
                '/examples',
                '/0n-standard',
                '/partners',
                '/sponsor',
                '/integrations',
                '/compare',
                '/glossary',
                '/turn-it-on',
                '/admin',
                '/app',
                '/products/social0n',
                '/products/app0n',
                '/products/web0n',
              ],
            },
            {
              title: 'Marketplace Routes',
              routes: [
                '/',
                '/login',
                '/register',
                '/store',
                '/store/[slug]',
                '/builder',
                '/dashboard',
                '/setup/[workflowId]',
                '/admin/setup',
                '/api/chat',
                '/api/execute',
                '/api/checkout',
                '/api/workflows',
                '/api/webhooks/stripe',
              ],
            },
          ].map((section, si) => (
            <div key={si} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--jp-text)', marginBottom: 12 }}>
                {section.title}
                <span style={{ color: 'var(--jp-text-muted)', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>({section.routes.length})</span>
              </h3>
              <div style={{
                background: 'var(--jp-bg-card)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius)',
                overflow: 'hidden',
              }}>
                {section.routes.map((route, ri) => (
                  <div
                    key={ri}
                    style={{
                      padding: '8px 16px',
                      borderBottom: ri < section.routes.length - 1 ? '1px solid var(--jp-border)' : 'none',
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: route.startsWith('/api') ? 'var(--jp-cyan)' : route.includes('[') ? 'var(--jp-purple)' : 'var(--jp-text-secondary)',
                    }}
                  >
                    {route}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
