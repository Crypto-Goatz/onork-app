'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check } from 'lucide-react'

interface WhiteLabelConfig {
  enabled: boolean
  appName: string
  logoUrl: string
  faviconUrl: string
  primaryColor: string
  accentColor: string
  customDomain: string
  hideFooterBranding: boolean
  customEmailFrom: string
  customSupportEmail: string
}

const DEFAULT_CONFIG: WhiteLabelConfig = {
  enabled: false,
  appName: '0nCore',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: 'var(--color-cyan, #14b8a6)',
  accentColor: '#8b5cf6',
  customDomain: '',
  hideFooterBranding: false,
  customEmailFrom: '',
  customSupportEmail: '',
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] text-core-text-muted mb-1.5 font-semibold uppercase tracking-[0.06em]">
      {children}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-[11px] bg-core-surface border border-core-border rounded-lg text-core-text text-[14px] outline-none focus:border-core-cyan transition-colors"
    />
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={[
        'relative w-12 h-[26px] rounded-full border-none cursor-pointer transition-colors duration-200 shrink-0',
        on ? 'bg-core-cyan' : 'bg-core-border',
      ].join(' ')}
    >
      <div
        className={[
          'absolute top-[3px] w-5 h-5 rounded-full bg-white transition-[left] duration-200',
          on ? 'left-[25px]' : 'left-[3px]',
        ].join(' ')}
      />
    </button>
  )
}

function SmallToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={[
        'relative w-10 h-[22px] rounded-full border-none cursor-pointer transition-colors duration-200 shrink-0',
        on ? 'bg-core-cyan' : 'bg-core-border',
      ].join(' ')}
    >
      <div
        className={[
          'absolute top-[3px] w-4 h-4 rounded-full bg-white transition-[left] duration-200',
          on ? 'left-[21px]' : 'left-[3px]',
        ].join(' ')}
      />
    </button>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-core-card border border-core-border rounded-[14px] p-6 mb-4">
      {children}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold text-core-cyan mb-4 uppercase tracking-[0.06em]">
      {children}
    </h3>
  )
}

export default function WhiteLabelPage() {
  const [config, setConfig] = useState<WhiteLabelConfig>(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tier, setTier] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session: __sess } }) => {
      const user = __sess?.user ?? null;
      if (user?.user_metadata?.white_label) {
        setConfig({ ...DEFAULT_CONFIG, ...user.user_metadata.white_label })
      }
      setTier(user?.user_metadata?.plan_tier || 'starter')
    })
  }, [])

  function update<K extends keyof WhiteLabelConfig>(key: K, value: WhiteLabelConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase.auth.updateUser({
      data: { white_label: config }
    })
    await fetch('/api/settings/white-label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).catch(() => {})
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const isAgency = tier === 'agency'

  return (
    <div className="max-w-[700px] mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-core-text m-0 mb-1">White Label</h1>
        <p className="text-[13px] text-core-text-muted">
          {isAgency ? 'Customize the platform with your brand.' : 'Available on the Agency plan ($380/mo).'}
        </p>
      </div>

      {!isAgency && (
        <div className="bg-core-purple/5 border border-core-purple/20 rounded-[14px] p-6 mb-6 text-center">
          <p className="text-core-purple text-[14px] font-semibold mb-2">Agency Plan Required</p>
          <p className="text-core-text-muted text-[13px] mb-4">
            Full white-label branding is available on the Agency plan.
          </p>
          <a
            href="/dashboard/settings"
            className="inline-block px-6 py-2.5 bg-gradient-to-br from-core-purple to-[#7c3aed] text-white font-bold text-[13px] rounded-lg no-underline"
          >
            Upgrade to Agency
          </a>
        </div>
      )}

      <div className={isAgency ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none'}>
        {/* Enable toggle */}
        <SectionCard>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[15px] font-semibold text-core-text">Enable White Label</div>
              <div className="text-[12px] text-core-text-muted mt-0.5">Replace all 0nCore branding with yours</div>
            </div>
            <Toggle on={config.enabled} onToggle={() => update('enabled', !config.enabled)} />
          </div>
        </SectionCard>

        {/* Branding */}
        <SectionCard>
          <SectionHeading>Branding</SectionHeading>
          <div className="flex flex-col gap-3.5">
            <div>
              <FieldLabel>App Name</FieldLabel>
              <TextInput value={config.appName} onChange={v => update('appName', v)} placeholder="Your Brand Name" />
            </div>
            <div>
              <FieldLabel>Logo URL</FieldLabel>
              <TextInput value={config.logoUrl} onChange={v => update('logoUrl', v)} placeholder="https://yourbrand.com/logo.png" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Primary Color</FieldLabel>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={e => update('primaryColor', e.target.value)}
                    className="w-10 h-9 border-none rounded-md cursor-pointer bg-transparent shrink-0"
                  />
                  <input
                    value={config.primaryColor}
                    onChange={e => update('primaryColor', e.target.value)}
                    className="flex-1 px-3.5 py-[11px] bg-core-surface border border-core-border rounded-lg text-core-text text-[14px] outline-none focus:border-core-cyan transition-colors"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Accent Color</FieldLabel>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={config.accentColor}
                    onChange={e => update('accentColor', e.target.value)}
                    className="w-10 h-9 border-none rounded-md cursor-pointer bg-transparent shrink-0"
                  />
                  <input
                    value={config.accentColor}
                    onChange={e => update('accentColor', e.target.value)}
                    className="flex-1 px-3.5 py-[11px] bg-core-surface border border-core-border rounded-lg text-core-text text-[14px] outline-none focus:border-core-cyan transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Domain */}
        <SectionCard>
          <SectionHeading>Custom Domain</SectionHeading>
          <div>
            <FieldLabel>Dashboard Domain</FieldLabel>
            <TextInput value={config.customDomain} onChange={v => update('customDomain', v)} placeholder="app.yourbrand.com" />
            <p className="text-[11px] text-core-text-muted mt-1.5">
              Point a CNAME record to{' '}
              <code className="bg-core-surface px-1.5 py-0.5 rounded">cname.vercel-dns.com</code>
            </p>
          </div>
        </SectionCard>

        {/* Email */}
        <SectionCard>
          <SectionHeading>Email</SectionHeading>
          <div className="flex flex-col gap-3.5">
            <div>
              <FieldLabel>From Email</FieldLabel>
              <TextInput value={config.customEmailFrom} onChange={v => update('customEmailFrom', v)} placeholder="noreply@yourbrand.com" />
            </div>
            <div>
              <FieldLabel>Support Email</FieldLabel>
              <TextInput value={config.customSupportEmail} onChange={v => update('customSupportEmail', v)} placeholder="support@yourbrand.com" />
            </div>
            <div className="flex items-center gap-2.5">
              <SmallToggle on={config.hideFooterBranding} onToggle={() => update('hideFooterBranding', !config.hideFooterBranding)} />
              <span className="text-[13px] text-core-text-dim">Hide &quot;Powered by 0nMCP&quot; footer</span>
            </div>
          </div>
        </SectionCard>

        {/* Preview */}
        <SectionCard>
          <SectionHeading>Preview</SectionHeading>
          <div className="bg-core-bg rounded-[10px] p-5 border border-core-border">
            <div className="flex items-center gap-2.5 mb-3">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="" className="h-7 object-contain" />
              ) : (
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-black text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})` }}
                >
                  {config.appName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-[14px] font-bold text-core-text">{config.appName}</span>
            </div>
            <div className="flex gap-2">
              <div className="h-2 w-[60px] rounded-sm" style={{ background: config.primaryColor }} />
              <div className="h-2 w-10 rounded-sm" style={{ background: config.accentColor }} />
              <div className="h-2 w-[50px] rounded-sm bg-core-border" />
            </div>
            {!config.hideFooterBranding && (
              <p className="text-[9px] text-core-text-muted mt-3">Powered by 0nMCP</p>
            )}
          </div>
        </SectionCard>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={[
            'w-full py-3.5 font-bold text-[15px] rounded-[10px] border-none cursor-pointer',
            saving
              ? 'bg-core-border text-core-text-muted cursor-not-allowed'
              : 'bg-gradient-to-br from-[#2dd4bf] to-core-cyan text-core-bg',
          ].join(' ')}
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save White Label Settings'}
        </button>
      </div>
    </div>
  )
}
