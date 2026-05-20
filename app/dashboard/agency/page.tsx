'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Users,
  Puzzle,
  ShieldCheck,
  RefreshCw,
  LayoutDashboard,
  MapPin,
  Briefcase,
  Zap,
  Archive,
  X,
  ChevronRight,
  Check,
  Circle,
} from 'lucide-react'

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

  const tabs: { key: TabKey; label: string; Icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { key: 'locations', label: 'Locations', Icon: MapPin },
    { key: 'workforce', label: 'Workforce', Icon: Briefcase },
    { key: 'operations', label: 'Bulk Ops', Icon: Zap },
    { key: 'snapshots', label: 'Snapshots', Icon: Archive },
  ]

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="jp-page-header flex items-center justify-between">
        <div>
          <h1 className="jp-page-title flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-[10px] bg-gradient-to-br from-core-green/15 to-core-cyan/10 border border-core-green/25 text-lg">
              <Building2 className="w-5 h-5 text-core-green" />
            </span>
            Agency Command Center
          </h1>
          <p className="jp-page-subtitle">
            {loading ? 'Loading...' : `${locations.length} locations · ${totalContacts.toLocaleString()} contacts · Agency-level orchestration`}
          </p>
        </div>
        <button
          onClick={fetchLocations}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-core-border bg-core-surface text-core-text-dim text-xs font-semibold cursor-pointer transition-opacity disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-[10px] bg-core-red/8 border border-core-red/20 text-core-red text-sm mb-4">
          {error}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 mb-5 rounded-xl bg-core-surface border border-core-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border-none text-[0.8125rem] font-semibold cursor-pointer transition-all duration-150',
              activeTab === tab.key
                ? 'bg-core-card text-core-green shadow-sm'
                : 'bg-transparent text-core-text-muted',
            ].join(' ')}
          >
            <tab.Icon className="w-3.5 h-3.5" />
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
        <div className="fixed top-0 right-0 bottom-0 w-[480px] max-w-[90vw] bg-core-card border-l border-core-border shadow-[-8px_0_30px_rgba(0,0,0,0.08)] z-[1000] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-[1.1rem] font-bold text-core-text m-0">
              Location Details
            </h2>
            <button
              onClick={() => setSelectedLocation(null)}
              className="w-8 h-8 rounded-lg border border-core-border bg-transparent text-core-text-muted cursor-pointer text-base flex items-center justify-center hover:bg-core-card-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {detailLoading ? (
            <div className="py-10 text-center text-core-text-muted">
              Loading location data...
            </div>
          ) : locationDetail ? (
            <div className="flex flex-col gap-4">
              {/* Info */}
              <div className="jp-card">
                <div className="jp-card-body flex flex-col gap-2.5">
                  <h3 className="text-base font-bold text-core-text m-0">
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
                    <div key={row.label} className="flex justify-between text-[0.8125rem]">
                      <span className="text-core-text-muted">{row.label}</span>
                      <span className="text-core-text-dim font-mono text-xs max-w-[260px] text-right break-all">{row.value}</span>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Pipelines */}
              {locationPipelines.length > 0 && (
                <div className="jp-card">
                  <div className="jp-card-header"><h6>Pipelines ({locationPipelines.length})</h6></div>
                  <div className="jp-card-body flex flex-col gap-2">
                    {locationPipelines.map(p => (
                      <div key={p.id} className="px-3 py-2.5 rounded-lg bg-core-surface border border-core-border">
                        <div className="text-[0.8125rem] font-semibold text-core-text">{p.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.stages?.map((s: any) => (
                            <span key={s.id} className="px-2 py-0.5 rounded-md bg-core-green/8 border border-core-green/15 text-core-green text-[0.6875rem]">
                              {s.name}
                            </span>
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
                  <div className="jp-card-body flex flex-col gap-1.5">
                    {locationUsers.map(u => (
                      <div key={u.id} className="flex justify-between items-center text-[0.8125rem]">
                        <div>
                          <div className="font-semibold text-core-text">{u.name}</div>
                          <div className="text-xs text-core-text-muted">{u.email}</div>
                        </div>
                        <span className={[
                          'px-2 py-0.5 rounded-md text-[0.6875rem] font-semibold',
                          u.role === 'admin'
                            ? 'bg-core-purple/10 text-core-purple'
                            : 'bg-core-cyan/8 text-core-cyan',
                        ].join(' ')}>
                          {u.role || u.type || 'user'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendars */}
              {locationCalendars.length > 0 && (
                <div className="jp-card">
                  <div className="jp-card-header"><h6>Calendars ({locationCalendars.length})</h6></div>
                  <div className="jp-card-body flex flex-col gap-1.5">
                    {locationCalendars.map(c => (
                      <div key={c.id} className="text-[0.8125rem]">
                        <div className="font-semibold text-core-text">{c.name}</div>
                        {c.description && <div className="text-xs text-core-text-muted">{c.description}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-core-text-muted">
              No detail available
            </div>
          )}
        </div>
      )}

      {/* Backdrop for drawer */}
      {selectedLocation && (
        <div
          onClick={() => setSelectedLocation(null)}
          className="fixed inset-0 bg-black/20 z-[999]"
        />
      )}
    </div>
  )

  // ── Tab: Overview ─────────────────────────────────────────
  function renderOverview() {
    return (
      <div className="flex flex-col gap-4">
        {/* Stats Grid */}
        <div className="jp-stat-grid">
          {[
            { label: 'Locations', value: locations.length.toString(), change: 'Active', colorClass: 'green', Icon: Building2 },
            { label: 'Total Contacts', value: totalContacts.toLocaleString(), change: 'Synced', colorClass: 'cyan', Icon: Users },
            { label: '0nMCP Tools', value: '1,183', change: '99 Services', colorClass: 'purple', Icon: Puzzle },
            { label: 'Patents', value: '5', change: 'Filed', colorClass: 'amber', Icon: ShieldCheck },
          ].map(card => (
            <div key={card.label} className={`jp-stat-card ${card.colorClass}`}>
              <div className="jp-stat-header">
                <span className="jp-stat-label">{card.label}</span>
                <div className={`jp-stat-icon ${card.colorClass}`}>
                  <card.Icon className="w-4 h-4" />
                </div>
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
            <span className="text-xs text-core-text-muted">{locations.length} total</span>
          </div>
          <div className="jp-card-body">
            {loading ? (
              <div className="py-8 text-center text-core-text-muted">Loading locations...</div>
            ) : locations.length === 0 ? (
              <div className="py-8 text-center text-core-text-muted">No locations found. Check Agency PIT configuration.</div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {locations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => loadLocationDetail(loc.id)}
                    className="p-[14px_16px] rounded-[10px] border border-core-border bg-core-surface cursor-pointer text-left transition-all duration-150 hover:border-core-border-hi hover:bg-core-card-hover"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-core-text mb-1">{loc.name}</div>
                        <div className="text-xs text-core-text-muted">{loc.email}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-core-cyan/8 text-core-cyan text-[0.6875rem] font-bold">
                        {loc.contactCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[0.6875rem] text-core-text-muted mt-1.5 font-mono">
                      {loc.id.slice(0, 20)}...
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Access */}
        <div className="grid grid-cols-2 gap-4">
          <div className="jp-card">
            <div className="jp-card-header"><h6>Ecosystem Products</h6></div>
            <div className="jp-card-body flex flex-col gap-2">
              {[
                { name: '0nMCP', desc: 'Universal AI API Orchestrator', status: 'v4.5.0', colorClass: 'text-core-green' },
                { name: '0nCore', desc: 'AI-Powered CRM', status: 'Live', colorClass: 'text-core-cyan' },
                { name: '0nAI', desc: 'Command Center', status: 'Live', colorClass: 'text-core-purple' },
                { name: '0nmcp.com', desc: 'Marketing + Community', status: '824+ pages', colorClass: 'text-core-amber' },
                { name: 'Marketplace', desc: 'Workflow Store', status: 'Live', colorClass: 'text-core-green' },
                { name: '0nDefender', desc: 'Security & Patents', status: '5 Patents', colorClass: 'text-core-red' },
              ].map(p => (
                <div key={p.name} className="flex justify-between items-center py-2 border-b border-core-border last:border-b-0">
                  <div>
                    <div className="text-[0.8125rem] font-semibold text-core-text">{p.name}</div>
                    <div className="text-[0.7rem] text-core-text-muted">{p.desc}</div>
                  </div>
                  <span className={`text-[0.6875rem] font-bold ${p.colorClass}`}>{p.status}</span>
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
                { text: 'WordPress deployed', meta: 'Client WP Engine deploy', time: 'Mar 31', dot: 'green' },
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
          <span className="text-xs text-core-text-muted">Click to inspect</span>
        </div>
        <div className="jp-card-body overflow-auto">
          <table className="w-full border-collapse text-[0.8125rem]">
            <thead>
              <tr className="border-b border-core-border">
                {['Name', 'Email', 'Phone', 'Contacts', 'Timezone', ''].map(h => (
                  <th key={h} className="px-2.5 py-2 text-left text-core-text-muted text-xs font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locations.map(loc => (
                <tr
                  key={loc.id}
                  className="border-b border-core-border cursor-pointer hover:bg-core-card-hover transition-colors"
                  onClick={() => loadLocationDetail(loc.id)}
                >
                  <td className="px-2.5 py-2.5 font-semibold text-core-text">{loc.name}</td>
                  <td className="px-2.5 py-2.5 text-core-text-dim">{loc.email}</td>
                  <td className="px-2.5 py-2.5 text-core-text-dim">{loc.phone || '—'}</td>
                  <td className="px-2.5 py-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-core-cyan/8 text-core-cyan text-xs font-bold">
                      {loc.contactCount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-2.5 py-2.5 text-core-text-muted text-xs">{loc.settings?.timezone || '—'}</td>
                  <td className="px-2.5 py-2.5">
                    <ChevronRight className="w-3.5 h-3.5 text-core-green" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {locations.length === 0 && !loading && (
            <div className="py-8 text-center text-core-text-muted">No locations found</div>
          )}
        </div>
      </div>
    )
  }

  // ── Tab: Workforce ────────────────────────────────────────
  function renderWorkforce() {
    return (
      <div className="flex flex-col gap-4">
        <div className="jp-card">
          <div className="jp-card-header"><h6>Workforce — Select a Location</h6></div>
          <div className="jp-card-body">
            <div className="flex flex-wrap gap-2">
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => loadLocationDetail(loc.id)}
                  className={[
                    'px-3.5 py-2 rounded-lg text-[0.8rem] font-semibold cursor-pointer transition-all duration-150',
                    selectedLocation === loc.id
                      ? 'border border-core-green-dim bg-core-green/8 text-core-green'
                      : 'border border-core-border bg-core-surface text-core-text-dim',
                  ].join(' ')}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedLocation && !detailLoading && (
          <div className="grid grid-cols-2 gap-4">
            <div className="jp-card">
              <div className="jp-card-header"><h6>Users</h6></div>
              <div className="jp-card-body flex flex-col gap-2">
                {locationUsers.length === 0 ? (
                  <div className="text-core-text-muted text-[0.8125rem]">No users found</div>
                ) : locationUsers.map(u => (
                  <div key={u.id} className="flex justify-between items-center py-2 border-b border-core-border last:border-b-0">
                    <div>
                      <div className="text-[0.8125rem] font-semibold text-core-text">{u.name}</div>
                      <div className="text-[0.7rem] text-core-text-muted">{u.email}</div>
                    </div>
                    <span className={[
                      'px-2 py-0.5 rounded-md text-[0.6875rem] font-semibold',
                      u.role === 'admin'
                        ? 'bg-core-purple/10 text-core-purple'
                        : 'bg-core-cyan/8 text-core-cyan',
                    ].join(' ')}>
                      {u.role || 'user'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="jp-card">
              <div className="jp-card-header"><h6>Calendars</h6></div>
              <div className="jp-card-body flex flex-col gap-2">
                {locationCalendars.length === 0 ? (
                  <div className="text-core-text-muted text-[0.8125rem]">No calendars found</div>
                ) : locationCalendars.map(c => (
                  <div key={c.id} className="py-2 border-b border-core-border last:border-b-0">
                    <div className="text-[0.8125rem] font-semibold text-core-text">{c.name}</div>
                    {c.description && <div className="text-[0.7rem] text-core-text-muted">{c.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {detailLoading && (
          <div className="py-8 text-center text-core-text-muted">Loading workforce data...</div>
        )}
      </div>
    )
  }

  // ── Tab: Bulk Ops ─────────────────────────────────────────
  function renderOperations() {
    return (
      <div className="flex flex-col gap-4">
        <div className="jp-card">
          <div className="jp-card-header">
            <h6>Bulk Operations</h6>
            <button
              onClick={selectAllLocations}
              className={[
                'px-3 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-all',
                bulkSelection.size === locations.length
                  ? 'border-core-border bg-core-green/8 text-core-green'
                  : 'border-core-border bg-transparent text-core-text-muted',
              ].join(' ')}
            >
              {bulkSelection.size === locations.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="jp-card-body">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => toggleBulkSelect(loc.id)}
                  className={[
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all',
                    bulkSelection.has(loc.id)
                      ? 'border border-core-green-dim bg-core-green/8 text-core-green'
                      : 'border border-core-border bg-transparent text-core-text-muted',
                  ].join(' ')}
                >
                  {bulkSelection.has(loc.id)
                    ? <Check className="w-3 h-3" />
                    : <Circle className="w-3 h-3" />
                  }
                  {loc.name}
                </button>
              ))}
            </div>

            <div className="text-[0.8125rem] text-core-text-dim mb-3">
              {bulkSelection.size} location{bulkSelection.size !== 1 ? 's' : ''} selected
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Tag: 0nmcp-connected', tagId: '0nmcp-connected', cls: 'border-core-green/20 bg-core-green/10 text-core-green' },
                { label: 'Tag: vip-access', tagId: 'vip-access', cls: 'border-core-purple/20 bg-core-purple/10 text-core-purple' },
                { label: 'Tag: newsletter-signup', tagId: 'newsletter-signup', cls: 'border-core-cyan/20 bg-core-cyan/10 text-core-cyan' },
              ].map(a => (
                <button
                  key={a.tagId}
                  onClick={() => runBulkTag(a.tagId)}
                  disabled={bulkRunning || bulkSelection.size === 0}
                  className={[
                    'px-4 py-2 rounded-lg border text-[0.8rem] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                    a.cls,
                  ].join(' ')}
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
                className="px-2.5 py-1 rounded-md border border-core-border bg-transparent text-core-text-muted text-[0.7rem] cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="jp-card-body max-h-[300px] overflow-y-auto font-mono text-xs text-core-text-dim">
              {bulkLog.map((line, i) => (
                <div
                  key={i}
                  className={[
                    'py-1 border-b border-core-border',
                    line.includes('Error') || line.includes('Failed')
                      ? 'text-core-red'
                      : line.includes('complete')
                        ? 'text-core-green'
                        : '',
                  ].join(' ')}
                >
                  <span className="text-core-text-muted mr-2">[{String(i + 1).padStart(2, '0')}]</span>
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
      <div className="flex flex-col gap-4">
        <div className="jp-card">
          <div className="jp-card-header"><h6>Vault Snapshots</h6></div>
          <div className="jp-card-body">
            <p className="text-[0.8125rem] text-core-text-dim mb-4 leading-relaxed">
              Deploy Vault Data snapshots across locations. Each snapshot captures tags, custom values, pipelines, and workflow configurations from a source location and replicates them to target locations.
            </p>

            <div className="grid grid-cols-3 gap-3">
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
                <div key={snap.name} className="p-4 rounded-[10px] border border-core-border bg-core-surface">
                  <div className="text-sm font-bold text-core-text mb-1">{snap.name}</div>
                  <div className="text-xs text-core-text-muted mb-2 leading-relaxed">{snap.desc}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.6875rem] text-core-text-muted">{snap.locations}</span>
                    <span className="px-2 py-0.5 rounded-md bg-core-green/8 text-core-green text-[0.6875rem] font-semibold">
                      {snap.status}
                    </span>
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
            <div className="flex flex-col gap-2">
              {[
                { label: 'Agency PIT', id: process.env.NEXT_PUBLIC_CRM_AGENCY_PIT ? 'Connected' : 'pit-e789...a316', scope: 'All Locations', colorClass: 'bg-core-green/15 text-core-green border-core-green/20' },
                { label: '0nMCP Sub-location', id: 'pit-bd4e...2675', scope: 'nphConTwfHcVE1oA0uep', colorClass: 'bg-core-cyan/15 text-core-cyan border-core-cyan/20' },
                { label: 'Client Sub-location', id: 'pit-•••5e44', scope: '•••mtdf', colorClass: 'bg-core-purple/15 text-core-purple border-core-purple/20' },
              ].map(pit => (
                <div key={pit.label} className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-core-surface border border-core-border">
                  <div>
                    <div className="text-[0.8125rem] font-semibold text-core-text">{pit.label}</div>
                    <div className="text-[0.6875rem] text-core-text-muted font-mono">{pit.scope}</div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-md border text-[0.6875rem] font-semibold font-mono ${pit.colorClass}`}>
                    {pit.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
