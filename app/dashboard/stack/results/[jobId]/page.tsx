'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'

interface JobMeta {
  source_filename: string
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
      const qs = new URLSearchParams({
        jobId,
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      if (filter !== 'All') qs.set('filter', filter.toLowerCase().replace(/ /g, '_'))
      if (search) qs.set('search', search)

      const res = await fetch(`/api/stack/contacts?${qs}`)
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

  useEffect(() => { setPage(1) }, [filter, search])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const showStart = (page - 1) * PAGE_SIZE + 1
  const showEnd = Math.min(page * PAGE_SIZE, total)

  function crmColor(crm: string): string {
    const key = crm.toLowerCase().replace(/ /g, '_')
    return CRM_COLORS[key] || '#6EE05A'
  }

  function scoreColorClass(score: number): string {
    if (score >= 80) return 'text-core-green'
    if (score >= 60) return 'text-core-amber'
    if (score >= 40) return 'text-orange-400'
    return 'text-core-red'
  }

  function renderCRMBars(breakdown: Record<string, number>) {
    const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) return null
    const max = entries[0][1]

    return (
      <div className="flex flex-col gap-2">
        {entries.map(([crm, count]) => {
          const isNoCrm = crm === 'no_crm' || crm === 'none'
          const pct = max > 0 ? (count / max) * 100 : 0
          return (
            <div key={crm} className="flex items-center gap-3">
              <span
                className={[
                  'w-[110px] shrink-0 text-xs font-semibold font-mono capitalize',
                  isNoCrm ? 'text-core-red' : 'text-core-text',
                ].join(' ')}
              >
                {crm.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 h-2 rounded-full bg-core-bg overflow-hidden">
                <div
                  className={['h-full rounded-full transition-all duration-300', isNoCrm ? 'bg-core-red' : 'bg-core-green'].join(' ')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span
                className={[
                  'w-12 shrink-0 text-right text-[13px] font-bold font-mono',
                  isNoCrm ? 'text-core-red' : 'text-core-green',
                ].join(' ')}
              >
                {count}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto px-2">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/stack"
            className="w-8 h-8 rounded-lg border border-core-border bg-transparent flex items-center justify-center text-core-text-muted hover:text-core-text transition-colors"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-core-text tracking-tight leading-none">
              Results
            </h1>
            <p className="text-[13px] text-core-text-muted mt-0.5">
              {meta?.source_filename || '...'} &mdash; {meta?.total_contacts.toLocaleString() || '...'} contacts
            </p>
          </div>
        </div>
        <a
          href={`/api/stack/bulk/${jobId}/export`}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-core-green text-[#0c1220] font-bold text-sm no-underline hover:opacity-90 transition-opacity"
        >
          <Download size={14} />
          Export Enriched CSV
        </a>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-6">
        {[
          { label: 'Total', value: meta?.total_contacts, cls: 'text-core-text', suffix: '' },
          {
            label: 'No CRM',
            value: meta?.no_crm_count,
            cls: 'text-core-red',
            suffix: meta ? ` (${Math.round((meta.no_crm_count / meta.total_contacts) * 100)}%)` : '',
          },
          { label: 'CRM Detected', value: meta?.crm_detected, cls: 'text-core-green', suffix: '' },
          { label: 'Skipped', value: meta?.skipped, cls: 'text-core-text-muted', suffix: '' },
          {
            label: 'Avg Confidence',
            value: meta?.avg_confidence != null ? `${meta.avg_confidence}%` : undefined,
            cls: 'text-core-cyan',
            suffix: '',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-core-card border border-core-border rounded-xl p-4 text-center"
          >
            <div className={`text-[26px] font-extrabold font-mono mb-0.5 ${kpi.cls}`}>
              {kpi.value != null ? `${kpi.value}` : '---'}{kpi.suffix}
            </div>
            <div className="text-[11px] font-semibold text-core-text-muted uppercase tracking-[0.05em]">
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* CRM DISTRIBUTION */}
      {meta?.crm_breakdown && Object.keys(meta.crm_breakdown).length > 0 && (
        <div className="bg-core-card border border-core-border rounded-[14px] px-6 py-5 mb-6">
          <h3 className="text-[13px] font-bold text-core-text-dim uppercase tracking-[0.05em] mb-3.5">
            CRM Distribution
          </h3>
          {renderCRMBars(meta.crm_breakdown)}
        </div>
      )}

      {/* FILTERS + SEARCH */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
              filter === f
                ? 'border-core-green bg-core-green/10 text-core-green'
                : 'border-core-border bg-transparent text-core-text-muted hover:text-core-text',
            ].join(' ')}
          >
            {f}
          </button>
        ))}

        <div className="flex-1" />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email or domain..."
          className="px-3.5 py-2 rounded-lg w-60 border border-core-border bg-core-bg text-core-text text-[13px] outline-none placeholder:text-core-text-muted focus:border-core-green/50 transition-colors"
        />
      </div>

      {/* RESULTS TABLE */}
      <div className="bg-core-card border border-core-border rounded-[14px] overflow-hidden mb-6">
        {loading ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div
              className="w-7 h-7 rounded-full border-2 border-core-border border-t-core-green"
              style={{ animation: 'spin 0.8s linear infinite' }}
            />
            <p className="text-[13px] text-core-text-muted m-0">Loading results...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <p className="text-[15px] font-semibold text-core-text mb-1">No contacts match</p>
            <p className="text-[13px] text-core-text-muted">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-core-border">
                  {['Email / Domain', 'CRM', 'Automation', 'Reviews', 'Opportunity', 'Score'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold text-core-text-muted uppercase tracking-[0.05em]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b border-core-border hover:bg-core-card-hover transition-colors">

                    {/* Email / Domain */}
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-semibold font-mono text-core-text max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {c.email}
                      </div>
                      {c.domain && (
                        <div className="text-[11px] text-core-text-muted mt-px font-mono">
                          {c.domain}
                        </div>
                      )}
                    </td>

                    {/* CRM pill */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold capitalize"
                        style={{
                          background: `${crmColor(c.crm)}20`,
                          color: crmColor(c.crm),
                        }}
                      >
                        {c.crm ? c.crm.replace(/_/g, ' ') : 'Unknown'}
                      </span>
                    </td>

                    {/* Automation */}
                    <td className={[
                      'px-4 py-3 text-[13px] font-mono',
                      c.automation_platform ? 'text-core-text-dim' : 'text-core-text-muted',
                    ].join(' ')}>
                      {c.automation_platform || '\u2014'}
                    </td>

                    {/* Reviews */}
                    <td className={[
                      'px-4 py-3 text-[13px] font-mono',
                      c.review_platform ? 'text-core-text-dim' : 'text-core-text-muted',
                    ].join(' ')}>
                      {c.review_platform || '\u2014'}
                    </td>

                    {/* Opportunity type badge */}
                    <td className="px-4 py-3">
                      {c.opportunity_type ? (
                        <span
                          className={[
                            'inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-[0.05em]',
                            c.opportunity_type === 'migration'
                              ? 'bg-core-amber/15 text-core-amber'
                              : c.opportunity_type === 'new'
                              ? 'bg-core-green/15 text-core-green'
                              : 'bg-core-cyan/15 text-core-cyan',
                          ].join(' ')}
                        >
                          {c.opportunity_type}
                        </span>
                      ) : (
                        <span className="text-[13px] text-core-text-muted">&mdash;</span>
                      )}
                    </td>

                    {/* Score */}
                    <td className={`px-4 py-3 font-mono text-[15px] font-extrabold ${scoreColorClass(c.score)}`}>
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
          <div className="px-4 py-3 border-t border-core-border flex items-center justify-between">
            <span className="text-xs text-core-text-muted">
              Showing {showStart}&ndash;{showEnd} of {total.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={[
                  'px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
                  page <= 1
                    ? 'border-core-border text-[#374151] cursor-not-allowed'
                    : 'border-core-border text-core-text-dim hover:text-core-text cursor-pointer',
                ].join(' ')}
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={[
                  'px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
                  page >= totalPages
                    ? 'border-core-border text-[#374151] cursor-not-allowed'
                    : 'border-core-border text-core-text-dim hover:text-core-text cursor-pointer',
                ].join(' ')}
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
