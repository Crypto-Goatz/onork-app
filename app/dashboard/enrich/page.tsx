'use client'

import { useState } from 'react'
import {
  Upload,
  Globe,
  Database,
  BarChart3,
  Mail,
  MessageSquare,
  CreditCard,
  Shield,
  AlertCircle,
  Download,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Result {
  ok: boolean
  input: string
  url?: string
  hostname?: string
  status?: number
  platform?: string
  crm?: string
  analytics: string[]
  chat: string[]
  email: string[]
  payments: string[]
  security: string[]
  detected_count: number
  gaps: string[]
  scan_id?: string | null
  elapsed_ms: number
  error?: string
}

const PLATFORM_BADGE: Record<string, string> = {
  WordPress: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  Shopify: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  Webflow: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  Squarespace: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
  Wix: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  Framer: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  'Next.js': 'bg-white/10 text-white border-white/30',
}

function csvCell(v: string): string {
  if (v == null) return ''
  const needs = /[",\n]/.test(v)
  return needs ? `"${v.replace(/"/g, '""')}"` : v
}

function buildCsv(rows: Result[]): string {
  const headers = [
    'input',
    'url',
    'hostname',
    'status',
    'platform',
    'crm',
    'analytics',
    'chat',
    'email',
    'payments',
    'security',
    'gaps',
    'detected_count',
    'error',
  ]
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.input),
        csvCell(r.url ?? ''),
        csvCell(r.hostname ?? ''),
        csvCell(r.status?.toString() ?? ''),
        csvCell(r.platform ?? ''),
        csvCell(r.crm ?? ''),
        csvCell(r.analytics.join('; ')),
        csvCell(r.chat.join('; ')),
        csvCell(r.email.join('; ')),
        csvCell(r.payments.join('; ')),
        csvCell(r.security.join('; ')),
        csvCell(r.gaps.join('; ')),
        csvCell(r.detected_count.toString()),
        csvCell(r.error ?? ''),
      ].join(','),
    )
  }
  return lines.join('\n')
}

export default function EnrichPage() {
  const [text, setText] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedUser, setSavedUser] = useState(false)

  async function runScan() {
    setError(null)
    setRunning(true)
    setResults([])
    setSavedUser(false)
    try {
      const res = await fetch('/api/scanner/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setResults(data.results || [])
      setSavedUser(!!data.saved_user)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  function downloadCsv() {
    const blob = new Blob([buildCsv(results)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `enrich-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const urlCount = text
    .split(/[\s,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean).length

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">List Enrichment</h1>
        <p className="mt-2 text-muted-foreground">
          Paste a list of websites. We&apos;ll detect each site&apos;s platform, CRM, analytics, chat,
          email, payments, and security stack — then flag the gaps you can fill.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Upload className="h-4 w-4" />
          Up to 50 URLs per run. Newline, comma, or space separated.
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'rocketopp.com\nshopify.com\nhubspot.com'}
          className="w-full h-48 rounded-md border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={running}
        />

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {urlCount} URL{urlCount === 1 ? '' : 's'} ready
            {urlCount > 50 && (
              <span className="ml-2 text-yellow-400">
                (only first 50 will scan)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={runScan}
              disabled={running || urlCount === 0}
              className="gap-2"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning…
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  Enrich list
                </>
              )}
            </Button>
            {results.length > 0 && (
              <Button variant="outline" onClick={downloadCsv} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            {error}
          </div>
        )}
      </Card>

      {results.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Results ({results.length})
            </h2>
            {savedUser && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Saved to your scans
              </Badge>
            )}
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Site</th>
                    <th className="px-4 py-3 font-medium">Platform</th>
                    <th className="px-4 py-3 font-medium">CRM</th>
                    <th className="px-4 py-3 font-medium">Analytics</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Chat</th>
                    <th className="px-4 py-3 font-medium">Payments</th>
                    <th className="px-4 py-3 font-medium">Security</th>
                    <th className="px-4 py-3 font-medium">Gaps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {r.ok ? (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {r.hostname}
                          </a>
                        ) : (
                          <div>
                            <div className="font-medium">{r.input}</div>
                            <div className="text-xs text-red-400">{r.error}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.platform ? (
                          <Badge
                            variant="outline"
                            className={PLATFORM_BADGE[r.platform] ?? ''}
                          >
                            {r.platform}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.crm ? (
                          <Badge variant="default" className="gap-1">
                            <Database className="h-3 w-3" />
                            {r.crm}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <CategoryCell items={r.analytics} icon={BarChart3} />
                      </td>
                      <td className="px-4 py-3">
                        <CategoryCell items={r.email} icon={Mail} />
                      </td>
                      <td className="px-4 py-3">
                        <CategoryCell items={r.chat} icon={MessageSquare} />
                      </td>
                      <td className="px-4 py-3">
                        <CategoryCell items={r.payments} icon={CreditCard} />
                      </td>
                      <td className="px-4 py-3">
                        <CategoryCell items={r.security} icon={Shield} />
                      </td>
                      <td className="px-4 py-3">
                        {r.gaps.length === 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          >
                            none
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {r.gaps.map((g) => (
                              <Badge
                                key={g}
                                variant="outline"
                                className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30"
                              >
                                {g}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function CategoryCell({
  items,
  icon: Icon,
}: {
  items: string[]
  icon: typeof Globe
}) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Icon className="h-3 w-3 text-muted-foreground" />
      {items.slice(0, 3).map((s) => (
        <Badge key={s} variant="secondary" className="text-xs">
          {s}
        </Badge>
      ))}
      {items.length > 3 && (
        <span className="text-xs text-muted-foreground">+{items.length - 3}</span>
      )}
    </div>
  )
}
