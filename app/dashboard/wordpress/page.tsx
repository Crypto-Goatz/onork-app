'use client'

import { useState } from 'react'
import { FileText, Puzzle, Image, Palette, Globe } from 'lucide-react'

interface WPSite {
  id: string
  name: string
  url: string
  status: 'connected' | 'disconnected' | 'error'
  wpVersion?: string
  plugins?: number
  lastSync?: string
}

const FEATURES = [
  { title: 'Posts & Pages', desc: 'Create, edit, and publish content', icon: FileText },
  { title: 'Plugins', desc: 'Install, activate, and manage plugins', icon: Puzzle },
  { title: 'Media Library', desc: 'Upload and manage media files', icon: Image },
  { title: 'Themes', desc: 'Switch and customize themes', icon: Palette },
]

function statusColor(status: WPSite['status']) {
  if (status === 'connected') return 'text-core-green'
  if (status === 'error') return 'text-core-red'
  return 'text-core-text-muted'
}

export default function WordPressPage() {
  const [sites] = useState<WPSite[]>([])
  const [showConnect, setShowConnect] = useState(false)
  const [form, setForm] = useState({ url: '', apiKey: '', username: '' })

  return (
    <div className="max-w-[1100px] mx-auto px-2">

      {/* Connect Modal */}
      {showConnect && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowConnect(false)}
        >
          <div
            className="bg-core-card border border-core-border rounded-2xl p-7 max-w-[460px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-core-text mb-5">
              Connect WordPress Site
            </h2>

            <label className="block mb-3">
              <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-1">
                Site URL
              </span>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://mysite.com"
                className="w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none box-border"
              />
            </label>

            <label className="block mb-3">
              <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-1">
                Username
              </span>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="admin"
                className="w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none box-border"
              />
            </label>

            <label className="block mb-5">
              <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-1">
                Application Password
              </span>
              <input
                type="password"
                value={form.apiKey}
                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                className="w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none box-border"
              />
            </label>

            <p className="text-[11px] text-core-text-muted mb-4 leading-relaxed">
              Generate an Application Password in WordPress under Users &rarr; Profile &rarr; Application Passwords.
            </p>

            <div className="flex gap-2.5">
              <button className="flex-1 py-3 bg-gradient-to-br from-core-cyan to-teal-600 text-core-bg font-bold text-sm rounded-xl border-none cursor-pointer">
                Connect Site
              </button>
              <button
                onClick={() => setShowConnect(false)}
                className="px-5 py-3 rounded-xl border border-core-border bg-transparent text-core-text-muted text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-core-text m-0 flex items-center gap-2">
            WordPress Manager
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-core-green/10 text-core-green border border-core-green/20">
              UNLIMITED
            </span>
          </h1>
          <p className="text-[13px] text-core-text-muted mt-1">
            Connect and manage your WordPress sites
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-[11px] font-semibold text-core-green">Activated</span>
          <button
            onClick={() => setShowConnect(true)}
            className="px-5 py-2.5 bg-gradient-to-br from-core-cyan to-teal-600 text-core-bg font-bold text-[13px] rounded-xl border-none cursor-pointer"
          >
            + Connect Site
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 mb-6">
        {FEATURES.map(f => (
          <div
            key={f.title}
            className="bg-core-card border border-core-border rounded-xl p-5"
          >
            <f.icon className="w-6 h-6 text-core-text-muted opacity-50 mb-3" />
            <div className="text-sm font-semibold text-core-text mb-1">{f.title}</div>
            <div className="text-xs text-core-text-muted">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Sites List */}
      {sites.length === 0 ? (
        <div className="bg-core-card border border-core-border rounded-2xl px-10 py-16 text-center">
          <Globe className="w-10 h-10 text-core-text-muted opacity-30 mx-auto mb-4" />
          <p className="text-core-text-dim text-sm mb-2">No WordPress sites connected.</p>
          <p className="text-core-text-muted text-[13px] mb-4">
            Connect a WordPress site to manage content, plugins, and settings from here.
          </p>
          <button
            onClick={() => setShowConnect(true)}
            className="px-5 py-2.5 bg-gradient-to-br from-core-cyan to-teal-600 text-core-bg font-bold text-[13px] rounded-xl border-none cursor-pointer"
          >
            + Connect Site
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sites.map(s => (
            <div
              key={s.id}
              className="bg-core-card border border-core-border rounded-xl px-5 py-4 flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#21759b]/10 flex items-center justify-center text-lg font-bold text-[#21759b]">
                  W
                </div>
                <div>
                  <div className="text-sm font-semibold text-core-text">{s.name}</div>
                  <div className="text-xs text-core-text-muted">{s.url}</div>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                {s.wpVersion && (
                  <span className="text-[11px] text-core-text-muted">WP {s.wpVersion}</span>
                )}
                <span className={`text-[11px] font-semibold ${statusColor(s.status)}`}>
                  {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
