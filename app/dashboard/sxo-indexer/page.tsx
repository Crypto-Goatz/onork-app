'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Globe, Loader2, Plus, CheckCircle2, AlertCircle, Copy, Trash2, Clock,
  TrendingUp, Search, Sparkles, ExternalLink, Bot,
} from 'lucide-react'

interface Customer {
  id: string
  user_id: string
  plan_tier: string
  indexnow_key: string
  daily_url_cap: number
  domain_cap: number
  alert_email: string | null
}

interface Domain {
  id: string
  customer_id: string
  host: string
  verified: boolean
  verified_at: string | null
  last_submission_at: string | null
  total_urls_submitted: number
  status: string
  next_run_at: string | null
  created_at: string
}

interface Run {
  id: string
  run_at: string
  urls_extracted: number
  status_code: number | null
  status_text: string | null
  ms_elapsed: number | null
  error: string | null
}

const PLAN_BADGE: Record<string, string> = {
  free:   'bg-white/[0.06] text-white/60 border-white/[0.1]',
  pro:    'bg-[#7ed957]/15 text-[#7ed957] border-[#7ed957]/30',
  agency: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  power:  'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

export default function SxoIndexerPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newHost, setNewHost] = useState('')
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [verifyResult, setVerifyResult] = useState<{ id: string; ok: boolean; message: string } | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [runs, setRuns] = useState<Run[]>([])

  const refresh = useCallback(async () => {
    const res = await fetch('/api/sxo-indexer/customers')
    const data = await res.json()
    if (data.customer) setCustomer(data.customer)
    setDomains(data.domains || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!selectedDomain) return
    fetch(`/api/sxo-indexer/runs?domain_id=${selectedDomain.id}`)
      .then(r => r.json())
      .then(d => setRuns(d.runs || []))
  }, [selectedDomain])

  async function addDomain() {
    if (!newHost.trim()) return
    setAdding(true)
    const res = await fetch('/api/sxo-indexer/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: newHost }),
    })
    const data = await res.json()
    if (data.error) alert(data.error)
    else {
      setNewHost('')
      await refresh()
    }
    setAdding(false)
  }

  async function deleteDomain(id: string) {
    if (!confirm('Remove this domain? Submissions will stop.')) return
    await fetch(`/api/sxo-indexer/domains?id=${id}`, { method: 'DELETE' })
    if (selectedDomain?.id === id) setSelectedDomain(null)
    refresh()
  }

  async function verify(domainId: string) {
    setVerifyingId(domainId)
    setVerifyResult(null)
    const res = await fetch('/api/sxo-indexer/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_id: domainId }),
    })
    const data = await res.json()
    setVerifyResult({ id: domainId, ok: !!data.verified, message: data.message || data.error || '' })
    if (data.verified) refresh()
    setVerifyingId(null)
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Search className="h-7 w-7 text-[#7ed957]" />
            <h1 className="text-3xl font-bold">SXO Auto-Indexer</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#7ed957]/15 text-[#7ed957] border border-[#7ed957]/30 uppercase tracking-wider">Add-on</span>
            {customer && (
              <span className={`text-xs px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${PLAN_BADGE[customer.plan_tier]}`}>
                {customer.plan_tier}
              </span>
            )}
          </div>
          <p className="text-white/60">
            We submit your URLs to Bing, Yandex, Naver, and Seznam every morning at 9am UTC. New content hits AI search within 24h instead of 4 weeks.
          </p>
        </div>

        {customer && customer.indexnow_key && (
          <div className="bg-[#7ed957]/5 border border-[#7ed957]/20 rounded-xl p-5 mb-8">
            <div className="flex items-start gap-3 mb-3">
              <Sparkles className="h-5 w-5 text-[#7ed957] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold mb-1">Your IndexNow key</div>
                <div className="text-xs text-white/60">Drop a file at <code className="text-[#7ed957] bg-white/[0.04] px-1 rounded">/public/{customer.indexnow_key}.txt</code> on each domain you want indexed. The file&apos;s only content should be the key itself.</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/60 border border-white/[0.06] rounded px-3 py-2 text-sm font-mono text-[#7ed957] truncate">{customer.indexnow_key}</code>
              <button onClick={() => copy(customer.indexnow_key)} className="p-2 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] cursor-pointer">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 text-xs text-white/40">
              Plan: <span className="text-white/70">{customer.plan_tier}</span> · {customer.daily_url_cap.toLocaleString()} URLs/day · {customer.domain_cap} domain{customer.domain_cap !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Add domain */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-3">Add a domain</h2>
          <div className="flex gap-2">
            <input
              value={newHost}
              onChange={e => setNewHost(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDomain()}
              placeholder="example.com"
              className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/20 outline-none focus:border-[#7ed957]/40"
            />
            <button
              onClick={addDomain}
              disabled={adding || !newHost.trim()}
              className="px-4 py-2.5 bg-[#7ed957] hover:bg-[#6bc847] disabled:opacity-30 text-black font-bold rounded-lg text-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add domain
            </button>
          </div>
        </div>

        {/* Domain list */}
        {domains.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <Globe className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No domains yet. Add your first domain above.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {domains.map(dom => (
              <div key={dom.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-white/40 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{dom.host}</span>
                      <StatusPill status={dom.status} verified={dom.verified} />
                    </div>
                    <div className="text-xs text-white/40 flex items-center gap-3 flex-wrap">
                      {dom.last_submission_at ? (
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Last: {new Date(dom.last_submission_at).toLocaleString()}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Never submitted</span>
                      )}
                      <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {dom.total_urls_submitted.toLocaleString()} URLs</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!dom.verified && (
                      <button
                        onClick={() => verify(dom.id)}
                        disabled={verifyingId === dom.id}
                        className="px-3 py-1.5 bg-[#7ed957]/10 hover:bg-[#7ed957]/20 border border-[#7ed957]/30 text-[#7ed957] rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                      >
                        {verifyingId === dom.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Verify
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedDomain(dom)}
                      className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-xs cursor-pointer"
                    >
                      Runs
                    </button>
                    <button
                      onClick={() => deleteDomain(dom.id)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {verifyResult?.id === dom.id && (
                  <div className={`mt-3 p-2.5 rounded-lg border text-xs ${
                    verifyResult.ok
                      ? 'bg-[#7ed957]/10 border-[#7ed957]/30 text-[#7ed957]'
                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                  }`}>
                    {verifyResult.ok ? <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" /> : <AlertCircle className="inline h-3.5 w-3.5 mr-1" />}
                    {verifyResult.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Run history modal */}
        {selectedDomain && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDomain(null)}>
            <div className="w-full max-w-3xl bg-[#0d1117] border border-white/[0.08] rounded-2xl overflow-hidden m-4" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">{selectedDomain.host} — Recent runs</h3>
                  <p className="text-xs text-white/40">Last 30 IndexNow submissions</p>
                </div>
                <button onClick={() => setSelectedDomain(null)} className="text-white/40 hover:text-white text-xl">×</button>
              </div>
              <div className="p-5 max-h-[60vh] overflow-y-auto">
                {runs.length === 0 ? (
                  <p className="text-center text-white/40 py-8 text-sm">No runs yet — verify the domain to schedule the first submission.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left text-xs text-white/40 uppercase tracking-wider">
                        <th className="py-2 pr-4">When</th>
                        <th className="py-2 pr-4">URLs</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map(r => (
                        <tr key={r.id} className="border-b border-white/[0.04]">
                          <td className="py-2 pr-4 text-white/70">{new Date(r.run_at).toLocaleString()}</td>
                          <td className="py-2 pr-4 text-white/70">{r.urls_extracted}</td>
                          <td className="py-2 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              r.status_text === 'ok'
                                ? 'bg-[#7ed957]/15 text-[#7ed957]'
                                : 'bg-red-500/15 text-red-400'
                            }`}>
                              {r.status_code || r.status_text || 'error'}
                            </span>
                            {r.error && <span className="ml-2 text-[10px] text-red-300">{r.error.slice(0, 60)}</span>}
                          </td>
                          <td className="py-2 pr-4 text-white/40">{r.ms_elapsed ? `${r.ms_elapsed}ms` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer pitch */}
        <div className="mt-12 grid md:grid-cols-2 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <Bot className="h-5 w-5 text-[#7ed957] mb-3" />
            <h3 className="font-bold mb-2">Why this matters</h3>
            <p className="text-sm text-white/60 leading-relaxed">Google killed `/ping` in 2023. Bing killed it in 2022. The only programmatic submission path left is IndexNow — an open protocol Bing/Yandex/Naver/Seznam adopted in 2021. We do that for you, every day, automatically.</p>
          </div>
          <a href="/guides/sxo-indexer" className="bg-white/[0.02] border border-white/[0.06] hover:border-[#7ed957]/40 rounded-xl p-5 transition group">
            <ExternalLink className="h-5 w-5 text-[#7ed957] mb-3" />
            <h3 className="font-bold mb-2">Build it yourself <span className="text-white/40 group-hover:text-[#7ed957] transition">→</span></h3>
            <p className="text-sm text-white/60 leading-relaxed">Read the full Build With 0n guide for the SXO Indexer. We documented every step, every gotcha, every line of code.</p>
          </a>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status, verified }: { status: string; verified: boolean }) {
  if (status === 'verified' && verified) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#7ed957]/15 text-[#7ed957] uppercase tracking-wider">verified</span>
  if (status === 'failed') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 uppercase tracking-wider">failed</span>
  if (status === 'paused') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 uppercase tracking-wider">paused</span>
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/50 uppercase tracking-wider">pending</span>
}
