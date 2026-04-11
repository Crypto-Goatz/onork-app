'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ConnectionStatus {
  crm: { connected: boolean; locationId: string; contactCount: number | null; error: string }
  supabase: { connected: boolean; project: string }
  kLayers: { active: string[]; total: number }
  tier: { level: number; name: string }
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

      // Load K-layer status
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
        supabase: {
          connected: true,
          project: 'pwujhhmlrtxjmjzyttwn',
        },
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

    // Also update K1 if it exists
    await supabase.from('kb_content_queue').upsert({
      user_id: user.id,
      layer: 'K1',
      content: {
        business_name: businessName,
        what_we_do: '', // preserve existing
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

  const tierNames: Record<number, string> = {
    0: 'Lobby', 1: 'Front Office', 2: 'Operations Wing',
    3: 'Intelligence Suite', 4: 'The Vault', 5: 'The Penthouse',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-core-text">Settings</h1>
        <p className="text-sm text-core-text-dim mt-1">Manage your account and connections.</p>
      </div>

      {/* Connection Status */}
      <div className="bg-core-card border border-core-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-core-text">Connection Status</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* CRM */}
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            border: `1px solid ${status?.crm.connected ? 'rgba(110,224,90,0.3)' : 'rgba(239,68,68,0.3)'}`,
            background: status?.crm.connected ? 'rgba(110,224,90,0.05)' : 'rgba(239,68,68,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: status?.crm.connected ? '#6EE05A' : '#ef4444',
                boxShadow: status?.crm.connected ? '0 0 6px #6EE05A' : '0 0 6px #ef4444',
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>CRM</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>
              {status?.crm.connected
                ? `Location: ${status.crm.locationId.slice(0, 8)}...`
                : 'Not connected'}
            </div>
            {status?.crm.contactCount !== null && (
              <div style={{ fontSize: 11, color: '#6EE05A', marginTop: 2 }}>
                {status?.crm.contactCount} contacts
              </div>
            )}
          </div>

          {/* Supabase */}
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            border: '1px solid rgba(110,224,90,0.3)',
            background: 'rgba(110,224,90,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6EE05A', boxShadow: '0 0 6px #6EE05A' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>Supabase</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>Connected</div>
          </div>

          {/* K-Layers */}
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            border: `1px solid ${(status?.kLayers.active.length || 0) > 0 ? 'rgba(110,224,90,0.3)' : 'rgba(245,197,24,0.3)'}`,
            background: (status?.kLayers.active.length || 0) > 0 ? 'rgba(110,224,90,0.05)' : 'rgba(245,197,24,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: (status?.kLayers.active.length || 0) > 0 ? '#6EE05A' : '#f5c518',
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>K-Layers</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>
              {status?.kLayers.active.length || 0}/{status?.kLayers.total || 7} active
            </div>
            {status?.kLayers.active.length ? (
              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                {status.kLayers.active.map(k => (
                  <span key={k} style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 4,
                    background: 'rgba(110,224,90,0.15)', color: '#6EE05A', fontWeight: 600,
                  }}>{k}</span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Tier */}
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            border: '1px solid rgba(167,139,250,0.3)',
            background: 'rgba(167,139,250,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>Tier</span>
            </div>
            <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>
              {tierNames[status?.tier.level ?? 0] || 'Lobby'} (Level {status?.tier.level ?? 0})
            </div>
          </div>
        </div>

        {/* CRM Test */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={testCrmConnection}
            disabled={checkingCrm}
            className="bg-core-cyan/10 text-core-cyan border border-core-cyan/20 font-medium text-sm px-4 py-2 rounded-lg hover:bg-core-cyan/20 transition-all"
          >
            {checkingCrm ? 'Testing...' : 'Test CRM Connection'}
          </button>
          {crmTestResult && (
            <span style={{
              fontSize: 12,
              color: crmTestResult.startsWith('Connected') ? '#6EE05A' : '#ef4444',
            }}>
              {crmTestResult}
            </span>
          )}
        </div>
      </div>

      {/* Profile */}
      <div className="bg-core-card border border-core-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-core-text">Profile</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-core-green text-core-bg font-medium text-sm px-4 py-2 rounded-lg hover:brightness-110 transition-all"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && (
            <span style={{ fontSize: 12, color: '#6EE05A', fontWeight: 600 }}>Saved</span>
          )}
        </div>
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
