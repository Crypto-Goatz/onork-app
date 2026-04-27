'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  Users, MessageSquare, Kanban, Calendar, FileText, CreditCard,
  Share2, Settings, BarChart3, FileSpreadsheet, Globe, Package, Tag,
  ArrowLeft, Activity, ChevronDown, Plus, Trash2, Loader2, CheckCircle,
  AlertTriangle, Server,
} from 'lucide-react'

const CRM_NAV = [
  { href: '/crm', label: 'Overview', icon: BarChart3, exact: true },
  { href: '/crm/contacts', label: 'Contacts', icon: Users },
  { href: '/crm/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/crm/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/crm/calendar', label: 'Calendar', icon: Calendar },
  { href: '/crm/invoices', label: 'Invoices', icon: FileText },
  { href: '/crm/payments', label: 'Payments', icon: CreditCard },
  { href: '/crm/social', label: 'Social Planner', icon: Share2 },
  { href: '/crm/workflows', label: 'Workflows', icon: Globe },
  { href: '/crm/products', label: 'Products', icon: Package },
  { href: '/crm/forms', label: 'Forms', icon: FileSpreadsheet },
  { href: '/crm/tags', label: 'Tags', icon: Tag },
  { href: '/crm/settings', label: 'Settings', icon: Settings },
]

// POL test endpoints
const POL_TESTS = [
  { label: 'Get Contacts', method: 'GET', path: '/contacts/?limit=1' },
  { label: 'Get Pipelines', method: 'GET', path: '/opportunities/pipelines' },
  { label: 'Get Calendars', method: 'GET', path: '/calendars/' },
  { label: 'Get Tags', method: 'GET', path: '/locations/tags' },
  { label: 'Get Invoices', method: 'GET', path: '/invoices/?limit=1' },
  { label: 'Get Social Accounts', method: 'GET', path: '/social-media-posting/oauth' },
  { label: 'Get Workflows', method: 'GET', path: '/workflows/' },
  { label: 'Get Users', method: 'GET', path: '/users/' },
  { label: 'Get Custom Fields', method: 'GET', path: '/locations/customFields' },
  { label: 'Get Products', method: 'GET', path: '/products/' },
]

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [locationId, setLocationId] = useState('')
  const [locationName, setLocationName] = useState('Loading...')
  const [showPOL, setShowPOL] = useState(false)
  const [polResult, setPolResult] = useState<{ status: string; data?: string; error?: string } | null>(null)
  const [polLoading, setPolLoading] = useState(false)
  const [polTest, setPolTest] = useState(POL_TESTS[0])

  // Fetch current location
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.profile?.crm_location_id) {
        const loc = d.profile.crm_location_id
        setLocationId(loc)
        setLocationName(
          loc === '6MSqx0trfxgLxeHBJE1k' ? 'RocketOpp' :
          loc === 'nphConTwfHcVE1oA0uep' ? '0nCore' :
          loc.slice(0, 12) + '...'
        )
      }
    }).catch(() => setLocationName('Not connected'))
  }, [])

  // Run POL test
  async function runPOL(action: 'test' | 'add' | 'remove') {
    setPolLoading(true)
    setPolResult(null)
    try {
      if (action === 'test') {
        const res = await fetch('/api/crm/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: polTest.method, path: polTest.path }),
        })
        const data = await res.json()
        setPolResult({
          status: res.ok ? 'success' : 'error',
          data: res.ok ? JSON.stringify(data, null, 2).slice(0, 500) : undefined,
          error: !res.ok ? (data.error || `${res.status}`) : undefined,
        })
      } else if (action === 'add') {
        const res = await fetch('/api/crm/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'POST',
            path: '/contacts/',
            body: { firstName: 'POL', lastName: 'Test', email: `pol-test-${Date.now()}@0ncore.com`, tags: ['pol-test'], source: '0ncore-pol' },
          }),
        })
        const data = await res.json()
        setPolResult({
          status: res.ok ? 'success' : 'error',
          data: res.ok ? `Contact created: ${data.contact?.id || JSON.stringify(data).slice(0, 200)}` : undefined,
          error: !res.ok ? (data.error || `${res.status}`) : undefined,
        })
      } else if (action === 'remove') {
        // First find the POL test contact
        const searchRes = await fetch('/api/crm/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'GET', path: '/contacts/?query=pol-test&limit=1' }),
        })
        const searchData = await searchRes.json()
        const contact = searchData.contacts?.[0]
        if (contact) {
          const delRes = await fetch('/api/crm/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'DELETE', path: `/contacts/${contact.id}` }),
          })
          setPolResult({
            status: delRes.ok ? 'success' : 'error',
            data: delRes.ok ? `Deleted contact: ${contact.id}` : undefined,
            error: !delRes.ok ? 'Delete failed' : undefined,
          })
        } else {
          setPolResult({ status: 'error', error: 'No POL test contact found to delete' })
        }
      }
    } catch (err) {
      setPolResult({ status: 'error', error: (err as Error).message })
    }
    setPolLoading(false)
  }

  return (
    <div className="flex h-screen bg-[#0a0e17]">
      {/* CRM Sidebar */}
      <div className="w-56 shrink-0 border-r border-white/[0.06] bg-[#0d1117] py-4 px-2 overflow-y-auto flex flex-col">
        {/* Back + Title */}
        <div className="px-3 mb-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-3 no-underline">
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7ed957]/10 flex items-center justify-center">
              <span className="text-[11px] font-black text-[#7ed957]">CRM</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">0nCore CRM</h2>
              <p className="text-[10px] text-white/25">SDK-powered</p>
            </div>
          </div>
        </div>

        {/* Active Location */}
        <div className="px-3 mb-3">
          <div className="px-2.5 py-2 rounded-lg bg-[#7ed957]/[0.05] border border-[#7ed957]/10">
            <div className="text-[9px] text-white/20 uppercase tracking-wider font-bold mb-0.5">Active Location</div>
            <div className="text-[12px] font-semibold text-[#7ed957]">{locationName}</div>
            <div className="text-[9px] font-mono text-white/15 mt-0.5 truncate">{locationId}</div>
          </div>
        </div>

        {/* POL Tester Toggle */}
        <div className="px-3 mb-3">
          <button onClick={() => setShowPOL(!showPOL)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[10px] text-white/30 font-semibold cursor-pointer hover:text-white/50 hover:border-white/[0.08] transition-all">
            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Proof of Life</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showPOL ? 'rotate-180' : ''}`} />
          </button>

          {showPOL && (
            <div className="mt-2 space-y-2">
              {/* Test selector */}
              <select value={polTest.label} onChange={e => setPolTest(POL_TESTS.find(t => t.label === e.target.value) || POL_TESTS[0])}
                className="w-full px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-[10px] outline-none [&>option]:bg-[#0d1117]">
                {POL_TESTS.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
              </select>

              {/* Action buttons */}
              <div className="flex gap-1">
                <button onClick={() => runPOL('test')} disabled={polLoading}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-[9px] font-bold cursor-pointer hover:bg-[#00d4ff]/20 transition-colors disabled:opacity-50">
                  Test
                </button>
                <button onClick={() => runPOL('add')} disabled={polLoading}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-[#7ed957]/10 border border-[#7ed957]/20 text-[#7ed957] text-[9px] font-bold cursor-pointer hover:bg-[#7ed957]/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-0.5">
                  <Plus className="w-2.5 h-2.5" /> Add
                </button>
                <button onClick={() => runPOL('remove')} disabled={polLoading}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-0.5">
                  <Trash2 className="w-2.5 h-2.5" /> Del
                </button>
              </div>

              {/* Result */}
              {polLoading && <div className="flex items-center gap-1.5 text-[10px] text-white/30"><Loader2 className="w-3 h-3 animate-spin" /> Running...</div>}
              {polResult && (
                <div className={`px-2 py-1.5 rounded-lg text-[9px] ${polResult.status === 'success' ? 'bg-[#7ed957]/10 border border-[#7ed957]/20 text-[#7ed957]' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                  <div className="flex items-center gap-1 font-bold mb-0.5">
                    {polResult.status === 'success' ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                    {polResult.status === 'success' ? 'OK' : 'FAIL'}
                  </div>
                  {polResult.data && <pre className="text-[8px] text-white/30 whitespace-pre-wrap max-h-20 overflow-auto mt-1">{polResult.data}</pre>}
                  {polResult.error && <div className="text-[9px] mt-0.5">{polResult.error}</div>}
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="space-y-0.5 flex-1">
          {CRM_NAV.map(item => {
            const Icon = item.icon
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href) && item.href !== '/crm'
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors no-underline ${
                  isActive
                    ? 'bg-[#7ed957]/10 text-[#7ed957] font-semibold'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-[10px] text-white/15">
            <Server className="w-3 h-3" />
            0nCore CRM v1.0
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  )
}
