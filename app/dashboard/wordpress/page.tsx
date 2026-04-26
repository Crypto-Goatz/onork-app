'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Globe,
  Server,
  RefreshCw,
  Play,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Code,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

/* ---------- types ---------- */

interface ConnectedService {
  id: string
  user_id: string
  site_id: string
  service_type: string
  site_url: string
  site_name: string | null
  mcp_endpoint: string | null
  wp_version: string | null
  plugin_version: string | null
  tools: string[]
  status: string
  last_seen_at: string | null
  created_at: string
}

type PageState = 'loading' | 'ready' | 'error'

/* ---------- helpers ---------- */

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function healthBadge(status: string, lastSeen: string | null) {
  if (status === 'disconnected') {
    return { label: 'Disconnected', color: 'text-red-400 bg-red-400/10 border-red-400/20' }
  }
  if (!lastSeen) {
    return { label: 'Unknown', color: 'text-white/40 bg-white/[0.04] border-white/[0.08]' }
  }
  const diff = Date.now() - new Date(lastSeen).getTime()
  if (diff < 5 * 60 * 1000) {
    return { label: 'Healthy', color: 'text-[#7ed957] bg-[#7ed957]/10 border-[#7ed957]/20' }
  }
  if (diff < 30 * 60 * 1000) {
    return { label: 'Idle', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' }
  }
  return { label: 'Stale', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' }
}

/* ---------- component ---------- */

export default function WordPressPage() {
  const [sites, setSites] = useState<ConnectedService[]>([])
  const [state, setState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Execute tool modal
  const [execModal, setExecModal] = useState<ConnectedService | null>(null)
  const [execTool, setExecTool] = useState('')
  const [execInput, setExecInput] = useState('{}')
  const [execResult, setExecResult] = useState<string | null>(null)
  const [execLoading, setExecLoading] = useState(false)
  const [execError, setExecError] = useState<string | null>(null)

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch('/api/services/list?type=connected')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load (${res.status})`)
      }
      const data = await res.json()
      setSites(data.services || [])
      setState('ready')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load services')
      setState('error')
    }
  }, [])

  useEffect(() => {
    fetchSites()
  }, [fetchSites])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchSites()
    setRefreshing(false)
  }

  function openExecModal(site: ConnectedService) {
    setExecModal(site)
    setExecTool(site.tools?.[0] || '')
    setExecInput('{}')
    setExecResult(null)
    setExecError(null)
  }

  async function handleExecute() {
    if (!execModal?.mcp_endpoint || !execTool) return

    setExecLoading(true)
    setExecResult(null)
    setExecError(null)

    try {
      let parsedInput: unknown
      try {
        parsedInput = JSON.parse(execInput)
      } catch {
        throw new Error('Invalid JSON input')
      }

      const res = await fetch(execModal.mcp_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: execTool, input: parsedInput }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `Execution failed (${res.status})`)
      }

      setExecResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setExecError(err instanceof Error ? err.message : 'Execution failed')
    } finally {
      setExecLoading(false)
    }
  }

  const wpSites = sites.filter(s => s.service_type === 'wordpress')

  /* ---------- loading ---------- */
  if (state === 'loading') {
    return (
      <div className="max-w-[1100px] mx-auto px-2">
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-[#7ed957] animate-spin mb-4" />
          <p className="text-sm text-white/40">Loading connected sites...</p>
        </div>
      </div>
    )
  }

  /* ---------- error ---------- */
  if (state === 'error') {
    return (
      <div className="max-w-[1100px] mx-auto px-2">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-10 py-16 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-sm text-white/60 mb-2">Failed to load services</p>
          <p className="text-xs text-white/30 mb-6">{errorMsg}</p>
          <button
            onClick={() => { setState('loading'); fetchSites() }}
            className="px-5 py-2.5 bg-white/[0.06] border border-white/[0.1] text-white/70 text-sm rounded-xl cursor-pointer hover:bg-white/[0.08] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  /* ---------- ready ---------- */
  return (
    <div className="max-w-[1100px] mx-auto px-2">

      {/* Execute Tool Modal */}
      {execModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setExecModal(null)}
        >
          <div
            className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-7 max-w-[560px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-[#7ed957]" />
                Execute Tool
              </h2>
              <button
                onClick={() => setExecModal(null)}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 cursor-pointer hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/40 mb-4">
              {execModal.site_name || execModal.site_url}
            </p>

            {/* Tool select */}
            <label className="block mb-4">
              <span className="block text-[11px] font-semibold text-white/40 uppercase tracking-wide mb-1.5">
                Tool
              </span>
              <select
                value={execTool}
                onChange={e => setExecTool(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm outline-none appearance-none cursor-pointer"
              >
                {(!execModal.tools || execModal.tools.length === 0) ? (
                  <option value="">No tools available</option>
                ) : (
                  execModal.tools.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))
                )}
              </select>
            </label>

            {/* Input JSON */}
            <label className="block mb-5">
              <span className="block text-[11px] font-semibold text-white/40 uppercase tracking-wide mb-1.5">
                Input (JSON)
              </span>
              <textarea
                value={execInput}
                onChange={e => setExecInput(e.target.value)}
                rows={5}
                className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm font-mono outline-none resize-y"
                placeholder='{ "key": "value" }'
              />
            </label>

            {/* Execute button */}
            <button
              onClick={handleExecute}
              disabled={execLoading || !execTool || !execModal.mcp_endpoint}
              className="w-full py-3 bg-[#7ed957] text-black font-bold text-sm rounded-xl border-none cursor-pointer hover:bg-[#6ec847] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {execLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Execute
                </>
              )}
            </button>

            {!execModal.mcp_endpoint && (
              <p className="text-xs text-red-400/70 mt-2 text-center">
                No MCP endpoint registered for this site
              </p>
            )}

            {/* Result */}
            {execError && (
              <div className="mt-4 p-4 rounded-xl bg-red-400/5 border border-red-400/10">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-semibold text-red-400">Error</span>
                </div>
                <p className="text-xs text-red-400/70">{execError}</p>
              </div>
            )}

            {execResult && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-[#7ed957]" />
                  <span className="text-xs font-semibold text-[#7ed957]">Result</span>
                </div>
                <pre className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/70 font-mono overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                  {execResult}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white m-0 flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#7ed957]" />
            WordPress Sites
            {wpSites.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7ed957]/10 text-[#7ed957] border border-[#7ed957]/20">
                {wpSites.filter(s => s.status === 'active').length} ACTIVE
              </span>
            )}
          </h1>
          <p className="text-[13px] text-white/40 mt-1">
            Sites registered via the 0nCore WordPress plugin
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] text-white/60 text-[13px] rounded-xl cursor-pointer hover:bg-white/[0.06] transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Empty state */}
      {wpSites.length === 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-10 py-16 text-center">
          <Server className="w-10 h-10 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 text-sm mb-2">No WordPress sites connected</p>
          <p className="text-white/30 text-[13px] mb-6 max-w-md mx-auto leading-relaxed">
            Install the 0nCore plugin on your WordPress site. It will register automatically
            using your 0n API token.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <Code className="w-4 h-4 text-white/30" />
            <code className="text-xs text-white/50 font-mono">
              wp plugin install 0ncore --activate
            </code>
          </div>
        </div>
      )}

      {/* Sites list */}
      {wpSites.length > 0 && (
        <div className="flex flex-col gap-3">
          {wpSites.map(site => {
            const isExpanded = expanded === site.id
            const badge = healthBadge(site.status, site.last_seen_at)

            return (
              <div
                key={site.id}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden"
              >
                {/* Site row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : site.id)}
                  className="w-full flex items-center justify-between px-5 py-4 cursor-pointer bg-transparent border-none text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#7ed957]/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-[#7ed957]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {site.site_name || site.site_url}
                      </div>
                      <div className="text-xs text-white/30 mt-0.5">{site.site_url}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {site.wp_version && (
                      <span className="text-[11px] text-white/30 hidden sm:block">
                        WP {site.wp_version}
                      </span>
                    )}
                    {site.plugin_version && (
                      <span className="text-[11px] text-white/30 hidden sm:block">
                        Plugin {site.plugin_version}
                      </span>
                    )}
                    <span className="text-[11px] text-white/30 hidden md:block">
                      {site.tools?.length || 0} tools
                    </span>
                    <span className="text-[11px] text-white/30 hidden md:block">
                      {timeAgo(site.last_seen_at)}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-white/20" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white/20" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] px-5 py-4">
                    {/* Meta row */}
                    <div className="flex flex-wrap gap-6 mb-4">
                      <div>
                        <span className="block text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Site ID</span>
                        <span className="text-xs text-white/60 font-mono">{site.site_id}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-white/30 uppercase tracking-wide mb-0.5">WP Version</span>
                        <span className="text-xs text-white/60">{site.wp_version || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Plugin Version</span>
                        <span className="text-xs text-white/60">{site.plugin_version || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Last Seen</span>
                        <span className="text-xs text-white/60">{timeAgo(site.last_seen_at)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Registered</span>
                        <span className="text-xs text-white/60">
                          {new Date(site.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {site.mcp_endpoint && (
                        <div>
                          <span className="block text-[10px] text-white/30 uppercase tracking-wide mb-0.5">MCP Endpoint</span>
                          <span className="text-xs text-white/60 font-mono break-all">{site.mcp_endpoint}</span>
                        </div>
                      )}
                    </div>

                    {/* Tools */}
                    {site.tools && site.tools.length > 0 && (
                      <div className="mb-4">
                        <span className="block text-[10px] text-white/30 uppercase tracking-wide mb-2">
                          Available Tools ({site.tools.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {site.tools.map(tool => (
                            <span
                              key={tool}
                              className="text-[11px] px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/50 font-mono"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openExecModal(site)}
                        disabled={!site.mcp_endpoint || site.status === 'disconnected'}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#7ed957] text-black font-bold text-xs rounded-lg border-none cursor-pointer hover:bg-[#6ec847] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Execute Tool
                      </button>
                      <a
                        href={site.site_url + '/wp-admin'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs rounded-lg no-underline hover:bg-white/[0.06] transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        WP Admin
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
