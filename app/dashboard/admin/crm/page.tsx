'use client'

import { useEffect, useState, useCallback } from 'react'

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
  opportunities?: { id: string; name?: string; contact?: { firstName?: string; lastName?: string }; monetaryValue?: number; status?: string; stageId?: string; dateAdded?: string }[]
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
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--jp-green)', margin: 0, letterSpacing: -0.5 }}>
            CRM Live Dashboard
          </h1>
          <p style={{ color: 'var(--jp-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            Real-time data from your CRM location — auto-refreshes every 60s
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && (
            <span style={{ color: 'var(--jp-text-muted)', fontSize: 11 }}>
              Updated: {new Date(lastRefresh).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchAll}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: loading ? 'var(--jp-bg)' : 'linear-gradient(135deg, #7ed957, #5cb83a)',
              color: loading ? 'var(--jp-text-muted)' : '#000',
              border: loading ? '1px solid var(--jp-border)' : 'none',
              borderRadius: 'var(--jp-radius-xs)',
              fontSize: 12,
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {errors.map((err, i) => (
            <div key={i} style={{
              padding: '8px 14px',
              background: 'rgba(248, 113, 113, 0.06)',
              border: '1px solid rgba(248, 113, 113, 0.2)',
              borderRadius: 'var(--jp-radius-xs)',
              color: 'var(--jp-red)',
              fontSize: 12,
              marginBottom: 4,
            }}>
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Contacts', value: contacts.length, color: 'var(--jp-green)' },
          { label: 'Pipelines', value: pipelines.length, color: 'var(--jp-cyan)' },
          { label: 'Opportunities', value: totalOpps, color: 'var(--jp-purple)' },
          { label: 'Pipeline Value', value: `$${totalPipelineValue.toLocaleString()}`, color: 'var(--jp-amber)' },
          { label: 'Conversations', value: conversations.length, color: 'var(--jp-cyan)' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--jp-bg-card)',
            border: '1px solid var(--jp-border)',
            borderRadius: 'var(--jp-radius)',
            padding: 16,
          }}>
            <div style={{ color: 'var(--jp-text-muted)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid var(--jp-border)',
        marginBottom: 20,
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid var(--jp-green)' : '2px solid transparent',
              color: activeTab === t.key ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t.label}
            <span style={{
              padding: '1px 6px',
              background: activeTab === t.key ? 'rgba(126, 217, 87, 0.12)' : 'var(--jp-bg)',
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 700,
              color: activeTab === t.key ? 'var(--jp-green)' : 'var(--jp-text-muted)',
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                maxWidth: 400,
                padding: '10px 14px',
                background: 'var(--jp-bg-input)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius-xs)',
                color: 'var(--jp-text)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredContacts.length === 0 ? (
            <EmptyState message="No contacts found" />
          ) : (
            <div style={{
              background: 'var(--jp-bg-card)',
              border: '1px solid var(--jp-border)',
              borderRadius: 'var(--jp-radius)',
              overflow: 'hidden',
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Name', 'Email', 'Phone', 'Tags', 'Source', 'Added'].map(col => (
                        <th key={col} style={{
                          padding: '10px 14px',
                          textAlign: 'left',
                          color: 'var(--jp-text-muted)',
                          fontWeight: 600,
                          borderBottom: '1px solid var(--jp-border)',
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          whiteSpace: 'nowrap',
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--jp-border)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'rgba(126, 217, 87, 0.08)',
                              border: '1px solid rgba(126, 217, 87, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--jp-green)',
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}>
                              {(c.firstName || '?')[0].toUpperCase()}
                            </div>
                            <span style={{ color: 'var(--jp-text)', fontWeight: 500 }}>
                              {`${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--jp-text-secondary)' }}>{c.email || '-'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--jp-text-secondary)' }}>{c.phone || '-'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {(c.tags || []).slice(0, 3).map((tag, ti) => (
                              <span key={ti} style={{
                                padding: '1px 6px',
                                background: 'rgba(0, 212, 255, 0.08)',
                                borderRadius: 4,
                                color: 'var(--jp-cyan)',
                                fontSize: 10,
                              }}>
                                {tag}
                              </span>
                            ))}
                            {(c.tags || []).length > 3 && (
                              <span style={{ color: 'var(--jp-text-muted)', fontSize: 10 }}>+{(c.tags || []).length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--jp-text-muted)', fontSize: 11 }}>{c.source || '-'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--jp-text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {pipelines.map(pipeline => (
                <div key={pipeline.id} style={{
                  background: 'var(--jp-bg-card)',
                  border: '1px solid var(--jp-border)',
                  borderRadius: 'var(--jp-radius)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--jp-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <h3 style={{ color: 'var(--jp-text)', fontSize: 16, fontWeight: 700, margin: 0 }}>{pipeline.name}</h3>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ color: 'var(--jp-text-muted)', fontSize: 12 }}>
                        {(pipeline.opportunities || []).length} opportunities
                      </span>
                      <span style={{ color: 'var(--jp-amber)', fontSize: 14, fontWeight: 700 }}>
                        ${(pipeline.opportunities || []).reduce((s, o) => s + Number(o.monetaryValue || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Stages as columns */}
                  {pipeline.stages && pipeline.stages.length > 0 && (
                    <div style={{ padding: 16, overflowX: 'auto' }}>
                      <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
                        {pipeline.stages.map(stage => {
                          const stageOpps = (pipeline.opportunities || []).filter(o => o.stageId === stage.id)
                          return (
                            <div key={stage.id} style={{
                              minWidth: 220,
                              background: 'var(--jp-bg)',
                              border: '1px solid var(--jp-border)',
                              borderRadius: 'var(--jp-radius-sm)',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid var(--jp-border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}>
                                <span style={{ color: 'var(--jp-text-secondary)', fontSize: 12, fontWeight: 600 }}>{stage.name}</span>
                                <span style={{
                                  padding: '1px 6px',
                                  background: 'rgba(126, 217, 87, 0.1)',
                                  borderRadius: 10,
                                  color: 'var(--jp-green)',
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}>
                                  {stageOpps.length}
                                </span>
                              </div>
                              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                                {stageOpps.length === 0 ? (
                                  <div style={{ padding: 12, textAlign: 'center', color: 'var(--jp-text-muted)', fontSize: 11 }}>Empty</div>
                                ) : stageOpps.map(opp => (
                                  <div key={opp.id} style={{
                                    padding: '8px 10px',
                                    background: 'var(--jp-bg-card)',
                                    border: '1px solid var(--jp-border)',
                                    borderRadius: 'var(--jp-radius-xs)',
                                  }}>
                                    <div style={{ color: 'var(--jp-text)', fontSize: 12, fontWeight: 500 }}>
                                      {opp.name || opp.contact?.firstName || 'Untitled'}
                                    </div>
                                    {opp.monetaryValue && (
                                      <div style={{ color: 'var(--jp-amber)', fontSize: 11, fontWeight: 600, marginTop: 2 }}>
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
                    <div style={{ padding: 16 }}>
                      {(pipeline.opportunities || []).map(opp => (
                        <div key={opp.id} style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--jp-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <span style={{ color: 'var(--jp-text)', fontSize: 13 }}>{opp.name || 'Untitled'}</span>
                          <span style={{ color: 'var(--jp-amber)', fontSize: 13, fontWeight: 600 }}>
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
            <div style={{
              background: 'var(--jp-bg-card)',
              border: '1px solid var(--jp-border)',
              borderRadius: 'var(--jp-radius)',
              overflow: 'hidden',
            }}>
              {conversations.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: i < conversations.length - 1 ? '1px solid var(--jp-border)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: 'var(--jp-text)', fontSize: 14, fontWeight: 600 }}>
                        {c.contactName || c.contactId || 'Unknown'}
                      </span>
                      {c.type && (
                        <span style={{
                          padding: '1px 6px',
                          background: c.type === 'Email' ? 'rgba(0, 212, 255, 0.08)' : c.type === 'SMS' ? 'rgba(167, 139, 250, 0.08)' : 'rgba(126, 217, 87, 0.08)',
                          borderRadius: 4,
                          color: c.type === 'Email' ? 'var(--jp-cyan)' : c.type === 'SMS' ? 'var(--jp-purple)' : 'var(--jp-green)',
                          fontSize: 10,
                          fontWeight: 600,
                        }}>
                          {c.type}
                        </span>
                      )}
                      {c.unreadCount && c.unreadCount > 0 && (
                        <span style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: 'var(--jp-green)',
                          color: '#000',
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <div style={{
                      color: 'var(--jp-text-secondary)',
                      fontSize: 12,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 500,
                    }}>
                      {c.lastMessageBody || 'No messages'}
                    </div>
                  </div>
                  <div style={{ color: 'var(--jp-text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
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
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{
        width: 32,
        height: 32,
        border: '2px solid var(--jp-border)',
        borderTopColor: 'var(--jp-green)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 12px',
      }} />
      <div style={{ color: 'var(--jp-text-muted)', fontSize: 13 }}>Loading CRM data...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: 60,
      textAlign: 'center',
      background: 'var(--jp-bg-card)',
      border: '1px solid var(--jp-border)',
      borderRadius: 'var(--jp-radius)',
    }}>
      <svg width={40} height={40} fill="none" stroke="var(--jp-text-muted)" viewBox="0 0 24 24" strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <div style={{ color: 'var(--jp-text-muted)', fontSize: 14 }}>{message}</div>
    </div>
  )
}
