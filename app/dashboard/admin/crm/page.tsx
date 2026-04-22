'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Inbox } from 'lucide-react'

interface Contact {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags?: string[]
  dateAdded?: string
  lastActivity?: string
  source?: string
  [key: string]: unknown
}

interface Pipeline {
  id: string
  name: string
  stages?: { id: string; name: string }[]
  opportunities?: {
    id: string
    name?: string
    contact?: { firstName?: string; lastName?: string }
    monetaryValue?: number
    status?: string
    stageId?: string
    dateAdded?: string
  }[]
}

interface Conversation {
  id: string
  contactId?: string
  contactName?: string
  type?: string
  lastMessageBody?: string
  lastMessageDate?: string
  unreadCount?: number
  [key: string]: unknown
}

export default function CRMLivePage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [lastRefresh, setLastRefresh] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'contacts' | 'pipeline' | 'conversations'>('contacts')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const errs: string[] = []

    try {
      const [contactsRes, pipelineRes, convoRes] = await Promise.all([
        fetch('/api/crm/contacts?limit=100').then(r => r.json()).catch(() => ({ error: 'Failed to fetch contacts' })),
        fetch('/api/crm/pipeline').then(r => r.json()).catch(() => ({ error: 'Failed to fetch pipelines' })),
        fetch('/api/crm/conversations?limit=50').then(r => r.json()).catch(() => ({ error: 'Failed to fetch conversations' })),
      ])

      if (contactsRes.error) errs.push(contactsRes.error)
      else setContacts(contactsRes.contacts || [])

      if (pipelineRes.error) errs.push(pipelineRes.error)
      else setPipelines(pipelineRes.pipelines || [])

      if (convoRes.error) errs.push(convoRes.error)
      else setConversations(convoRes.conversations || [])
    } catch (err) {
      errs.push((err as Error).message)
    }

    setErrors(errs)
    setLoading(false)
    setLastRefresh(new Date().toISOString())
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 60000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const totalPipelineValue = pipelines.reduce((sum, p) => {
    return sum + (p.opportunities || []).reduce((s, o) => s + Number(o.monetaryValue || 0), 0)
  }, 0)

  const totalOpps = pipelines.reduce((sum, p) => sum + (p.opportunities || []).length, 0)

  const filteredContacts = contacts.filter(c => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      (c.firstName || '').toLowerCase().includes(term) ||
      (c.lastName || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.phone || '').includes(term)
    )
  })

  const tabs = [
    { key: 'contacts' as const, label: 'Contacts', count: contacts.length },
    { key: 'pipeline' as const, label: 'Pipeline', count: totalOpps },
    { key: 'conversations' as const, label: 'Conversations', count: conversations.length },
  ]

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-core-green tracking-tight m-0">
            CRM Live Dashboard
          </h1>
          <p className="text-core-text-muted text-[13px] mt-1 mb-0">
            Real-time data from your CRM location — auto-refreshes every 60s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-core-text-muted text-[11px]">
              Updated: {new Date(lastRefresh).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchAll}
            disabled={loading}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-colors',
              loading
                ? 'bg-core-bg text-core-text-muted border border-core-border cursor-default'
                : 'bg-core-green text-black border-0 cursor-pointer hover:opacity-90',
            ].join(' ')}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-4 flex flex-col gap-1">
          {errors.map((err, i) => (
            <div
              key={i}
              className="px-[14px] py-2 bg-core-red/[.06] border border-core-red/20 rounded text-core-red text-xs"
            >
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 mb-6">
        {[
          { label: 'Total Contacts', value: contacts.length, colorClass: 'text-core-green' },
          { label: 'Pipelines', value: pipelines.length, colorClass: 'text-core-cyan' },
          { label: 'Opportunities', value: totalOpps, colorClass: 'text-core-purple' },
          { label: 'Pipeline Value', value: `$${totalPipelineValue.toLocaleString()}`, colorClass: 'text-core-amber' },
          { label: 'Conversations', value: conversations.length, colorClass: 'text-core-cyan' },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-core-card border border-core-border rounded-lg p-4"
          >
            <div className="text-core-text-muted text-[11px] font-medium uppercase tracking-wide mb-1.5">
              {s.label}
            </div>
            <div className={`text-[28px] font-bold ${s.colorClass}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-core-border mb-5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 bg-transparent border-0 border-b-2 text-[13px] font-semibold cursor-pointer transition-colors',
              activeTab === t.key
                ? 'border-core-green text-core-green'
                : 'border-transparent text-core-text-dim',
            ].join(' ')}
          >
            {t.label}
            <span
              className={[
                'px-1.5 py-px rounded-full text-[10px] font-bold',
                activeTab === t.key
                  ? 'bg-core-green/10 text-core-green'
                  : 'bg-core-bg text-core-text-muted',
              ].join(' ')}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full max-w-[400px] px-[14px] py-2.5 bg-core-surface border border-core-border rounded text-core-text text-[13px] outline-none focus:border-core-green/50 transition-colors"
            />
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredContacts.length === 0 ? (
            <EmptyState message="No contacts found" />
          ) : (
            <div className="bg-core-card border border-core-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {['Name', 'Email', 'Phone', 'Tags', 'Source', 'Added'].map(col => (
                        <th
                          key={col}
                          className="px-[14px] py-2.5 text-left text-core-text-muted font-semibold border-b border-core-border text-[11px] uppercase tracking-wide whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map(c => (
                      <tr key={c.id} className="border-b border-core-border">
                        <td className="px-[14px] py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-core-green/[.08] border border-core-green/20 flex items-center justify-center text-core-green text-[11px] font-bold shrink-0">
                              {(c.firstName || '?')[0].toUpperCase()}
                            </div>
                            <span className="text-core-text font-medium">
                              {`${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-[14px] py-2.5 text-core-text-dim">{c.email || '-'}</td>
                        <td className="px-[14px] py-2.5 text-core-text-dim">{c.phone || '-'}</td>
                        <td className="px-[14px] py-2.5">
                          <div className="flex flex-wrap gap-[3px]">
                            {(c.tags || []).slice(0, 3).map((tag, ti) => (
                              <span
                                key={ti}
                                className="px-1.5 py-px bg-core-cyan/[.08] rounded text-core-cyan text-[10px]"
                              >
                                {tag}
                              </span>
                            ))}
                            {(c.tags || []).length > 3 && (
                              <span className="text-core-text-muted text-[10px]">
                                +{(c.tags || []).length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-[14px] py-2.5 text-core-text-muted text-[11px]">{c.source || '-'}</td>
                        <td className="px-[14px] py-2.5 text-core-text-muted text-[11px] whitespace-nowrap">
                          {c.dateAdded ? new Date(c.dateAdded).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <div>
          {loading ? (
            <LoadingState />
          ) : pipelines.length === 0 ? (
            <EmptyState message="No pipelines found in CRM" />
          ) : (
            <div className="flex flex-col gap-5">
              {pipelines.map(pipeline => (
                <div
                  key={pipeline.id}
                  className="bg-core-card border border-core-border rounded-lg overflow-hidden"
                >
                  <div className="px-5 py-[14px] border-b border-core-border flex justify-between items-center">
                    <h3 className="text-core-text text-base font-bold m-0">{pipeline.name}</h3>
                    <div className="flex gap-3 items-center">
                      <span className="text-core-text-muted text-xs">
                        {(pipeline.opportunities || []).length} opportunities
                      </span>
                      <span className="text-core-amber text-sm font-bold">
                        ${(pipeline.opportunities || []).reduce((s, o) => s + Number(o.monetaryValue || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Stages as columns */}
                  {pipeline.stages && pipeline.stages.length > 0 && (
                    <div className="p-4 overflow-x-auto">
                      <div className="flex gap-3 min-w-max">
                        {pipeline.stages.map(stage => {
                          const stageOpps = (pipeline.opportunities || []).filter(o => o.stageId === stage.id)
                          return (
                            <div
                              key={stage.id}
                              className="min-w-[220px] bg-core-bg border border-core-border rounded-md overflow-hidden"
                            >
                              <div className="px-3 py-2 border-b border-core-border flex justify-between items-center">
                                <span className="text-core-text-dim text-xs font-semibold">{stage.name}</span>
                                <span className="px-1.5 py-px bg-core-green/10 rounded-full text-core-green text-[10px] font-bold">
                                  {stageOpps.length}
                                </span>
                              </div>
                              <div className="p-2 flex flex-col gap-1.5 max-h-[300px] overflow-y-auto">
                                {stageOpps.length === 0 ? (
                                  <div className="p-3 text-center text-core-text-muted text-[11px]">Empty</div>
                                ) : stageOpps.map(opp => (
                                  <div
                                    key={opp.id}
                                    className="px-2.5 py-2 bg-core-card border border-core-border rounded"
                                  >
                                    <div className="text-core-text text-xs font-medium">
                                      {opp.name || opp.contact?.firstName || 'Untitled'}
                                    </div>
                                    {opp.monetaryValue && (
                                      <div className="text-core-amber text-[11px] font-semibold mt-0.5">
                                        ${Number(opp.monetaryValue).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fallback: list view if no stages */}
                  {(!pipeline.stages || pipeline.stages.length === 0) && (pipeline.opportunities || []).length > 0 && (
                    <div className="p-4">
                      {(pipeline.opportunities || []).map(opp => (
                        <div
                          key={opp.id}
                          className="px-[14px] py-2.5 border-b border-core-border flex justify-between items-center last:border-b-0"
                        >
                          <span className="text-core-text text-[13px]">{opp.name || 'Untitled'}</span>
                          <span className="text-core-amber text-[13px] font-semibold">
                            ${Number(opp.monetaryValue || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conversations Tab */}
      {activeTab === 'conversations' && (
        <div>
          {loading ? (
            <LoadingState />
          ) : conversations.length === 0 ? (
            <EmptyState message="No conversations found in CRM" />
          ) : (
            <div className="bg-core-card border border-core-border rounded-lg overflow-hidden">
              {conversations.map((c, i) => (
                <div
                  key={c.id}
                  className={[
                    'px-5 py-[14px] flex justify-between items-center gap-4',
                    i < conversations.length - 1 ? 'border-b border-core-border' : '',
                  ].join(' ')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-core-text text-sm font-semibold">
                        {c.contactName || c.contactId || 'Unknown'}
                      </span>
                      {c.type && (
                        <span
                          className={[
                            'px-1.5 py-px rounded text-[10px] font-semibold',
                            c.type === 'Email'
                              ? 'bg-core-cyan/[.08] text-core-cyan'
                              : c.type === 'SMS'
                              ? 'bg-core-purple/[.08] text-core-purple'
                              : 'bg-core-green/[.08] text-core-green',
                          ].join(' ')}
                        >
                          {c.type}
                        </span>
                      )}
                      {c.unreadCount && c.unreadCount > 0 && (
                        <span className="w-[18px] h-[18px] rounded-full bg-core-green text-black text-[10px] font-bold flex items-center justify-center">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="text-core-text-dim text-xs overflow-hidden text-ellipsis whitespace-nowrap max-w-[500px]">
                      {c.lastMessageBody || 'No messages'}
                    </div>
                  </div>
                  <div className="text-core-text-muted text-[11px] whitespace-nowrap">
                    {c.lastMessageDate ? new Date(c.lastMessageDate).toLocaleDateString() : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="py-16 flex flex-col items-center gap-3">
      <RefreshCw size={32} className="animate-spin text-core-green" />
      <div className="text-core-text-muted text-[13px]">Loading CRM data...</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center bg-core-card border border-core-border rounded-lg flex flex-col items-center gap-3">
      <Inbox size={40} className="text-core-text-muted" />
      <div className="text-core-text-muted text-sm">{message}</div>
    </div>
  )
}
