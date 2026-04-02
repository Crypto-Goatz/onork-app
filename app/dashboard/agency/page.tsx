'use client'

import { useState, useEffect, useCallback } from 'react'

interface Location {
  id: string
  name: string
  email: string
  phone: string
  address: string
  website: string
  logoUrl: string
  contactCount: number
  settings: {
    timezone: string
    country: string
  }
}

interface LocationDetail {
  id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  postalCode: string
  website: string
  timezone: string
  settings?: any
}

interface Pipeline {
  id: string
  name: string
  stages: { id: string; name: string }[]
}

interface CRMUser {
  id: string
  name: string
  email: string
  role: string
  type: string
}

interface Calendar {
  id: string
  name: string
  description: string
}

type TabKey = 'overview' | 'locations' | 'workforce' | 'operations' | 'snapshots'

export default function AgencyCommandCenter() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  // Location detail state
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [locationDetail, setLocationDetail] = useState<LocationDetail | null>(null)
  const [locationPipelines, setLocationPipelines] = useState<Pipeline[]>([])
  const [locationUsers, setLocationUsers] = useState<CRMUser[]>([])
  const [locationCalendars, setLocationCalendars] = useState<Calendar[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Bulk ops state
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set())
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkLog, setBulkLog] = useState<string[]>([])

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/agency')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setLocations(data.locations || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  async function loadLocationDetail(locationId: string) {
    setSelectedLocation(locationId)
    setDetailLoading(true)
    setLocationDetail(null)
    setLocationPipelines([])
    setLocationUsers([])
    setLocationCalendars([])

    try {
      const [detailRes, pipelineRes, usersRes, calendarRes] = await Promise.all([
        fetch('/api/agency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_location_detail', locationId }),
        }),
        fetch('/api/agency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_pipelines', locationId }),
        }),
        fetch('/api/agency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_users', locationId }),
        }),
        fetch('/api/agency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_calendars', locationId }),
        }),
      ])

      if (detailRes.ok) {
        const d = await detailRes.json()
        setLocationDetail(d.location)
      }
      if (pipelineRes.ok) {
        const p = await pipelineRes.json()
        setLocationPipelines(p.pipelines || [])
      }
      if (usersRes.ok) {
        const u = await usersRes.json()
        setLocationUsers(u.users || [])
      }
      if (calendarRes.ok) {
        const c = await calendarRes.json()
        setLocationCalendars(c.calendars || [])
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDetailLoading(false)
    }
  }

  function toggleBulkSelect(id: string) {
    setBulkSelection(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllLocations() {
    if (bulkSelection.size === locations.length) {
      setBulkSelection(new Set())
    } else {
      setBulkSelection(new Set(locations.map(l => l.id)))
    }
  }

  async function runBulkTag(tagId: string) {
    if (bulkSelection.size === 0) return
    setBulkRunning(true)
    setBulkLog(prev => [...prev, `Tagging ${bulkSelection.size} locations with ${tagId}...`])

    try {
      const res = await fetch('/api/agency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_tag',
          locationIds: Array.from(bulkSelection),
          data: { tagId },
        }),
      })
      const data = await res.json()
      if (data.results) {
        for (const r of data.results) {
          const loc = locations.find(l => l.id === r.locationId)
          setBulkLog(prev => [...prev,
            r.success
              ? `${loc?.name || r.locationId}: Tagged ${r.tagged} contacts`
              : `${loc?.name || r.locationId}: Failed — ${r.error}`
          ])
        }
      }
      setBulkLog(prev => [...prev, 'Bulk operation complete.'])
    } catch (e: any) {
      setBulkLog(prev => [...prev, `Error: ${e.message}`])
    } finally {
      setBulkRunning(false)
    }
  }

  const totalContacts = locations.reduce((sum, l) => sum + l.contactCount, 0)

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '◎' },
    { key: 'locations', label: 'Locations', icon: '◉' },
    { key: 'workforce', label: 'Workforce', icon: '◈' },
    { key: 'operations', label: 'Bulk Ops', icon: '⚡' },
    { key: 'snapshots', label: 'Snapshots', icon: '◆' },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div className="jp-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="jp-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(110,224,90,0.15), rgba(0,212,255,0.10))',
              border: '1px solid rgba(110,224,90,0.25)',
              fontSize: 18,
            }}>⌘</span>
            Agency Command Center
          </h1>
          <p className="jp-page-subtitle">
            {loading ? 'Loading...' : `${locations.length} locations · ${totalContacts.toLocaleString()} contacts · Agency-level orchestration`}
          </p>
        </div>
        <button
          onClick={fetchLocations}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid var(--jp-border)',
            background: 'var(--jp-surface)',
            color: 'var(--jp-text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444',
          fontSize: '0.85rem',
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        marginBottom: 20,
        borderRadius: 12,
        background: 'var(--jp-surface)',
        border: '1px solid var(--jp-border)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === tab.key ? 'var(--jp-surface-elevated)' : 'transparent',
              color: activeTab === tab.key ? 'var(--jp-green)' : 'var(--jp-text-muted)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <span style={{ marginRight: 6 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'locations' && renderLocations()}
      {activeTab === 'workforce' && renderWorkforce()}
      {activeTab === 'operations' && renderOperations()}
      {activeTab === 'snapshots' && renderSnapshots()}

      {/* Location Detail Drawer */}
      {selectedLocation && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 480, maxWidth: '90vw',
          background: 'var(--jp-surface-elevated)',
          borderLeft: '1px solid var(--jp-border)',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.08)',
          zIndex: 1000,
          overflowY: 'auto',
          padding: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--jp-text)', margin: 0 }}>
              Location Details
            </h2>
            <button
              onClick={() => setSelectedLocation(null)}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--jp-border)',
                background: 'transparent',
                color: 'var(--jp-text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {detailLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--jp-text-muted)' }}>
              Loading location data...
            </div>
          ) : locationDetail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Info */}
              <div className="jp-card">
                <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--jp-text)', margin: 0 }}>
                    {locationDetail.name}
                  </h3>
                  {[
                    { label: 'ID', value: locationDetail.id },
                    { label: 'Email', value: locationDetail.email },
                    { label: 'Phone', value: locationDetail.phone },
                    { label: 'Website', value: locationDetail.website },
                    { label: 'Timezone', value: locationDetail.timezone },
                    { label: 'Address', value: [locationDetail.address, locationDetail.city, locationDetail.state, locationDetail.postalCode].filter(Boolean).join(', ') },
                  ].map(row => row.value ? (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--jp-text-muted)' }}>{row.label}</span>
                      <span style={{ color: 'var(--jp-text-secondary)', fontFamily: 'var(--jp-font-mono)', fontSize: '0.75rem', maxWidth: 260, textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Pipelines */}
              {locationPipelines.length > 0 && (
                <div className="jp-card">
                  <div className="jp-card-header"><h6>Pipelines ({locationPipelines.length})</h6></div>
                  <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {locationPipelines.map(p => (
                      <div key={p.id} style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'var(--jp-surface)',
                        border: '1px solid var(--jp-border)',
                      }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>{p.name}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {p.stages?.map((s: any) => (
                            <span key={s.id} style={{
                              padding: '2px 8px', borderRadius: 6,
                              background: 'rgba(110,224,90,0.08)',
                              border: '1px solid rgba(110,224,90,0.15)',
                              color: 'var(--jp-green)',
                              fontSize: '0.6875rem',
                            }}>{s.name}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Users */}
              {locationUsers.length > 0 && (
                <div className="jp-card">
                  <div className="jp-card-header"><h6>Users ({locationUsers.length})</h6></div>
                  <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {locationUsers.map(u => (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--jp-text)' }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>{u.email}</div>
                        </div>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6,
                          background: u.role === 'admin' ? 'rgba(167,139,250,0.10)' : 'rgba(0,212,255,0.08)',
                          color: u.role === 'admin' ? 'var(--jp-purple)' : 'var(--jp-cyan)',
                          fontSize: '0.6875rem', fontWeight: 600,
                        }}>{u.role || u.type || 'user'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendars */}
              {locationCalendars.length > 0 && (
                <div className="jp-card">
                  <div className="jp-card-header"><h6>Calendars ({locationCalendars.length})</h6></div>
                  <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {locationCalendars.map(c => (
                      <div key={c.id} style={{ fontSize: '0.8125rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--jp-text)' }}>{c.name}</div>
                        {c.description && <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>{c.description}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--jp-text-muted)' }}>
              No detail available
            </div>
          )}
        </div>
      )}

      {/* Backdrop for drawer */}
      {selectedLocation && (
        <div
          onClick={() => setSelectedLocation(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.2)',
            zIndex: 999,
          }}
        />
      )}
    </div>
  )

  // ── Tab: Overview ─────────────────────────────────────────
  function renderOverview() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Stats Grid */}
        <div className="jp-stat-grid">
          {[
            { label: 'Locations', value: locations.length.toString(), change: 'Active', colorClass: 'green', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg> },
            { label: 'Total Contacts', value: totalContacts.toLocaleString(), change: 'Synced', colorClass: 'cyan', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
            { label: '0nMCP Tools', value: '1,183', change: '99 Services', colorClass: 'purple', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg> },
            { label: 'Patents', value: '5', change: 'Filed', colorClass: 'amber', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg> },
          ].map(card => (
            <div key={card.label} className={`jp-stat-card ${card.colorClass}`}>
              <div className="jp-stat-header">
                <span className="jp-stat-label">{card.label}</span>
                <div className={`jp-stat-icon ${card.colorClass}`}>{card.icon}</div>
              </div>
              <div className="jp-stat-value">{card.value}</div>
              <span className="jp-stat-change up">{card.change}</span>
            </div>
          ))}
        </div>

        {/* Location Grid */}
        <div className="jp-card">
          <div className="jp-card-header">
            <h6>All Sub-Locations</h6>
            <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>{locations.length} total</span>
          </div>
          <div className="jp-card-body">
            {loading ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--jp-text-muted)' }}>Loading locations...</div>
            ) : locations.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--jp-text-muted)' }}>No locations found. Check Agency PIT configuration.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {locations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => loadLocationDetail(loc.id)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: '1px solid var(--jp-border)',
                      background: 'var(--jp-surface)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--jp-text)', marginBottom: 4 }}>{loc.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>{loc.email}</div>
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6,
                        background: 'rgba(0,212,255,0.08)',
                        color: 'var(--jp-cyan)',
                        fontSize: '0.6875rem', fontWeight: 700,
                      }}>
                        {loc.contactCount.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)', marginTop: 6, fontFamily: 'var(--jp-font-mono)' }}>
                      {loc.id.slice(0, 20)}...
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Access */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="jp-card">
            <div className="jp-card-header"><h6>Ecosystem Products</h6></div>
            <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { name: '0nMCP', desc: 'Universal AI API Orchestrator', status: 'v2.9.0', color: 'var(--jp-green)' },
                { name: '0nCore', desc: 'AI-Powered CRM', status: 'Live', color: 'var(--jp-cyan)' },
                { name: '0nAI', desc: 'Command Center', status: 'Live', color: 'var(--jp-purple)' },
                { name: '0nmcp.com', desc: 'Marketing + Community', status: '824+ pages', color: 'var(--jp-amber)' },
                { name: 'Marketplace', desc: 'Workflow Store', status: 'Live', color: 'var(--jp-green)' },
                { name: '0nDefender', desc: 'Security & Patents', status: '5 Patents', color: '#ef4444' },
              ].map(p => (
                <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--jp-border)' }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--jp-text-muted)' }}>{p.desc}</div>
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: p.color }}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="jp-card">
            <div className="jp-card-header"><h6>Recent Activity</h6></div>
            <ul className="jp-activity-list">
              {[
                { text: 'Agency PIT connected', meta: 'All sub-locations accessible', time: 'Now', dot: 'green' },
                { text: 'Patent #5 filed', meta: 'Knowledge Layers — #64/024,736', time: 'Apr 1', dot: 'purple' },
                { text: '0nDefender deployed', meta: '0nWatch + 0nSeal + 0nAlert active', time: 'Apr 1', dot: 'cyan' },
                { text: '0nmcp.com redesign', meta: '824+ pages, SXO Living DOM', time: 'Mar 31', dot: 'amber' },
                { text: 'WordPress deployed', meta: 'The Spa In Ligonier on WP Engine', time: 'Mar 31', dot: 'green' },
              ].map((item, i) => (
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
      </div>
    )
  }

  // ── Tab: Locations ────────────────────────────────────────
  function renderLocations() {
    return (
      <div className="jp-card">
        <div className="jp-card-header">
          <h6>All CRM Locations</h6>
          <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>Click to inspect</span>
        </div>
        <div className="jp-card-body" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--jp-border)' }}>
                {['Name', 'Email', 'Phone', 'Contacts', 'Timezone', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--jp-text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locations.map(loc => (
                <tr key={loc.id} style={{ borderBottom: '1px solid var(--jp-border)', cursor: 'pointer' }} onClick={() => loadLocationDetail(loc.id)}>
                  <td style={{ padding: '10px', fontWeight: 600, color: 'var(--jp-text)' }}>{loc.name}</td>
                  <td style={{ padding: '10px', color: 'var(--jp-text-secondary)' }}>{loc.email}</td>
                  <td style={{ padding: '10px', color: 'var(--jp-text-secondary)' }}>{loc.phone || '—'}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6,
                      background: 'rgba(0,212,255,0.08)',
                      color: 'var(--jp-cyan)',
                      fontSize: '0.75rem', fontWeight: 700,
                    }}>{loc.contactCount.toLocaleString()}</span>
                  </td>
                  <td style={{ padding: '10px', color: 'var(--jp-text-muted)', fontSize: '0.75rem' }}>{loc.settings?.timezone || '—'}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ color: 'var(--jp-green)', fontSize: '0.75rem' }}>→</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {locations.length === 0 && !loading && (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--jp-text-muted)' }}>No locations found</div>
          )}
        </div>
      </div>
    )
  }

  // ── Tab: Workforce ────────────────────────────────────────
  function renderWorkforce() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="jp-card">
          <div className="jp-card-header"><h6>Workforce — Select a Location</h6></div>
          <div className="jp-card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => loadLocationDetail(loc.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: selectedLocation === loc.id ? '1px solid var(--jp-green-dim)' : '1px solid var(--jp-border)',
                    background: selectedLocation === loc.id ? 'var(--jp-green-glow)' : 'var(--jp-surface)',
                    color: selectedLocation === loc.id ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedLocation && !detailLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="jp-card">
              <div className="jp-card-header"><h6>Users</h6></div>
              <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {locationUsers.length === 0 ? (
                  <div style={{ color: 'var(--jp-text-muted)', fontSize: '0.8125rem' }}>No users found</div>
                ) : locationUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--jp-border)' }}>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>{u.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--jp-text-muted)' }}>{u.email}</div>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6,
                      background: u.role === 'admin' ? 'rgba(167,139,250,0.10)' : 'rgba(0,212,255,0.08)',
                      color: u.role === 'admin' ? 'var(--jp-purple)' : 'var(--jp-cyan)',
                      fontSize: '0.6875rem', fontWeight: 600,
                    }}>{u.role || 'user'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="jp-card">
              <div className="jp-card-header"><h6>Calendars</h6></div>
              <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {locationCalendars.length === 0 ? (
                  <div style={{ color: 'var(--jp-text-muted)', fontSize: '0.8125rem' }}>No calendars found</div>
                ) : locationCalendars.map(c => (
                  <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--jp-border)' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>{c.name}</div>
                    {c.description && <div style={{ fontSize: '0.7rem', color: 'var(--jp-text-muted)' }}>{c.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {detailLoading && (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--jp-text-muted)' }}>Loading workforce data...</div>
        )}
      </div>
    )
  }

  // ── Tab: Bulk Ops ─────────────────────────────────────────
  function renderOperations() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="jp-card">
          <div className="jp-card-header">
            <h6>Bulk Operations</h6>
            <button
              onClick={selectAllLocations}
              style={{
                padding: '4px 12px', borderRadius: 6,
                border: '1px solid var(--jp-border)',
                background: bulkSelection.size === locations.length ? 'var(--jp-green-glow)' : 'transparent',
                color: bulkSelection.size === locations.length ? 'var(--jp-green)' : 'var(--jp-text-muted)',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {bulkSelection.size === locations.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="jp-card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => toggleBulkSelect(loc.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: bulkSelection.has(loc.id) ? '1px solid var(--jp-green-dim)' : '1px solid var(--jp-border)',
                    background: bulkSelection.has(loc.id) ? 'var(--jp-green-glow)' : 'transparent',
                    color: bulkSelection.has(loc.id) ? 'var(--jp-green)' : 'var(--jp-text-muted)',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {bulkSelection.has(loc.id) ? '✓' : '○'} {loc.name}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)', marginBottom: 12 }}>
              {bulkSelection.size} location{bulkSelection.size !== 1 ? 's' : ''} selected
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: 'Tag: 0nmcp-connected', tagId: '0nmcp-connected', color: 'var(--jp-green)' },
                { label: 'Tag: vip-access', tagId: 'vip-access', color: 'var(--jp-purple)' },
                { label: 'Tag: newsletter-signup', tagId: 'newsletter-signup', color: 'var(--jp-cyan)' },
              ].map(a => (
                <button
                  key={a.tagId}
                  onClick={() => runBulkTag(a.tagId)}
                  disabled={bulkRunning || bulkSelection.size === 0}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: `1px solid ${a.color}33`,
                    background: `${a.color}10`,
                    color: a.color,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: bulkRunning || bulkSelection.size === 0 ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: bulkRunning || bulkSelection.size === 0 ? 0.5 : 1,
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Operation Log */}
        {bulkLog.length > 0 && (
          <div className="jp-card">
            <div className="jp-card-header">
              <h6>Operation Log</h6>
              <button
                onClick={() => setBulkLog([])}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: '1px solid var(--jp-border)',
                  background: 'transparent',
                  color: 'var(--jp-text-muted)',
                  fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Clear
              </button>
            </div>
            <div className="jp-card-body" style={{
              maxHeight: 300, overflowY: 'auto',
              fontFamily: 'var(--jp-font-mono)',
              fontSize: '0.75rem',
              color: 'var(--jp-text-secondary)',
            }}>
              {bulkLog.map((line, i) => (
                <div key={i} style={{
                  padding: '4px 0',
                  borderBottom: '1px solid var(--jp-border)',
                  color: line.includes('Error') || line.includes('Failed') ? '#ef4444' :
                    line.includes('complete') ? 'var(--jp-green)' : undefined,
                }}>
                  <span style={{ color: 'var(--jp-text-muted)', marginRight: 8 }}>[{String(i + 1).padStart(2, '0')}]</span>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Tab: Snapshots ────────────────────────────────────────
  function renderSnapshots() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="jp-card">
          <div className="jp-card-header"><h6>Vault Snapshots</h6></div>
          <div className="jp-card-body">
            <p style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)', marginBottom: 16 }}>
              Deploy Vault Data snapshots across locations. Each snapshot captures tags, custom values, pipelines, and workflow configurations from a source location and replicates them to target locations.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                {
                  name: '0nMCP Standard',
                  desc: '18 tags, 8 custom values, pipeline stages, webhook handlers',
                  locations: '→ All locations',
                  status: 'Ready',
                },
                {
                  name: 'Spa Package',
                  desc: 'Spa-specific tags, MassageBook, seasonal campaigns',
                  locations: '→ Spa locations',
                  status: 'Ready',
                },
                {
                  name: 'Agency Starter',
                  desc: 'Default pipeline, onboarding workflow, 0nMCP connection tag',
                  locations: '→ New locations',
                  status: 'Ready',
                },
              ].map(snap => (
                <div key={snap.name} style={{
                  padding: 16,
                  borderRadius: 10,
                  border: '1px solid var(--jp-border)',
                  background: 'var(--jp-surface)',
                }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--jp-text)', marginBottom: 4 }}>{snap.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)', marginBottom: 8, lineHeight: 1.5 }}>{snap.desc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>{snap.locations}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6,
                      background: 'rgba(110,224,90,0.08)',
                      color: 'var(--jp-green)',
                      fontSize: '0.6875rem', fontWeight: 600,
                    }}>{snap.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Known PITs */}
        <div className="jp-card">
          <div className="jp-card-header"><h6>Known PIT Tokens</h6></div>
          <div className="jp-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Agency PIT', id: process.env.NEXT_PUBLIC_CRM_AGENCY_PIT ? 'Connected' : 'pit-e789...a316', scope: 'All Locations', color: 'var(--jp-green)' },
                { label: '0nMCP Sub-location', id: 'pit-bd4e...2675', scope: 'nphConTwfHcVE1oA0uep', color: 'var(--jp-cyan)' },
                { label: 'Spa Ligonier', id: 'pit-8860...5e44', scope: 'F76MNKOMQCMruMrumtdf', color: 'var(--jp-purple)' },
              ].map(pit => (
                <div key={pit.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 8,
                  background: 'var(--jp-surface)',
                  border: '1px solid var(--jp-border)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>{pit.label}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)', fontFamily: 'var(--jp-font-mono)' }}>{pit.scope}</div>
                  </div>
                  <span style={{
                    padding: '2px 10px', borderRadius: 6,
                    background: `${pit.color}15`,
                    color: pit.color,
                    fontSize: '0.6875rem', fontWeight: 600,
                    fontFamily: 'var(--jp-font-mono)',
                  }}>{pit.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
