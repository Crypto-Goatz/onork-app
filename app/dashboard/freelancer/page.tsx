'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Briefcase, Plus, Clock, CheckCircle2, AlertCircle, Copy, ChevronDown,
  FileText, Video, ArrowRight, Sparkles, TrendingUp, Package, RefreshCw,
} from 'lucide-react'

// ── Types ──
interface Gig {
  id: string
  name: string
  base_price_usd: number
  platform_title: string
}

interface Order {
  id: string
  gig_id: string
  platform_order_id: string | null
  buyer_handle: string | null
  status: string
  ingested_at: string
  fulfilled_at: string | null
  crm_contact_id: string | null
  crm_opportunity_id: string | null
}

interface Bundle {
  files: Array<{ path: string; size?: number }>
  delivery_message: string
  loom_script: string
  upsell_hint?: string
}

type View = 'orders' | 'ingest'

const STATUS_COLORS: Record<string, string> = {
  received: 'text-yellow-400',
  parsing: 'text-blue-400',
  fulfilling: 'text-blue-400',
  ready: 'text-emerald-400',
  delivered: 'text-white/40',
  failed: 'text-red-400',
  cancelled: 'text-white/20',
}

const GIGS_FALLBACK: Gig[] = [
  { id: 'claude-mcp-setup', name: 'Claude Desktop + MCP Setup', base_price_usd: 147, platform_title: '' },
  { id: 'ai-agent-build', name: 'Custom AI Agent Build', base_price_usd: 497, platform_title: '' },
  { id: 'crm-ai-funnel', name: 'AI Sales Funnel Setup', base_price_usd: 997, platform_title: '' },
  { id: 'saas-landing', name: 'SaaS Landing Page', base_price_usd: 497, platform_title: '' },
  { id: 'linkedin-content', name: 'LinkedIn Content System', base_price_usd: 297, platform_title: '' },
]

export default function FreelancerPage() {
  const [view, setView] = useState<View>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [gigs, setGigs] = useState<Gig[]>(GIGS_FALLBACK)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Ingest form state
  const [gigId, setGigId] = useState('claude-mcp-setup')
  const [platformOrderId, setPlatformOrderId] = useState('')
  const [buyerHandle, setBuyerHandle] = useState('')
  const [brief, setBrief] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Bundle viewer
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [activeBundle, setActiveBundle] = useState<Bundle | null>(null)
  const [bundleLoading, setBundleLoading] = useState(false)

  // Get user ID from session
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user?.id) setUserId(d.user.id)
    }).catch(() => {})
  }, [])

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/freelancer/orders?user_id=${userId}`)
      const data = await res.json()
      if (data.orders) setOrders(data.orders)
    } catch {}
    setLoading(false)
  }, [userId])

  // Load gigs
  useEffect(() => {
    fetch('/api/freelancer/gigs').then(r => r.json()).then(d => {
      if (d.gigs?.length) setGigs(d.gigs)
    }).catch(() => {})
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  // Submit order
  async function handleIngest(e: React.FormEvent) {
    e.preventDefault()
    if (brief.trim().length < 10) {
      setSubmitError('Brief too short — paste the full buyer message.')
      return
    }
    if (!userId) {
      setSubmitError('Not authenticated')
      return
    }

    setSubmitError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/freelancer/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gig_id: gigId,
          platform_order_id: platformOrderId || undefined,
          buyer_handle: buyerHandle || undefined,
          buyer_brief_raw: brief,
          user_id: userId,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed')

      // Reset form
      setBrief('')
      setPlatformOrderId('')
      setBuyerHandle('')
      setView('orders')

      // Poll for completion
      pollOrder(data.order_id)
    } catch (err) {
      setSubmitError((err as Error).message)
    }
    setSubmitting(false)
  }

  async function pollOrder(orderId: string, attempt = 0) {
    if (attempt > 20) return
    await new Promise(r => setTimeout(r, 3000))

    try {
      const res = await fetch(`/api/freelancer/orders/${orderId}`)
      const data = await res.json()

      if (data.status === 'ready' || data.status === 'delivered' || data.status === 'failed') {
        loadOrders()
        return
      }
      // Keep polling
      pollOrder(orderId, attempt + 1)
    } catch {
      pollOrder(orderId, attempt + 1)
    }
  }

  // View bundle
  async function viewBundle(orderId: string) {
    setBundleLoading(true)
    setActiveOrderId(orderId)
    try {
      const res = await fetch(`/api/freelancer/orders/${orderId}`)
      const data = await res.json()
      if (data.bundle) setActiveBundle(data.bundle)
    } catch {}
    setBundleLoading(false)
  }

  const readyCount = orders.filter(o => o.status === 'ready').length
  const totalRevenue = orders.filter(o => ['ready', 'delivered'].includes(o.status)).length
  const crmPushed = orders.filter(o => o.crm_contact_id).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-[#FF6B35]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Freelancer</h1>
            <p className="text-xs text-white/40">Order fulfillment engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadOrders}
            className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/60 hover:text-white hover:border-white/[0.12] transition-all flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => setView(view === 'ingest' ? 'orders' : 'ingest')}
            className="px-4 py-2 rounded-lg bg-[#7ed957] text-[#020810] text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#7ed957]/90 transition-colors border-none">
            {view === 'ingest' ? <ArrowRight className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {view === 'ingest' ? 'Back to Orders' : 'Ingest Order'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: orders.length, icon: Package, color: 'text-white' },
          { label: 'Ready to Deliver', value: readyCount, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'CRM Leads', value: crmPushed, icon: TrendingUp, color: 'text-[#00d4ff]' },
          { label: 'Delivered', value: totalRevenue, icon: Sparkles, color: 'text-[#FF6B35]' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</span>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ═══ INGEST VIEW ═══ */}
      {view === 'ingest' && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#FF6B35]" />
            Ingest New Order
          </h2>
          <form onSubmit={handleIngest} className="space-y-4 max-w-2xl">
            {/* Gig selector */}
            <div>
              <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">Gig</label>
              <div className="relative">
                <select value={gigId} onChange={e => setGigId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none focus:border-[#FF6B35]/30 appearance-none cursor-pointer [&>option]:bg-[#0d1117] [&>option]:text-white pr-10">
                  {gigs.map(g => (
                    <option key={g.id} value={g.id}>{g.name} — ${g.base_price_usd}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              </div>
            </div>

            {/* Platform order + buyer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">Platform Order ID</label>
                <input value={platformOrderId} onChange={e => setPlatformOrderId(e.target.value)}
                  placeholder="FO-XXXXXXXX (optional)"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/15 outline-none focus:border-[#FF6B35]/30" />
              </div>
              <div>
                <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">Buyer Handle</label>
                <input value={buyerHandle} onChange={e => setBuyerHandle(e.target.value)}
                  placeholder="@buyername (optional)"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/15 outline-none focus:border-[#FF6B35]/30" />
              </div>
            </div>

            {/* Brief */}
            <div>
              <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">
                Buyer Brief <span className="text-[#FF6B35]">*</span>
              </label>
              <textarea value={brief} onChange={e => setBrief(e.target.value)}
                rows={8} required
                placeholder="Paste the full buyer requirements message here..."
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/15 outline-none focus:border-[#FF6B35]/30 resize-none" />
              <div className="mt-1 text-[10px] text-white/20">{brief.length} characters</div>
            </div>

            {submitError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-400">
                {submitError}
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-bold cursor-pointer border-none hover:bg-[#FF6B35]/90 transition-colors disabled:opacity-50">
              {submitting ? 'Processing...' : 'Ingest & Fulfill'}
            </button>
          </form>
        </div>
      )}

      {/* ═══ ORDERS VIEW ═══ */}
      {view === 'orders' && (
        <>
          {loading ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
              <RefreshCw className="w-6 h-6 text-white/20 animate-spin mx-auto mb-2" />
              <p className="text-sm text-white/30">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
              <Briefcase className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/40 mb-2">No orders yet</p>
              <p className="text-xs text-white/20">Click &ldquo;Ingest Order&rdquo; to process your first Fiverr order</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1.5fr_100px_100px_80px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.04] text-[10px] text-white/25 uppercase tracking-wider font-semibold">
                <div>Order</div>
                <div>Gig</div>
                <div>Status</div>
                <div>CRM</div>
                <div>Action</div>
              </div>
              {orders.map(o => (
                <div key={o.id}
                  className="grid grid-cols-[1fr_1.5fr_100px_100px_80px] gap-3 px-4 py-3 border-b border-white/[0.04] last:border-none hover:bg-white/[0.02] transition-colors items-center">
                  <div>
                    <div className="text-xs font-mono text-white/60">{o.id.slice(0, 8)}</div>
                    {o.buyer_handle && <div className="text-[10px] text-white/25">{o.buyer_handle}</div>}
                  </div>
                  <div className="text-sm text-white/70">{gigs.find(g => g.id === o.gig_id)?.name || o.gig_id}</div>
                  <div className={`text-xs font-mono uppercase ${STATUS_COLORS[o.status] || 'text-white/30'}`}>
                    {o.status === 'fulfilling' || o.status === 'parsing' ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {o.status}
                      </span>
                    ) : o.status}
                  </div>
                  <div className="text-xs">
                    {o.crm_contact_id ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Pushed
                      </span>
                    ) : o.status === 'ready' ? (
                      <span className="text-yellow-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </div>
                  <div>
                    {(o.status === 'ready' || o.status === 'delivered') ? (
                      <button onClick={() => viewBundle(o.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#7ed957]/10 border border-[#7ed957]/20 text-[10px] text-[#7ed957] font-semibold cursor-pointer hover:bg-[#7ed957]/20 transition-colors">
                        View
                      </button>
                    ) : o.status === 'failed' ? (
                      <span className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bundle Viewer */}
          {activeOrderId && activeBundle && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Bundle Ready — {activeOrderId.slice(0, 8)}
                </div>
                <button onClick={() => { setActiveOrderId(null); setActiveBundle(null) }}
                  className="text-xs text-white/30 hover:text-white/60 bg-transparent border-none cursor-pointer">
                  Close
                </button>
              </div>

              {/* Files */}
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">Files</div>
                <div className="flex flex-wrap gap-2">
                  {activeBundle.files.map(f => (
                    <div key={f.path} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/60 flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-white/30" />
                      {f.path}
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery message */}
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold flex items-center gap-2">
                  Delivery Message
                  <CopyBtn text={activeBundle.delivery_message} />
                </div>
                <pre className="rounded-lg bg-[#0a0e17] border border-white/[0.04] p-4 text-xs text-white/60 whitespace-pre-wrap overflow-auto max-h-60">
                  {activeBundle.delivery_message}
                </pre>
              </div>

              {/* Loom script */}
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold flex items-center gap-2">
                  <Video className="w-3 h-3" /> Loom Script
                  <CopyBtn text={activeBundle.loom_script} />
                </div>
                <pre className="rounded-lg bg-[#0a0e17] border border-white/[0.04] p-4 text-xs text-white/60 whitespace-pre-wrap overflow-auto max-h-60">
                  {activeBundle.loom_script}
                </pre>
              </div>

              {/* Upsell hint */}
              {activeBundle.upsell_hint && (
                <div className="rounded-lg border border-[#FF6B35]/20 bg-[#FF6B35]/[0.04] px-4 py-3 text-sm text-[#FF6B35] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  Upsell: {activeBundle.upsell_hint}
                </div>
              )}
            </div>
          )}
          {bundleLoading && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <RefreshCw className="w-5 h-5 text-white/20 animate-spin mx-auto" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={async () => {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }}
      className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/30 hover:text-white/60 cursor-pointer flex items-center gap-1 transition-colors">
      <Copy className="w-2.5 h-2.5" />
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
