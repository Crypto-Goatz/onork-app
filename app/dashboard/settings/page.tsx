'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, AlertCircle, Database, Layers, Crown, RefreshCw, Save, Trash2 } from 'lucide-react'

interface ConnectionStatus {
  crm: { connected: boolean; locationId: string; contactCount: number | null; error: string }
  supabase: { connected: boolean; project: string }
  kLayers: { active: string[]; total: number }
  tier: { level: number; name: string }
}

const tierNames: Record<number, string> = {
  0: 'Lobby', 1: 'Front Office', 2: 'Operations Wing',
  3: 'Intelligence Suite', 4: 'The Vault', 5: 'The Penthouse',
}

function StatusDot({ status }: { status: 'connected' | 'error' | 'warning' }) {
  const colors = {
    connected: 'bg-core-green shadow-[0_0_6px_theme(colors.core-green)]',
    error: 'bg-core-red shadow-[0_0_6px_theme(colors.core-red)]',
    warning: 'bg-core-amber shadow-[0_0_6px_theme(colors.core-amber)]',
  }
  return <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
}

export default function SettingsPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [brandTone, setBrandTone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [checkingCrm, setCheckingCrm] = useState(false)
  const [crmTestResult, setCrmTestResult] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, business_name, brand_tone, crm_location_id, tier_level')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
        setBusinessName(profile.business_name || '')
        setBrandTone(profile.brand_tone || '')
      }

      const { data: kData } = await supabase
        .from('kb_content_queue')
        .select('layer')
        .eq('user_id', user.id)
        .eq('status', 'active')

      const { data: tierData } = await supabase
        .from('user_tiers')
        .select('tier_level, tier_name')
        .eq('user_id', user.id)
        .single()

      setStatus({
        crm: {
          connected: !!profile?.crm_location_id,
          locationId: profile?.crm_location_id || '',
          contactCount: null,
          error: '',
        },
        supabase: { connected: true, project: 'pwujhhmlrtxjmjzyttwn' },
        kLayers: {
          active: (kData || []).map(k => k.layer),
          total: 7,
        },
        tier: {
          level: tierData?.tier_level ?? 0,
          name: tierData?.tier_name || 'lobby',
        },
      })
    }
    load()
  }, [supabase])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await supabase.from('profiles').update({
      full_name: fullName,
      business_name: businessName,
      brand_tone: brandTone,
    }).eq('id', user.id)

    await supabase.from('kb_content_queue').upsert({
      user_id: user.id,
      layer: 'K1',
      content: {
        business_name: businessName,
        what_we_do: '',
        brand_tone: brandTone,
      },
      status: 'active',
    }, { onConflict: 'user_id,layer' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function testCrmConnection() {
    setCheckingCrm(true)
    setCrmTestResult(null)
    try {
      const res = await fetch('/api/crm/contacts?limit=1')
      const data = await res.json()
      if (res.ok && data.contacts) {
        setCrmTestResult(`Connected. ${data.total || data.contacts.length} contacts in location ${data.locationId}`)
        if (status) {
          setStatus({
            ...status,
            crm: { ...status.crm, connected: true, contactCount: data.total || data.contacts.length },
          })
        }
      } else {
        setCrmTestResult(`Error: ${data.error || 'Unknown'}`)
      }
    } catch (err) {
      setCrmTestResult(`Failed: ${err instanceof Error ? err.message : 'Network error'}`)
    }
    setCheckingCrm(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-core-text">Settings</h1>
        <p className="text-sm text-core-text-dim mt-1">Manage your account and connections.</p>
      </div>

      {/* Connection Status */}
      <div className="bg-core-card border border-core-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-core-text">Connection Status</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* CRM */}
          <div className={`p-4 rounded-lg border ${status?.crm.connected ? 'border-core-green/30 bg-core-green/5' : 'border-core-red/30 bg-core-red/5'}`}>
            <div className="flex items-center gap-2 mb-1">
              <StatusDot status={status?.crm.connected ? 'connected' : 'error'} />
              <span className="text-sm font-semibold text-core-text">CRM</span>
            </div>
            <p className="text-xs text-core-text-muted">
              {status?.crm.connected
                ? `Location: ${status.crm.locationId.slice(0, 8)}...`
                : 'Not connected'}
            </p>
            {status?.crm.contactCount !== null && (
              <p className="text-xs text-core-green mt-0.5">{status?.crm.contactCount} contacts</p>
            )}
          </div>

          {/* Supabase */}
          <div className="p-4 rounded-lg border border-core-green/30 bg-core-green/5">
            <div className="flex items-center gap-2 mb-1">
              <StatusDot status="connected" />
              <span className="text-sm font-semibold text-core-text">Supabase</span>
            </div>
            <p className="text-xs text-core-text-muted">Connected</p>
          </div>

          {/* K-Layers */}
          <div className={`p-4 rounded-lg border ${(status?.kLayers.active.length || 0) > 0 ? 'border-core-green/30 bg-core-green/5' : 'border-core-amber/30 bg-core-amber/5'}`}>
            <div className="flex items-center gap-2 mb-1">
              <StatusDot status={(status?.kLayers.active.length || 0) > 0 ? 'connected' : 'warning'} />
              <span className="text-sm font-semibold text-core-text">K-Layers</span>
            </div>
            <p className="text-xs text-core-text-muted">
              {status?.kLayers.active.length || 0}/{status?.kLayers.total || 7} active
            </p>
            {status?.kLayers.active.length ? (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {status.kLayers.active.map(k => (
                  <span key={k} className="text-[9px] px-1.5 py-px rounded bg-core-green/15 text-core-green font-semibold">{k}</span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Tier */}
          <div className="p-4 rounded-lg border border-core-purple/30 bg-core-purple/5">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-3 h-3 text-core-purple" />
              <span className="text-sm font-semibold text-core-text">Tier</span>
            </div>
            <p className="text-xs text-core-purple font-semibold">
              {tierNames[status?.tier.level ?? 0] || 'Lobby'} (Level {status?.tier.level ?? 0})
            </p>
          </div>
        </div>

        {/* CRM Test */}
        <div className="flex items-center gap-3">
          <button
            onClick={testCrmConnection}
            disabled={checkingCrm}
            className="flex items-center gap-2 bg-core-cyan/10 text-core-cyan border border-core-cyan/20 font-medium text-sm px-4 py-2 rounded-lg hover:bg-core-cyan/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingCrm ? 'animate-spin' : ''}`} />
            {checkingCrm ? 'Testing...' : 'Test CRM Connection'}
          </button>
          {crmTestResult && (
            <span className={`text-xs ${crmTestResult.startsWith('Connected') ? 'text-core-green' : 'text-core-red'}`}>
              {crmTestResult}
            </span>
          )}
        </div>
      </div>

      {/* Profile */}
      <div className="bg-core-card border border-core-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-core-text">Profile</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label className="block text-sm text-core-text-dim mb-1.5">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text focus:outline-none focus:border-core-green transition-colors"
            />
          </div>
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

        <div>
          <label className="block text-sm text-core-text-dim mb-1.5">Brand Tone</label>
          <select
            value={brandTone}
            onChange={(e) => setBrandTone(e.target.value)}
            className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text focus:outline-none focus:border-core-green transition-colors"
          >
            <option value="">Select tone...</option>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="bold">Bold</option>
            <option value="casual">Casual</option>
            <option value="luxurious">Luxurious</option>
            <option value="technical">Technical</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-core-green text-core-bg font-medium text-sm px-4 py-2 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && (
            <span className="text-xs text-core-green font-semibold">Saved</span>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-core-card border border-core-red/20 rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-core-red">Danger Zone</h2>
        <p className="text-sm text-core-text-dim">Permanently delete your account and all associated data.</p>
        <button className="flex items-center gap-2 bg-core-red/10 text-core-red border border-core-red/20 font-medium text-sm px-4 py-2 rounded-lg hover:bg-core-red/20 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
          Delete Account
        </button>
      </div>
    </div>
  )
}
