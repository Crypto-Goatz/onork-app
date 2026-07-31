'use client'

import { useState } from 'react'
import {
  Zap,
  MessageSquare,
  BarChart2,
  FileText,
  Bell,
  Globe,
  Lock,
  Smartphone,
  Download,
  ToggleLeft,
  ToggleRight,
  Package,
} from 'lucide-react'

const MODULES = [
  {
    key: 'executor',
    icon: Zap,
    name: 'Workflow Executor',
    description: 'Run .0n workflows from your home screen app.',
    color: 'text-[#7ed957]',
    border: 'border-[#7ed957]/20',
    bg: 'bg-[#7ed957]/5',
  },
  {
    key: 'chat',
    icon: MessageSquare,
    name: 'AI Chat',
    description: 'Claude-powered chat with tool access built in.',
    color: 'text-[#a78bfa]',
    border: 'border-[#a78bfa]/20',
    bg: 'bg-[#a78bfa]/5',
  },
  {
    key: 'analytics',
    icon: BarChart2,
    name: 'Analytics Dashboard',
    description: 'Live CRO9 metrics for your connected properties.',
    color: 'text-[#00d4ff]',
    border: 'border-[#00d4ff]/20',
    bg: 'bg-[#00d4ff]/5',
  },
  {
    key: 'content',
    icon: FileText,
    name: 'Content Engine',
    description: 'Draft, approve, and publish content across channels.',
    color: 'text-[#f59e0b]',
    border: 'border-[#f59e0b]/20',
    bg: 'bg-[#f59e0b]/5',
  },
  {
    key: 'notifications',
    icon: Bell,
    name: 'Smart Alerts',
    description: 'Push notifications triggered by CRM events and workflows.',
    color: 'text-[#ef4444]',
    border: 'border-[#ef4444]/20',
    bg: 'bg-[#ef4444]/5',
  },
  {
    key: 'crm',
    icon: Globe,
    name: 'CRM Quick Actions',
    description: 'One-tap contact lookup, note logging, and pipeline moves.',
    color: 'text-[#7ed957]',
    border: 'border-[#7ed957]/20',
    bg: 'bg-[#7ed957]/5',
  },
  {
    key: 'vault',
    icon: Lock,
    name: 'Vault Access',
    description: 'Decrypt and view .0nv containers from your device.',
    color: 'text-[#00d4ff]',
    border: 'border-[#00d4ff]/20',
    bg: 'bg-[#00d4ff]/5',
  },
  {
    key: 'pwa',
    icon: Smartphone,
    name: 'PWA Shell',
    description: 'Offline-capable wrapper with install-to-home-screen support.',
    color: 'text-[#a78bfa]',
    border: 'border-[#a78bfa]/20',
    bg: 'bg-[#a78bfa]/5',
  },
]

export default function BuildPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    executor: true,
    chat: true,
    pwa: true,
  })

  const count = Object.values(enabled).filter(Boolean).length

  function toggle(key: string) {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleExport() {
    const selected = MODULES.filter((m) => enabled[m.key]).map((m) => m.name)
    alert(`Exporting app with: ${selected.join(', ')}\n\n(Full export coming soon — will generate a self-contained HTML file.)`)
  }

  return (
    <div className="min-h-screen bg-[#020810] flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7ed957]/10 border border-[#7ed957]/20 rounded-full text-xs font-semibold text-[#7ed957] mb-5">
            <Package className="w-3.5 h-3.5" />
            App Builder
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-3">
            Build Your{' '}
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              0n App
            </span>
          </h1>
          <p className="text-sm text-white/45 max-w-md mx-auto">
            Pick your tools, export a single file, save to any home screen.
          </p>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {MODULES.map((mod) => {
            const Icon = mod.icon
            const on = !!enabled[mod.key]
            const Toggle = on ? ToggleRight : ToggleLeft
            return (
              <button
                key={mod.key}
                onClick={() => toggle(mod.key)}
                className={`text-left flex items-start gap-4 p-5 rounded-xl border transition-all ${
                  on
                    ? `${mod.bg} ${mod.border}`
                    : 'bg-white/[0.02] border-white/10 opacity-50 hover:opacity-70'
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${on ? mod.color : 'text-white/45'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${on ? 'text-white' : 'text-white/45'}`}>
                      {mod.name}
                    </span>
                    <Toggle className={`w-5 h-5 shrink-0 ${on ? mod.color : 'text-white/45'}`} />
                  </div>
                  <p className="text-[11px] text-white/45 mt-1 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Export bar */}
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-white">
              {count} module{count !== 1 ? 's' : ''} selected
            </div>
            <div className="text-xs text-white/45 mt-0.5">
              Exports as a single self-contained HTML file (~{Math.max(80, count * 45)}KB)
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={count === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#7ed957] text-[#020810] font-bold text-xs rounded-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export App
          </button>
        </div>

        <p className="text-center text-xs text-white/45 mt-6">
          The exported file runs offline, installs to any home screen, and connects to your 0nMCP account on first launch.
        </p>

      </div>
    </div>
  )
}
