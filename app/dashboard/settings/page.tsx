'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [mcpUrl, setMcpUrl] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || '')
        setFullName(user.user_metadata?.full_name || '')
      }
    })
  }, [supabase.auth])

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-core-text">Settings</h1>
        <p className="text-sm text-core-text-dim mt-1">Manage your account and connections.</p>
      </div>

      {/* Profile */}
      <div className="bg-core-card border border-core-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-core-text">Profile</h2>

        <div>
          <label className="block text-sm text-core-text-dim mb-1.5">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text focus:outline-none focus:border-core-green transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-core-text-dim mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text-muted cursor-not-allowed"
          />
        </div>

        <button className="bg-core-green text-core-bg font-medium text-sm px-4 py-2 rounded-lg hover:brightness-110 transition-all">
          Save Changes
        </button>
      </div>

      {/* 0nMCP Connection */}
      <div className="bg-core-card border border-core-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-core-text">0nMCP Connection</h2>
        <p className="text-sm text-core-text-dim">Configure your 0nMCP server endpoint for workflow execution.</p>

        <div>
          <label className="block text-sm text-core-text-dim mb-1.5">Server URL</label>
          <input
            type="url"
            value={mcpUrl}
            onChange={(e) => setMcpUrl(e.target.value)}
            placeholder="http://localhost:3001"
            className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-green transition-colors"
          />
        </div>

        <button className="bg-core-cyan/10 text-core-cyan border border-core-cyan/20 font-medium text-sm px-4 py-2 rounded-lg hover:bg-core-cyan/20 transition-all">
          Test Connection
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-core-card border border-red-500/20 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-core-red">Danger Zone</h2>
        <p className="text-sm text-core-text-dim">Permanently delete your account and all associated data.</p>
        <button className="bg-red-500/10 text-core-red border border-red-500/20 font-medium text-sm px-4 py-2 rounded-lg hover:bg-red-500/20 transition-all">
          Delete Account
        </button>
      </div>
    </div>
  )
}
