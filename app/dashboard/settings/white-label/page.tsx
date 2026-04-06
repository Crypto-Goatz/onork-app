'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export default function WhiteLabelPage() {
  const [config, setConfig] = useState<WhiteLabelConfig>(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tier, setTier] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
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

    // Also save to API for server-side rendering
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
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>White Label</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>
          {isAgency ? 'Customize the platform with your brand.' : 'Available on the Agency plan ($380/mo).'}
        </p>
      </div>

      {!isAgency && (
        <div style={{
          background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 14, padding: '24px', marginBottom: 24, textAlign: 'center',
        }}>
          <p style={{ color: '#8b5cf6', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Agency Plan Required</p>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 16 }}>
            Full white-label branding is available on the Agency plan.
          </p>
          <a href="/dashboard/settings" style={{
            display: 'inline-block', padding: '10px 24px',
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            color: '#fff', fontWeight: 700, fontSize: 13,
            borderRadius: 8, textDecoration: 'none',
          }}>Upgrade to Agency</a>
        </div>
      )}

      <div style={{ opacity: isAgency ? 1 : 0.4, pointerEvents: isAgency ? 'auto' : 'none' }}>
        {/* Enable toggle */}
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '20px 24px', marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>Enable White Label</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>Replace all 0nCore branding with yours</div>
          </div>
          <button onClick={() => update('enabled', !config.enabled)} style={{
            width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
            background: config.enabled ? 'var(--color-cyan, #14b8a6)' : 'var(--border, #30363d)',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10, background: '#fff',
              position: 'absolute', top: 3,
              left: config.enabled ? 25 : 3,
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {/* Branding */}
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '24px', marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-cyan, #14b8a6)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Branding</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>App Name</label>
              <input value={config.appName} onChange={e => update('appName', e.target.value)}
                placeholder="Your Brand Name" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
                onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'} />
            </div>
            <div>
              <label style={labelStyle}>Logo URL</label>
              <input value={config.logoUrl} onChange={e => update('logoUrl', e.target.value)}
                placeholder="https://yourbrand.com/logo.png" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
                onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Primary Color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={config.primaryColor} onChange={e => update('primaryColor', e.target.value)}
                    style={{ width: 40, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                  <input value={config.primaryColor} onChange={e => update('primaryColor', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Accent Color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={config.accentColor} onChange={e => update('accentColor', e.target.value)}
                    style={{ width: 40, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                  <input value={config.accentColor} onChange={e => update('accentColor', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Domain */}
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '24px', marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-cyan, #14b8a6)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Custom Domain</h3>
          <div>
            <label style={labelStyle}>Dashboard Domain</label>
            <input value={config.customDomain} onChange={e => update('customDomain', e.target.value)}
              placeholder="app.yourbrand.com" style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
              onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'} />
            <p style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 6 }}>
              Point a CNAME record to <code style={{ background: 'var(--bg-secondary, #161b22)', padding: '2px 6px', borderRadius: 4 }}>cname.vercel-dns.com</code>
            </p>
          </div>
        </div>

        {/* Email */}
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '24px', marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-cyan, #14b8a6)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>From Email</label>
              <input value={config.customEmailFrom} onChange={e => update('customEmailFrom', e.target.value)}
                placeholder="noreply@yourbrand.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
                onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'} />
            </div>
            <div>
              <label style={labelStyle}>Support Email</label>
              <input value={config.customSupportEmail} onChange={e => update('customSupportEmail', e.target.value)}
                placeholder="support@yourbrand.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
                onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => update('hideFooterBranding', !config.hideFooterBranding)} style={{
                width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                background: config.hideFooterBranding ? 'var(--color-cyan, #14b8a6)' : 'var(--border, #30363d)',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 8, background: '#fff',
                  position: 'absolute', top: 3,
                  left: config.hideFooterBranding ? 21 : 3,
                  transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>Hide "Powered by 0nMCP" footer</span>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '24px', marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-cyan, #14b8a6)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preview</h3>
          <div style={{
            background: 'var(--bg-primary, #0d1117)', borderRadius: 10, padding: '20px',
            border: '1px solid #1c2b42',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="" style={{ height: 28, objectFit: 'contain' }} />
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: '#fff',
                }}>{config.appName.slice(0, 2).toUpperCase()}</div>
              )}
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)' }}>{config.appName}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 60, height: 8, borderRadius: 4, background: config.primaryColor }} />
              <div style={{ width: 40, height: 8, borderRadius: 4, background: config.accentColor }} />
              <div style={{ width: 50, height: 8, borderRadius: 4, background: 'var(--border, #30363d)' }} />
            </div>
            {!config.hideFooterBranding && (
              <p style={{ fontSize: 9, color: 'var(--text-muted, #6b7280)', marginTop: 12 }}>Powered by 0nMCP</p>
            )}
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '14px',
          background: saving ? 'var(--border, #30363d)' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
          color: saving ? 'var(--text-muted, #6b7280)' : '#0c1220',
          fontWeight: 700, fontSize: 15, borderRadius: 10,
          border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
        }}>
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save White Label Settings'}
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'var(--bg-secondary, #161b22)', border: '1px solid #1c2b42',
  borderRadius: 8, color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
  transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--text-muted, #6b7280)',
  marginBottom: 6, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em',
}
