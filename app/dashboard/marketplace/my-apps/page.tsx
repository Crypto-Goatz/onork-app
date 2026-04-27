'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, Pause, Trash2, Settings, Loader2, Activity, Package, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Installation {
  id: string
  app_id: string
  status: 'active' | 'paused'
  config_overrides: Record<string, unknown>
  total_executions: number
  last_executed_at: string | null
  installed_at: string
  marketplace_apps: {
    id: string
    slug: string
    name: string
    description: string
    category: string
    icon: string | null
    version: string
    vendor_name: string
  }
}

export default function MyAppsPage() {
  const [installs, setInstalls] = useState<Installation[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    refresh()
  }, [userId])

  function refresh() {
    if (!userId) return
    setLoading(true)
    fetch(`/api/marketplace/my-apps?user_id=${userId}`)
      .then(r => r.json())
      .then(d => setInstalls(d.installations || []))
      .finally(() => setLoading(false))
  }

  async function toggleStatus(install: Installation) {
    if (!userId) return
    setActing(install.id)
    const newStatus = install.status === 'active' ? 'paused' : 'active'
    await fetch('/api/marketplace/my-apps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, app_id: install.app_id, status: newStatus }),
    })
    refresh()
    setActing(null)
  }

  async function uninstall(install: Installation) {
    if (!userId) return
    if (!confirm(`Uninstall ${install.marketplace_apps.name}? Triggers and config will be removed.`)) return
    setActing(install.id)
    await fetch(`/api/marketplace/my-apps?user_id=${userId}&app_id=${install.app_id}`, {
      method: 'DELETE',
    })
    refresh()
    setActing(null)
  }

  async function runNow(install: Installation) {
    if (!userId) return
    setActing(install.id)
    await fetch(`/api/marketplace/execute/${install.app_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, trigger: { source: 'manual_run' } }),
    })
    refresh()
    setActing(null)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/dashboard/marketplace" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition">
          <ArrowLeft className="h-4 w-4" /> Marketplace
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Apps</h1>
            <p className="text-white/60">Manage installed apps, pause triggers, run on demand.</p>
          </div>
          <Link
            href="/dashboard/marketplace"
            className="bg-[#7ed957] hover:bg-[#6bc847] text-black font-semibold rounded-lg px-4 py-2.5 text-sm transition"
          >
            Browse More
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : installs.length === 0 ? (
          <div className="text-center py-20 text-white/50">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="mb-4">You have no installed apps yet.</p>
            <Link href="/dashboard/marketplace" className="text-[#7ed957] hover:underline">Browse the marketplace →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {installs.map(install => {
              const app = install.marketplace_apps
              const isActing = acting === install.id
              return (
                <div key={install.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-xl font-semibold flex-shrink-0">
                      {app.icon || app.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{app.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          install.status === 'active'
                            ? 'bg-[#7ed957]/20 text-[#7ed957]'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {install.status}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 mb-3 line-clamp-2">{app.description}</p>
                      <div className="flex items-center gap-4 text-xs text-white/50">
                        <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{install.total_executions} runs</span>
                        {install.last_executed_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last: {new Date(install.last_executed_at).toLocaleDateString()}
                          </span>
                        )}
                        <span>v{app.version}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => runNow(install)}
                        disabled={isActing}
                        className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg p-2 transition"
                        title="Run now"
                      >
                        {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => toggleStatus(install)}
                        disabled={isActing}
                        className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg p-2 transition"
                        title={install.status === 'active' ? 'Pause' : 'Activate'}
                      >
                        {install.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-[#7ed957]" />}
                      </button>
                      <Link
                        href={`/dashboard/marketplace/${app.slug}`}
                        className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg p-2 transition"
                        title="Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => uninstall(install)}
                        disabled={isActing}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg p-2 text-red-400 transition"
                        title="Uninstall"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
