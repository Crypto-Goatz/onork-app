'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocation } from '@/lib/location-context'
import { Users, Tag, Loader2, AlertCircle, RefreshCw, Info } from 'lucide-react'

interface Contact {
  id: string
  tags?: string[]
  dateAdded?: string
}

interface Segment {
  name: string
  description: string
  count: number
  criteria: string
  kind: 'all' | 'recent' | 'tag'
}

const PAGE_LIMIT = 100

export default function SegmentsPage() {
  const { locationId, refreshKey } = useLocation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [segments, setSegments] = useState<Segment[]>([])
  const [total, setTotal] = useState(0)
  const [loadedCount, setLoadedCount] = useState(0)

  useEffect(() => { fetchSegments() }, [refreshKey])

  async function fetchSegments() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/crm/contacts?limit=${PAGE_LIMIT}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to load contacts')

      const contacts: Contact[] = data.contacts || []
      const realTotal: number = data.total || contacts.length
      setTotal(realTotal)
      setLoadedCount(contacts.length)

      // Real tag groupings computed from the actual contact tag arrays.
      const tagCounts = new Map<string, number>()
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      let recent = 0

      for (const c of contacts) {
        for (const raw of c.tags || []) {
          const tag = (raw || '').trim()
          if (!tag) continue
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        }
        if (c.dateAdded && new Date(c.dateAdded).getTime() >= weekAgo) recent++
      }

      const tagSegments: Segment[] = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({
          name: tag,
          description: `Contacts tagged "${tag}"`,
          count,
          criteria: `tags contains "${tag}"`,
          kind: 'tag' as const,
        }))

      const built: Segment[] = [
        {
          name: 'All Contacts',
          description: 'Every contact in your CRM location',
          count: realTotal,
          criteria: 'No filters applied',
          kind: 'all',
        },
        {
          name: 'New This Week',
          description: 'Contacts added in the last 7 days',
          count: recent,
          criteria: 'dateAdded >= 7 days ago',
          kind: 'recent',
        },
        ...tagSegments,
      ]

      setSegments(built)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  // Honest disclaimer: per-tag and recent counts are computed from the loaded
  // page of contacts. Only "All Contacts" reflects the CRM's true total.
  const sampled = total > loadedCount

  return (
    <div>
      <div className="jp-page-header flex justify-between items-start">
        <div>
          <h1 className="jp-page-title">Segments</h1>
          <p className="jp-page-subtitle">Real groupings built from your live CRM contacts and tags</p>
        </div>
        <button className="jp-btn jp-btn-outline" onClick={fetchSegments} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-core-green" />
        </div>
      ) : error ? (
        <div className="jp-card">
          <div className="jp-card-body text-center">
            <AlertCircle size={24} className="mx-auto mb-3 text-core-red" />
            <p className="mb-3 text-sm text-core-red">{error}</p>
            <button onClick={fetchSegments} className="jp-btn jp-btn-outline">Try again</button>
          </div>
        </div>
      ) : (
        <>
          {sampled && (
            <div className="mb-4 flex items-start gap-2 rounded-[var(--jp-radius-sm)] border border-core-border bg-core-bg px-4 py-3 text-[0.8125rem] text-core-text-muted">
              <Info size={16} className="shrink-0 mt-0.5 text-core-amber" />
              <span>
                The CRM API has no server-side tag filter, so tag and recency counts are computed from the{' '}
                <strong className="text-core-text">{loadedCount}</strong> most recent contacts loaded.{' '}
                <strong className="text-core-text">All Contacts</strong> ({total.toLocaleString()}) reflects the true total.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {segments.map((segment) => {
              const Icon = segment.kind === 'tag' ? Tag : Users
              const colorClass = segment.kind === 'tag' ? 'text-core-green' : 'text-core-text-dim'
              return (
                <Link key={`${segment.kind}-${segment.name}`} href="/dashboard/contacts" className="jp-card cursor-pointer no-underline">
                  <div className="jp-card-body flex items-center gap-5">
                    <div className={`w-11 h-11 rounded-[var(--jp-radius-sm)] bg-core-bg border border-core-border flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon size={20} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="text-[0.9375rem] font-semibold text-core-text">{segment.name}</span>
                      </div>
                      <p className="text-[0.8125rem] text-core-text-muted m-0">{segment.description}</p>
                    </div>
                    <div className="px-3.5 py-1.5 bg-core-bg border border-core-border rounded-[var(--jp-radius-sm)] text-center shrink-0">
                      <div className="text-lg font-bold text-core-text">
                        {segment.count.toLocaleString()}
                      </div>
                      <div className="text-[0.6875rem] text-core-text-muted">contacts</div>
                    </div>
                    <div className="text-xs text-core-text-muted font-mono bg-core-bg px-2.5 py-1.5 rounded-[var(--jp-radius-xs)] border border-core-border max-w-[280px] whitespace-nowrap overflow-hidden text-ellipsis shrink-0">
                      {segment.criteria}
                    </div>
                  </div>
                </Link>
              )
            })}

            {segments.length <= 2 && (
              <div className="jp-card">
                <div className="jp-card-body text-center text-sm text-core-text-muted">
                  No tags found on your loaded contacts yet. Tag contacts in the CRM to see them appear here as segments.
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
