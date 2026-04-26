'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Users, Target, MessageSquare, Calendar, CreditCard, Tag,
  RefreshCw, Search, Plus, ChevronRight, Phone, Mail, Clock,
  AlertTriangle, CheckCircle, Loader2, Building2, User,
  Filter, ArrowUpDown, BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import * as crm from '@/lib/crm/sdk'
import { WelcomeModal } from '@/components/ui/welcome-modal'
import { InfoTooltip } from '@/components/ui/info-tooltip'

type Tab = 'contacts' | 'pipeline' | 'conversations' | 'calendar' | 'invoices'

interface Contact {
  id: string
  contactName?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  companyName?: string
  tags?: string[]
  dateAdded?: string
  source?: string
}

interface LocalPipeline {
  id: string
  name: string
  stages: { id: string; name: string }[]
}

interface LocalOpportunity {
  id: string
  name: string
  monetaryValue?: number
  status?: string
  pipelineStageId?: string
  contact?: Record<string, unknown>
}

const TABS: { key: Tab; label: string; Icon: typeof Users; desc: string }[] = [
  { key: 'contacts', label: 'Contacts', Icon: Users, desc: 'All your CRM contacts' },
  { key: 'pipeline', label: 'Pipeline', Icon: Target, desc: 'Deals and opportunities' },
  { key: 'conversations', label: 'Conversations', Icon: MessageSquare, desc: 'Messages and threads' },
  { key: 'calendar', label: 'Calendar', Icon: Calendar, desc: 'Appointments and events' },
  { key: 'invoices', label: 'Invoices', Icon: CreditCard, desc: 'Billing and payments' },
]

export default function CrmPage() {
  const [tab, setTab] = useState<Tab>('contacts')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Data
  const [contacts, setContacts] = useState<Contact[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [pipelines, setPipelines] = useState<LocalPipeline[]>([])
  const [opportunities, setOpportunities] = useState<LocalOpportunity[]>([])
  const [conversations, setConversations] = useState<{ id: string; contactName: string; lastMessage: string; updatedAt: string }[]>([])

  const loadContacts = useCallback(async (query?: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await crm.contacts.list({ query: query || undefined, limit: 50 })
      setContacts(data.contacts || [])
      setTotalContacts(data.total || data.count || data.contacts?.length || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts')
    }
    setLoading(false)
  }, [])

  const loadPipeline = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await crm.opportunities.pipelines()
      setPipelines((data.pipelines || []) as LocalPipeline[])
      if (data.pipelines?.[0]) {
        const opps = await crm.opportunities.list(data.pipelines[0].id, { limit: 50 })
        setOpportunities((opps.opportunities || []) as LocalOpportunity[])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline')
    }
    setLoading(false)
  }, [])

  const loadConversations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await crm.conversations.list({ limit: 20 })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped = (data.conversations || []).map((c: any) => ({
        id: String(c.id || ''),
        contactName: String(c.contactName || c.fullName || 'Unknown'),
        lastMessage: String(c.lastMessageBody || ''),
        updatedAt: String(c.lastMessageDate || c.dateUpdated || ''),
      }))
      setConversations(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    switch (tab) {
      case 'contacts': loadContacts(); break
      case 'pipeline': loadPipeline(); break
      case 'conversations': loadConversations(); break
      default: setLoading(false)
    }
  }, [tab, loadContacts, loadPipeline, loadConversations])

  const handleSearch = () => {
    if (tab === 'contacts') loadContacts(searchQuery)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    switch (tab) {
      case 'contacts': await loadContacts(searchQuery); break
      case 'pipeline': await loadPipeline(); break
      case 'conversations': await loadConversations(); break
    }
    setRefreshing(false)
    toast.success('CRM data refreshed')
  }

  return (
    <div className="px-6 py-5 max-w-[1200px] mx-auto">
      <WelcomeModal
        storageKey="crm-dashboard"
        title="Your CRM Command Center"
        subtitle="Everything about your contacts, deals, and conversations in one place."
        steps={[
          { title: 'Contacts', description: 'Search, view, and manage all your CRM contacts. Tags, phone, email — everything synced from your CRM location.', icon: <Users className="w-5 h-5 text-core-green" />, tip: 'Use the search bar to find contacts instantly. Try searching by name, email, or company.' },
          { title: 'Pipeline', description: 'Track your deals through every stage. See what\'s closing, what\'s stalled, and where to focus your energy.', icon: <Target className="w-5 h-5 text-core-cyan" />, tip: 'Click on any deal to see its full history and take action — call, email, or move stages.' },
          { title: 'Conversations', description: 'All your messages in one place. SMS, email, chat — threaded by contact.', icon: <MessageSquare className="w-5 h-5 text-core-purple" /> },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-core-text m-0 flex items-center gap-2">
            CRM
            <InfoTooltip title="CRM" content="Your Customer Relationship Manager. This is where all your contacts, deals, conversations, and billing live. Powered by the CRM SDK with 39 service modules." position="right" />
          </h1>
          <p className="text-[12px] text-core-text-muted mt-0.5">
            {totalContacts > 0 ? `${totalContacts.toLocaleString()} contacts` : 'Connected via SDK'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-core-border bg-transparent text-core-text-muted text-[12px] font-medium cursor-pointer hover:text-core-text transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-core-card rounded-xl p-1 border border-core-border">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-all border-none ${
              tab === t.key
                ? 'bg-core-green/10 text-core-green font-semibold'
                : 'bg-transparent text-core-text-dim hover:text-core-text hover:bg-white/[0.03]'
            }`}
          >
            <t.Icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Search bar (contacts tab) */}
      {tab === 'contacts' && (
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-core-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search contacts by name, email, phone, or company..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-core-card border border-core-border text-core-text text-[13px] placeholder:text-core-text-muted outline-none focus:border-core-green/40 transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 rounded-xl bg-core-green text-core-bg text-[13px] font-bold cursor-pointer border-none hover:bg-core-green/90 transition-colors"
          >
            Search
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-core-red/8 border border-core-red/20 text-core-red text-[13px]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={handleRefresh} className="ml-auto text-[12px] font-semibold underline bg-transparent border-none text-core-red cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-core-green" />
        </div>
      )}

      {/* ═══ CONTACTS TAB ═══ */}
      {!loading && tab === 'contacts' && (
        <div className="space-y-2">
          {contacts.length === 0 && !error ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 mx-auto text-core-border mb-3" />
              <p className="text-core-text-dim text-sm mb-1">No contacts found</p>
              <p className="text-core-text-muted text-xs">
                {searchQuery ? 'Try a different search term' : 'Contacts will appear once your CRM is synced'}
              </p>
            </div>
          ) : (
            contacts.map(c => (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-core-card border border-core-border hover:border-core-green/20 transition-colors">
                <div className="w-9 h-9 rounded-full bg-core-green/10 flex items-center justify-center text-core-green text-[12px] font-bold shrink-0">
                  {(c.firstName || c.contactName || '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-core-text truncate">
                    {c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-core-text-muted mt-0.5">
                    {c.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                    {c.companyName && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{c.companyName}</span>}
                  </div>
                </div>
                {c.tags && c.tags.length > 0 && (
                  <div className="flex gap-1 shrink-0">
                    {c.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-core-cyan/10 text-core-cyan text-[10px] font-semibold">{tag}</span>
                    ))}
                  </div>
                )}
                <Link href={`/dashboard/contacts/${c.id}`} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.04] text-core-text-muted hover:text-core-text transition-colors no-underline">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ PIPELINE TAB ═══ */}
      {!loading && tab === 'pipeline' && (
        <div className="space-y-4">
          {pipelines.length === 0 && !error ? (
            <div className="text-center py-16">
              <Target className="w-10 h-10 mx-auto text-core-border mb-3" />
              <p className="text-core-text-dim text-sm">No pipelines found</p>
            </div>
          ) : (
            pipelines.map(p => (
              <div key={p.id} className="rounded-xl bg-core-card border border-core-border p-4">
                <h3 className="text-[14px] font-bold text-core-text mb-3">{p.name}</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {p.stages?.map(stage => (
                    <div key={stage.id} className="min-w-[160px] flex-1 px-3 py-2 rounded-lg bg-white/[0.02] border border-core-border">
                      <div className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wider mb-2">{stage.name}</div>
                      {opportunities
                        .filter(o => o.pipelineStageId === stage.id)
                        .map(opp => (
                          <div key={opp.id} className="px-2.5 py-2 mb-1.5 rounded-lg bg-core-card border border-core-border text-[12px]">
                            <div className="font-semibold text-core-text truncate">{opp.name}</div>
                            {opp.monetaryValue && (
                              <div className="text-core-green font-mono text-[11px] mt-0.5">
                                ${(opp.monetaryValue / 100).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ CONVERSATIONS TAB ═══ */}
      {!loading && tab === 'conversations' && (
        <div className="space-y-2">
          {conversations.length === 0 && !error ? (
            <div className="text-center py-16">
              <MessageSquare className="w-10 h-10 mx-auto text-core-border mb-3" />
              <p className="text-core-text-dim text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-core-card border border-core-border hover:border-core-green/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-core-purple/10 flex items-center justify-center text-core-purple text-[11px] font-bold shrink-0">
                  {(c.contactName || '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-core-text">{c.contactName || 'Unknown'}</div>
                  <div className="text-[11px] text-core-text-muted truncate">{c.lastMessage || 'No messages'}</div>
                </div>
                <span className="text-[10px] text-core-text-muted shrink-0">
                  {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : ''}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ CALENDAR TAB ═══ */}
      {!loading && tab === 'calendar' && (
        <div className="text-center py-16">
          <Calendar className="w-10 h-10 mx-auto text-core-border mb-3" />
          <p className="text-core-text-dim text-sm mb-1">Calendar View</p>
          <p className="text-core-text-muted text-xs">Appointments and bookings from your CRM</p>
          <Link href="/dashboard/calendar" className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-core-green no-underline font-semibold hover:underline">
            Open Full Calendar <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* ═══ INVOICES TAB ═══ */}
      {!loading && tab === 'invoices' && (
        <div className="text-center py-16">
          <CreditCard className="w-10 h-10 mx-auto text-core-border mb-3" />
          <p className="text-core-text-dim text-sm mb-1">Invoices & Billing</p>
          <p className="text-core-text-muted text-xs">Manage invoices and payment records</p>
          <Link href="/dashboard/invoices" className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-core-green no-underline font-semibold hover:underline">
            Open Invoices <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
