'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ToolCard } from '@/components/command/tool-card'

interface ServiceDef {
  key: string
  name: string
  category: string
  description: string
  toolCount: number
  tools: Array<{ name: string; method: string; description: string; serviceName: string; service: string }>
}

export default function ServiceToolsPage({ params }: { params: Promise<{ service: string }> }) {
  const { service: serviceKey } = use(params)
  const [data, setData] = useState<ServiceDef | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tools/catalog?search=${encodeURIComponent(serviceKey + '_')}`)
      .then((r) => r.json())
      .then(({ tools }) => {
        if (!tools || tools.length === 0) {
          setData(null)
          return
        }
        // Filter to only tools whose service exactly matches
        const filtered = tools.filter((t: { service: string }) => t.service === serviceKey)
        if (filtered.length === 0) {
          setData(null)
          return
        }
        setData({
          key: serviceKey,
          name: filtered[0].serviceName,
          category: filtered[0].category,
          description: '',
          toolCount: filtered.length,
          tools: filtered,
        })
      })
      .finally(() => setLoading(false))
  }, [serviceKey])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white/40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-6 py-10 max-w-3xl mx-auto text-center">
        <p className="text-white/60">Service not found: <span className="font-mono">{serviceKey}</span></p>
        <Link href="/dashboard/tools" className="mt-3 inline-block text-sm text-[#7ed957] hover:underline">
          ← Back to all tools
        </Link>
      </div>
    )
  }

  return (
    <div className="px-6 py-5 max-w-6xl mx-auto">
      <Link href="/dashboard/tools" className="mb-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All services
      </Link>

      <div className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55 mb-1">
          {data.category}
        </div>
        <h1 className="text-2xl font-bold">{data.name}</h1>
        <p className="text-sm text-white/55 mt-1">{data.toolCount} tools</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.tools.map((t) => (
          <ToolCard key={t.name} {...t} />
        ))}
      </div>
    </div>
  )
}
