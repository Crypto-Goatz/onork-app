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
    color: 'text-core-green',
    border: 'border-core-green/20',
    bg: 'bg-core-green/5',
  },
  {
    key: 'chat',
    icon: MessageSquare,
    name: 'AI Chat',
    description: 'Claude-powered chat with tool access built in.',
    color: 'text-core-purple',
    border: 'border-core-purple/20',
    bg: 'bg-core-purple/5',
  },
  {
    key: 'analytics',
    icon: BarChart2,
    name: 'Analytics Dashboard',
    description: 'Live CRO9 metrics for your connected properties.',
    color: 'text-core-cyan',
    border: 'border-core-cyan/20',
    bg: 'bg-core-cyan/5',
  },
  {
    key: 'content',
    icon: FileText,
    name: 'Content Engine',
    description: 'Draft, approve, and publish content across channels.',
    color: 'text-core-amber',
    border: 'border-core-amber/20',
    bg: 'bg-core-amber/5',
  },
  {
    key: 'notifications',
    icon: Bell,
    name: 'Smart Alerts',
    description: 'Push notifications triggered by CRM events and workflows.',
    color: 'text-core-red',
    border: 'border-core-red/20',
    bg: 'bg-core-red/5',
  },
  {
    key: 'crm',
    icon: Globe,
    name: 'CRM Quick Actions',
    description: 'One-tap contact lookup, note logging, and pipeline moves.',
    color: 'text-core-green',
    border: 'border-core-green/20',
    bg: 'bg-core-green/5',
  },
  {
    key: 'vault',
    icon: Lock,
    name: 'Vault Access',
    description: 'Decrypt and view .0nv containers from your device.',
    color: 'text-core-cyan',
    border: 'border-core-cyan/20',
    bg: 'bg-core-cyan/5',
  },
  {
    key: 'pwa',
    icon: Smartphone,
    name: 'PWA Shell',
    description: 'Offline-capable wrapper with install-to-home-screen support.',
    color: 'text-core-purple',
    border: 'border-core-purple/20',
    bg: 'bg-core-purple/5',
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
    <div className="min-h-screen bg-core-bg flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-core-green/10 border border-core-green/20 rounded-full text-xs font-semibold text-core-green mb-5">
            <Package className="w-3.5 h-3.5" />
            App Builder
          </div>
          <h1 className="text-3xl font-bold text-core-text mb-3">
            Build Your 0n App
          </h1>
          <p className="text-sm text-core-text-muted max-w-md mx-auto">
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
                    : 'bg-core-card border-core-border opacity-50 hover:opacity-70'
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${on ? mod.color : 'text-core-text-muted'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${on ? 'text-core-text' : 'text-core-text-muted'}`}>
                      {mod.name}
                    </span>
                    <Toggle className={`w-5 h-5 shrink-0 ${on ? mod.color : 'text-core-text-muted'}`} />
                  </div>
                  <p className="text-[11px] text-core-text-muted mt-1 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Export bar */}
        <div className="bg-core-card border border-core-border rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-core-text">
              {count} module{count !== 1 ? 's' : ''} selected
            </div>
            <div className="text-xs text-core-text-muted mt-0.5">
              Exports as a single self-contained HTML file (~{Math.max(80, count * 45)}KB)
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={count === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-core-green text-core-bg font-bold text-xs rounded-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export App
          </button>
        </div>

        <p className="text-center text-xs text-core-text-muted mt-6">
          The exported file runs offline, installs to any home screen, and connects to your 0nMCP account on first launch.
        </p>

      </div>
    </div>
  )
}
