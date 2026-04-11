'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface JobMeta {
  file_name: string
  total_contacts: number
  no_crm_count: number
  crm_detected: number
  skipped: number
  avg_confidence: number
  crm_breakdown: Record<string, number>
}

interface Contact {
  id: string
  email: string
  domain: string
  crm: string
  automation_platform: string
  review_platform: string
  opportunity_type: string
  score: number
}

const CRM_COLORS: Record<string, string> = {
  hubspot: '#FF7A59',
  activecampaign: '#356AE6',
  mailchimp: '#FFE01B',
  keap: '#2DC26B',
  zoho: '#E42527',
  salesforce: '#00A1E0',
  pipedrive: '#28292B',
  no_crm: '#f87171',
  none: '#f87171',
}

const FILTER_OPTIONS = ['All', 'No CRM', 'HubSpot', 'ActiveCampaign', 'Mailchimp', 'Keap', 'Zoho', 'Migration Opps']
const PAGE_SIZE = 25

export default function StackResults() {
  const params = useParams()
  const jobId = params.jobId as string

  const [meta, setMeta] = useState<JobMeta | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        jobId,
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      if (filter !== 'All') params.set('filter', filter.toLowerCase().replace(/ /g, '_'))
      if (search) params.set('search', search)

      const res = await fetch(`/api/stack/contacts?${params}`)
      const data = await res.json()
      if (res.ok) {
        setContacts(data.contacts || [])
        setTotal(data.total || 0)
        if (data.meta) setMeta(data.meta)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [jobId, page, filter, search])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // Reset page on filter/search change
  useEffect(() => { setPage(1) }, [filter, search])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const showStart = (page - 1) * PAGE_SIZE + 1
  const showEnd = Math.min(page * PAGE_SIZE, total)

  function crmColor(crm: string): string {
    const key = crm.toLowerCase().replace(/ /g, '_')
    return CRM_COLORS[key] || '#6EE05A'
  }

  function scoreColor(score: number): string {
    if (score >= 80) return '#6EE05A'
    if (score >= 60) return '#fbbf24'
    if (score >= 40) return '#fb923c'
    return '#f87171'
  }

  function renderCRMBars(breakdown: Record<string, number>) {
    const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) return null
    const max = entries[0][1]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map(([crm, count]) => {
          const isNoCrm = crm === 'no_crm' || crm === 'none'
          const pct = max > 0 ? (count / max) * 100 : 0
          return (
            <div key={crm} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 110, fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                color: isNoCrm ? '#f87171' : 'var(--text-primary, #f0f4f8)',
                textTransform: 'capitalize', flexShrink: 0,
              }}>
                {crm.replace(/_/g, ' ')}
              </span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#1c2b42', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, width: `${pct}%`,
                  background: isNoCrm ? '#f87171' : '#6EE05A',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{
                width: 48, fontSize: 13, fontFamily: 'monospace', fontWeight: 700,
                color: isNoCrm ? '#f87171' : '#6EE05A', textAlign: 'right', flexShrink: 0,
              }}>
                {count}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px' }}>

      {/* ═══ HEADER ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/dashboard/stack"
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid #1c2b42', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted, #6b7280)', textDecoration: 'none',
              fontSize: 16,
            }}
          >
            &larr;
          </Link>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 800, color: 'var(--text-primary, #f0f4f8)',
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Results
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: '2px 0 0' }}>
              {meta?.file_name || '...'} &mdash; {meta?.total_contacts.toLocaleString() || '...'} contacts
            </p>
          </div>
        </div>
        <a
          href={`/api/stack/bulk/${jobId}/export`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10,
            background: '#6EE05A', color: '#0c1220',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
          }}
        >
          Export Enriched CSV
        </a>
      </div>

      {/* ═══ KPI CARDS ═══ */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {[
          { label: 'Total', value: meta?.total_contacts, color: 'var(--text-primary, #f0f4f8)', suffix: '' },
          { label: 'No CRM', value: meta?.no_crm_count, color: '#f87171', suffix: meta ? ` (${Math.round((meta.no_crm_count / meta.total_contacts) * 100)}%)` : '' },
          { label: 'CRM Detected', value: meta?.crm_detected, color: '#6EE05A', suffix: '' },
          { label: 'Skipped', value: meta?.skipped, color: 'var(--text-muted, #6b7280)', suffix: '' },
          { label: 'Avg Confidence', value: meta?.avg_confidence != null ? `${meta.avg_confidence}%` : undefined, color: '#60a5fa', suffix: '' },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 12, padding: '16px', textAlign: 'center',
          }}>
            <div style={{
              fontSize: 26, fontWeight: 800, fontFamily: 'monospace', color: kpi.color,
              marginBottom: 2,
            }}>
              {kpi.value != null ? `${kpi.value}` : '---'}{kpi.suffix}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ CRM DISTRIBUTION ═══ */}
      {meta?.crm_breakdown && Object.keys(meta.crm_breakdown).length > 0 && (
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '20px 24px', marginBottom: 24,
        }}>
          <h3 style={{
            fontSize: 13, fontWeight: 700, color: 'var(--text-secondary, #94a3b8)',
            margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            CRM Distribution
          </h3>
          {renderCRMBars(meta.crm_breakdown)}
        </div>
      )}

      {/* ═══ FILTERS + SEARCH ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: filter === f ? '1px solid #6EE05A' : '1px solid #1c2b42',
              background: filter === f ? 'rgba(110,224,90,0.1)' : 'transparent',
              color: filter === f ? '#6EE05A' : 'var(--text-muted, #6b7280)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
          >
            {f}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email or domain..."
          style={{
            padding: '8px 14px', borderRadius: 8, width: 240,
            border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)',
            color: 'var(--text-primary, #f0f4f8)', fontSize: 13, outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* ═══ RESULTS TABLE ═══ */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 14, overflow: 'hidden', marginBottom: 24,
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{
              width: 28, height: 28, margin: '0 auto 12px',
              border: '2px solid #1c2b42', borderTopColor: '#6EE05A',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: 0 }}>Loading results...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>
              No contacts match
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: 0 }}>
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1c2b42' }}>
                  {['Email / Domain', 'CRM', 'Automation', 'Reviews', 'Opportunity', 'Score'].map((h) => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1c2b42' }}>
                    {/* Email / Domain */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, fontFamily: 'monospace',
                        color: 'var(--text-primary, #f0f4f8)',
                        maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.email}
                      </div>
                      {c.domain && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 1, fontFamily: 'monospace' }}>
                          {c.domain}
                        </div>
                      )}
                    </td>

                    {/* CRM pill */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                        fontSize: 12, fontWeight: 700,
                        background: `${crmColor(c.crm)}20`,
                        color: crmColor(c.crm),
                        textTransform: 'capitalize',
                      }}>
                        {c.crm ? c.crm.replace(/_/g, ' ') : 'Unknown'}
                      </span>
                    </td>

                    {/* Automation */}
                    <td style={{
                      padding: '12px 16px', fontSize: 13, fontFamily: 'monospace',
                      color: c.automation_platform ? 'var(--text-secondary, #94a3b8)' : 'var(--text-muted, #6b7280)',
                    }}>
                      {c.automation_platform || '\u2014'}
                    </td>

                    {/* Reviews */}
                    <td style={{
                      padding: '12px 16px', fontSize: 13, fontFamily: 'monospace',
                      color: c.review_platform ? 'var(--text-secondary, #94a3b8)' : 'var(--text-muted, #6b7280)',
                    }}>
                      {c.review_platform || '\u2014'}
                    </td>

                    {/* Opportunity type badge */}
                    <td style={{ padding: '12px 16px' }}>
                      {c.opportunity_type ? (
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                          fontSize: 11, fontWeight: 700,
                          background: c.opportunity_type === 'migration'
                            ? 'rgba(251,191,36,0.15)' : c.opportunity_type === 'new'
                            ? 'rgba(110,224,90,0.15)' : 'rgba(96,165,250,0.15)',
                          color: c.opportunity_type === 'migration'
                            ? '#fbbf24' : c.opportunity_type === 'new'
                            ? '#6EE05A' : '#60a5fa',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {c.opportunity_type}
                        </span>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>&mdash;</span>
                      )}
                    </td>

                    {/* Score */}
                    <td style={{
                      padding: '12px 16px', fontFamily: 'monospace',
                      fontSize: 15, fontWeight: 800,
                      color: scoreColor(c.score),
                    }}>
                      {c.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid #1c2b42',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
              Showing {showStart}&ndash;{showEnd} of {total.toLocaleString()}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  border: '1px solid #1c2b42', background: 'transparent',
                  color: page <= 1 ? '#374151' : 'var(--text-secondary, #94a3b8)',
                  fontSize: 12, fontWeight: 600, cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  border: '1px solid #1c2b42', background: 'transparent',
                  color: page >= totalPages ? '#374151' : 'var(--text-secondary, #94a3b8)',
                  fontSize: 12, fontWeight: 600, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
