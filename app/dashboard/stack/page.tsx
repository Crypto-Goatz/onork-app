'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface UsageData {
  used: number
  limit: number
  tier: string
}

interface StackJob {
  id: string
  file_name: string
  total_contacts: number
  no_crm_count: number
  status: 'complete' | 'processing' | 'pending' | 'failed'
  created_at: string
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  complete: { bg: 'rgba(110,224,90,0.15)', color: '#6EE05A', label: 'Complete' },
  processing: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', label: 'Processing' },
  pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Pending' },
  failed: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', label: 'Failed' },
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
      // Fetch usage
      const usageRes = await fetch('/api/stack/usage')
      if (usageRes.ok) {
        const u = await usageRes.json()
        setUsage(u)
      }

      // Fetch jobs from Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('stack_jobs')
          .select('id, file_name, total_contacts, no_crm_count, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        setJobs(data || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const usagePct = usage ? Math.min((usage.used / usage.limit) * 100, 100) : 0

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>

      {/* ═══ HEADER ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 800, color: 'var(--text-primary, #f0f4f8)',
            margin: 0, letterSpacing: '-0.02em',
          }}>
            0nStack — Lead Enrichment
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: '4px 0 0' }}>
            Bulk CRM detection and lead scoring
          </p>
        </div>
        <Link
          href="/dashboard/stack/upload"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10,
            background: '#6EE05A', color: '#0c1220',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + New Enrichment Run
        </Link>
      </div>

      {/* ═══ USAGE GAUGE ═══ */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 14, padding: '20px 24px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
            Contacts Enriched
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
              color: 'var(--text-primary, #f0f4f8)',
            }}>
              {usage ? `${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()}` : '---'}
            </span>
            {usage && (
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: 'rgba(110,224,90,0.15)', color: '#6EE05A',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {usage.tier}
              </span>
            )}
          </div>
        </div>
        <div style={{
          height: 8, borderRadius: 4, background: '#1c2b42', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${usagePct}%`,
            background: usagePct > 90 ? '#f87171' : usagePct > 70 ? '#fbbf24' : '#6EE05A',
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* ═══ JOB HISTORY ═══ */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #1c2b42',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0 }}>
            Enrichment History
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
            {jobs.length} run{jobs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{
              width: 28, height: 28, margin: '0 auto 12px',
              border: '2px solid #1c2b42', borderTopColor: '#6EE05A',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: 0 }}>Loading...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F50D;</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 6px' }}>
              No enrichment runs yet
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: '0 0 16px' }}>
              Upload a CSV to detect CRM usage and score your leads.
            </p>
            <Link
              href="/dashboard/stack/upload"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                color: '#6EE05A', fontSize: 14, fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Start your first run &rarr;
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1c2b42' }}>
                  {['File', 'Contacts', 'No CRM', 'Status', 'Date', ''].map((h) => (
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
                {jobs.map((job) => {
                  const s = STATUS_STYLES[job.status] || STATUS_STYLES.pending
                  const date = new Date(job.created_at)
                  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <tr key={job.id} style={{ borderBottom: '1px solid #1c2b42' }}>
                      <td style={{
                        padding: '12px 16px', fontSize: 14, fontWeight: 600,
                        color: 'var(--text-primary, #f0f4f8)', fontFamily: 'monospace',
                        maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {job.file_name}
                      </td>
                      <td style={{
                        padding: '12px 16px', fontSize: 14, fontFamily: 'monospace',
                        color: 'var(--text-secondary, #94a3b8)',
                      }}>
                        {job.total_contacts.toLocaleString()}
                      </td>
                      <td style={{
                        padding: '12px 16px', fontSize: 14, fontFamily: 'monospace',
                        color: job.no_crm_count > 0 ? '#f87171' : 'var(--text-muted, #6b7280)',
                      }}>
                        {job.no_crm_count.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                          fontSize: 12, fontWeight: 700, background: s.bg, color: s.color,
                        }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{
                        padding: '12px 16px', fontSize: 13, color: 'var(--text-muted, #6b7280)',
                      }}>
                        <span>{dateStr}</span>
                        <span style={{ opacity: 0.5, marginLeft: 6 }}>{timeStr}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {job.status === 'complete' && (
                          <Link
                            href={`/dashboard/stack/results/${job.id}`}
                            style={{
                              fontSize: 13, fontWeight: 600, color: '#6EE05A',
                              textDecoration: 'none',
                            }}
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
