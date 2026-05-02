'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Plus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface UsageData {
  contactsUsed: number
  contactsLimit: number
  contactsRemaining: number
  percentUsed: number
  tier: string
}

interface StackJob {
  id: string
  source_filename: string
  total_contacts: number
  no_crm_count: number
  status: 'complete' | 'processing' | 'pending' | 'failed'
  created_at: string
}

const STATUS_CLASSES: Record<string, { badge: string; label: string }> = {
  complete:   { badge: 'bg-core-green/15 text-core-green',   label: 'Complete' },
  processing: { badge: 'bg-blue-500/15 text-blue-400',       label: 'Processing' },
  pending:    { badge: 'bg-core-amber/15 text-core-amber',   label: 'Pending' },
  failed:     { badge: 'bg-core-red/15 text-core-red',       label: 'Failed' },
}

export default function StackDashboard() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [jobs, setJobs] = useState<StackJob[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const usageRes = await fetch('/api/stack/usage')
      if (usageRes.ok) {
        const u = await usageRes.json()
        setUsage(u)
      }

      const { data: { session: __sess } } = await supabase.auth.getSession()
  const user = __sess?.user ?? null
      if (user) {
        const { data } = await supabase
          .from('stack_jobs')
          .select('id, source_filename, total_contacts, no_crm_count, status, created_at')
          .eq('onmcp_user_id', user.id)
          .order('created_at', { ascending: false })
        setJobs(data || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const usagePct = usage ? usage.percentUsed : 0

  const barColor =
    usagePct > 90 ? 'bg-core-red' :
    usagePct > 70 ? 'bg-core-amber' :
    'bg-core-green'

  return (
    <div className="max-w-[1100px] mx-auto px-2">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-core-text tracking-tight m-0">
            0nStack — Lead Enrichment
          </h1>
          <p className="text-[13px] text-core-text-muted mt-1 mb-0">
            Bulk CRM detection and lead scoring
          </p>
        </div>
        <Link
          href="/dashboard/stack/upload"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-core-green text-[#0c1220] font-bold text-sm no-underline"
        >
          <Plus className="w-4 h-4" />
          New Enrichment Run
        </Link>
      </div>

      {/* ═══ USAGE GAUGE ═══ */}
      <div className="bg-core-card border border-core-border rounded-2xl px-6 py-5 mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-semibold text-core-text-dim">
            Contacts Enriched
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[14px] font-bold text-core-text">
              {usage
                ? `${usage.contactsUsed.toLocaleString()} / ${usage.contactsLimit.toLocaleString()}`
                : '---'}
            </span>
            {usage && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-core-green/15 text-core-green uppercase tracking-wide">
                {usage.tier}
              </span>
            )}
          </div>
        </div>
        <div className="h-2 rounded-full bg-core-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-[600ms] ease-in-out ${barColor}`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
      </div>

      {/* ═══ JOB HISTORY ═══ */}
      <div className="bg-core-card border border-core-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-core-border flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-core-text m-0">
            Enrichment History
          </h2>
          <span className="text-[12px] text-core-text-muted">
            {jobs.length} run{jobs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 text-core-green animate-spin" />
            <p className="text-[13px] text-core-text-muted m-0">Loading...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-12 px-6 flex flex-col items-center text-center">
            <Search className="w-9 h-9 text-core-text-muted mb-3" />
            <p className="text-[15px] font-semibold text-core-text m-0 mb-1.5">
              No enrichment runs yet
            </p>
            <p className="text-[13px] text-core-text-muted m-0 mb-4">
              Upload a CSV to detect CRM usage and score your leads.
            </p>
            <Link
              href="/dashboard/stack/upload"
              className="inline-flex items-center gap-1 text-core-green text-sm font-semibold no-underline"
            >
              Start your first run &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-core-border">
                  {['File', 'Contacts', 'No CRM', 'Status', 'Date', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold text-core-text-muted uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const s = STATUS_CLASSES[job.status] || STATUS_CLASSES.pending
                  const date = new Date(job.created_at)
                  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <tr key={job.id} className="border-b border-core-border">
                      <td className="px-4 py-3 text-sm font-semibold text-core-text font-mono max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {job.source_filename}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-core-text-dim">
                        {job.total_contacts.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-sm font-mono ${job.no_crm_count > 0 ? 'text-core-red' : 'text-core-text-muted'}`}>
                        {job.no_crm_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[12px] font-bold ${s.badge}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-core-text-muted">
                        <span>{dateStr}</span>
                        <span className="opacity-50 ml-1.5">{timeStr}</span>
                      </td>
                      <td className="px-4 py-3">
                        {job.status === 'complete' && (
                          <Link
                            href={`/dashboard/stack/results/${job.id}`}
                            className="text-[13px] font-semibold text-core-green no-underline"
                          >
                            View &rarr;
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
