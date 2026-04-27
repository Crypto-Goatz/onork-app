'use client'

import { useState, useEffect } from 'react'
import { X, Package, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import type { CapabilityNodeType } from './CapabilityNode'

interface AppConfigModalProps {
  node: CapabilityNodeType
  onSave: (nodeId: string, config: Record<string, string>, installationId: string | null) => void
  onClose: () => void
}

interface AppDetail {
  id: string
  slug: string
  name: string
  description: string
  app_config: {
    config_schema?: { key: string; label: string; type: string; required?: boolean; default?: string | number | boolean; options?: { label: string; value: string }[]; description?: string }[]
    trigger?: { type: string; cron?: string; event?: string }
    steps?: { type: string }[]
  }
  required_plan: string
  required_services: string[]
}

export default function AppConfigModal({ node, onSave, onClose }: AppConfigModalProps) {
  const [app, setApp] = useState<AppDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<Record<string, string>>(node.data.config || {})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const appId = node.data.appId
  const installationId = node.data.installationId

  useEffect(() => {
    if (!appId) return
    fetch(`/api/marketplace/apps/${appId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.error)
        } else {
          setApp(d.app)
          // Hydrate defaults from config_schema
          const defaults: Record<string, string> = {}
          for (const f of d.app?.app_config?.config_schema || []) {
            if (f.default !== undefined) defaults[f.key] = String(f.default)
          }
          setConfig(prev => ({ ...defaults, ...prev }))
        }
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [appId])

  function handleField(key: string, value: string) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  async function handleInstall() {
    setSaving(true)
    try {
      const res = await fetch('/api/marketplace/install-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId, config_overrides: config }),
      })
      const data = await res.json()
      if (data.requires_payment && data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      if (data.installed) {
        onSave(node.id, config, data.installation_id)
        return
      }
      setError(data.error || 'Install failed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Install failed')
    } finally {
      setSaving(false)
    }
  }

  function handleSave() {
    onSave(node.id, config, installationId || null)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-[#0d1117] border border-white/[0.08] rounded-2xl p-6 max-w-md">
          <p className="text-red-400 mb-3">{error || 'App not found'}</p>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/[0.06] border-none text-white/70 cursor-pointer">Close</button>
        </div>
      </div>
    )
  }

  const fields = app.app_config?.config_schema || []
  const trigger = app.app_config?.trigger
  const stepCount = app.app_config?.steps?.length || 0
  const allRequiredFilled = fields.filter(f => f.required).every(f => (config[f.key] || '').trim())

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0d1117] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7ed957]/15 border border-[#7ed957]/30 flex items-center justify-center text-base font-bold text-[#7ed957]">
              {(node.data.icon as string) || app.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
                {app.name}
                <span className="text-[10px] px-1.5 py-px rounded bg-[#7ed957]/15 text-[#7ed957] uppercase tracking-wider">App</span>
              </h3>
              <p className="text-[11px] text-white/40">
                {trigger?.type || 'manual'}{trigger?.cron ? ` (${trigger.cron})` : ''} · {stepCount} step{stepCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] bg-transparent border-none cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Install warning */}
        {!installationId && (
          <div className="px-5 py-3 bg-yellow-500/10 border-b border-yellow-500/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-yellow-200">
              <p className="font-semibold mb-0.5">App not yet installed for your account.</p>
              <p>Configure it below and click Install, or save as a draft step until you install.</p>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <p className="text-[12px] text-white/60">{app.description}</p>
          {app.required_services.length > 0 && (
            <p className="text-[10px] text-white/40 mt-2">Connects to: {app.required_services.join(', ')}</p>
          )}
        </div>

        {/* Config fields */}
        <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
          {fields.length === 0 ? (
            <p className="text-[12px] text-white/40 text-center py-4">No configuration needed.</p>
          ) : (
            <div className="space-y-4">
              {fields.map(field => (
                <div key={field.key}>
                  <label className="block text-[12px] text-white/70 mb-1.5 font-medium">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  {field.type === 'select' && Array.isArray(field.options) ? (
                    <select
                      value={config[field.key] || String(field.default || '')}
                      onChange={e => handleField(field.key, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] outline-none focus:border-[#7ed957]/30 cursor-pointer [&>option]:bg-[#0d1117] [&>option]:text-white"
                    >
                      {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <button
                      onClick={() => handleField(field.key, config[field.key] === 'true' ? 'false' : 'true')}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-[13px] cursor-pointer transition-all ${
                        config[field.key] === 'true'
                          ? 'bg-[#7ed957]/10 border-[#7ed957]/30 text-[#7ed957]'
                          : 'bg-white/[0.02] border-white/[0.06] text-white/40'
                      }`}
                    >
                      {config[field.key] === 'true' ? 'Yes' : 'No'}
                    </button>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={config[field.key] || ''}
                      onChange={e => handleField(field.key, e.target.value)}
                      placeholder={field.description || ''}
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] placeholder:text-white/15 outline-none focus:border-[#7ed957]/30 transition-colors"
                    />
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'secret' ? 'password' : 'text'}
                      value={config[field.key] || ''}
                      onChange={e => handleField(field.key, e.target.value)}
                      placeholder={field.description || ''}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] placeholder:text-white/15 outline-none focus:border-[#7ed957]/30 transition-colors"
                    />
                  )}
                  {field.description && field.type !== 'textarea' && (
                    <p className="text-[10px] text-white/35 mt-1">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="px-5 py-2 bg-red-500/10 border-t border-red-500/20 text-[11px] text-red-300 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" /> {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <a
            href={`/dashboard/marketplace/${app.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-white/40 hover:text-white/70 inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> View app
          </a>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/[0.06] text-white/40 text-[12px] bg-transparent hover:text-white/70 cursor-pointer transition-colors">
              Cancel
            </button>
            {!installationId ? (
              <button
                onClick={handleInstall}
                disabled={saving || !allRequiredFilled}
                className="px-4 py-2 rounded-lg bg-[#7ed957] text-[#020810] text-[12px] font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-30 inline-flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                {saving ? 'Installing...' : 'Install & Save'}
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!allRequiredFilled}
                className="px-4 py-2 rounded-lg bg-[#7ed957] text-[#020810] text-[12px] font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-30"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
