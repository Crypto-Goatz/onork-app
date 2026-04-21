"use client"

/**
 * /dashboard/cro9-engine — list of the user's CRO9 sites.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Plus, LineChart as LineChartIcon, Loader2, Globe, Activity, Clock,
  ExternalLink, AlertTriangle,
} from 'lucide-react'

interface SiteRow {
  id: string
  site_url: string
  domain: string
  status: string
  trial_ends_at: string | null
  last_run_at: string | null
  last_run_status: string | null
  last_run_summary: Record<string, unknown> | null
}

interface Entitlement { hasProductKey: boolean; activeSiteCount: number }

export default function Cro9Page() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [sites, setSites] = useState<SiteRow[]>([])
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setErr(null)
    try {
      const supa = createClient()
      const { data: { session } } = await supa.auth.getSession()
      if (!session) { setErr('Please sign in'); setLoading(false); return }
      const r = await fetch('/api/cro9/sites', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'load_failed')
      setSites(j.sites || [])
      setEntitlement(j.entitlement || null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
              <LineChartIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">CRO9 Neuro Engine</h1>
              <p className="text-sm text-muted-foreground">
                Daily AI ranking engine — GSC + SerpAPI + adaptive scoring, learning per site.
              </p>
            </div>
          </div>
          <Link href="/dashboard/cro9-engine/new"><Button className="gap-2"><Plus className="h-4 w-4" /> Add site</Button></Link>
        </div>

        {!entitlement?.hasProductKey && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="pt-6 flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">7-day free trial per site</div>
                  <p className="text-xs text-muted-foreground">
                    Add one site to try it free. Upgrade to <strong>$29/mo</strong> to keep your daily runs + unlimited briefs.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/marketplace?focus=cro9-neuro-engine"><Button size="sm" variant="outline">Upgrade</Button></Link>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        )}

        {err && (
          <Card className="mb-4 border-destructive/40 bg-destructive/5">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="text-sm text-destructive">{err}</div>
            </CardContent>
          </Card>
        )}

        {!loading && sites.length === 0 && !err && (
          <Card className="border-dashed">
            <CardContent className="pt-10 pb-10 text-center">
              <Globe className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <div className="text-sm font-medium mb-1">No sites yet</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5">
                Add your first site and we&rsquo;ll start a 7-day free trial. First analysis runs right after you finish onboarding.
              </p>
              <Link href="/dashboard/cro9-engine/new"><Button><Plus className="h-4 w-4 mr-2" /> Add first site</Button></Link>
            </CardContent>
          </Card>
        )}

        {!loading && sites.length > 0 && (
          <div className="grid gap-3">
            {sites.map((s) => (
              <Link key={s.id} href={`/dashboard/cro9-engine/${s.id}`}>
                <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                  <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{s.domain}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.site_url}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s.status} trialEndsAt={s.trial_ends_at} />
                      {s.last_run_at && (
                        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {new Date(s.last_run_at).toLocaleDateString()}
                        </span>
                      )}
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function StatusBadge({ status, trialEndsAt }: { status: string; trialEndsAt: string | null }) {
  if (status === 'active') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10" variant="outline">Active</Badge>
  if (status === 'trial') {
    const d = trialEndsAt ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)) : 0
    return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/40">Trial · {d}d left</Badge>
  }
  if (status === 'expired') return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/40">Expired</Badge>
  if (status === 'paused') return <Badge variant="outline" className="bg-muted text-muted-foreground">Paused</Badge>
  return <Badge variant="outline">{status}</Badge>
}
