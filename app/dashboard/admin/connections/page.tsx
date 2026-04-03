'use client'

import { useState, useEffect } from 'react'

/**
 * 0nCommand — Connection Link Configuration
 *
 * Admin page to configure default URLs and affiliate URLs
 * for each service connection. These override the hardcoded
 * values in the /dashboard/connections page.
 */

interface ConnectionConfig {
  keyUrl: string
  affiliateUrl: string
  enabled: boolean
}

const SERVICES = [
  { id: 'anthropic', name: 'Anthropic', color: '#D4A574', icon: 'An', defaultUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'openai', name: 'OpenAI', color: '#10a37f', icon: 'OA', defaultUrl: 'https://platform.openai.com/api-keys' },
  { id: 'groq', name: 'Groq', color: '#F55036', icon: 'Gq', defaultUrl: 'https://console.groq.com/keys' },
  { id: 'stripe', name: 'Stripe', color: '#635BFF', icon: 'St', defaultUrl: 'https://dashboard.stripe.com/apikeys' },
  { id: 'crm', name: 'CRM (PIT)', color: '#6EE05A', icon: '0n', defaultUrl: 'https://app.rocketclients.com/settings' },
  { id: 'sendgrid', name: 'SendGrid', color: '#1A82E2', icon: 'SG', defaultUrl: 'https://app.sendgrid.com/settings/api_keys' },
  { id: 'resend', name: 'Resend', color: '#000000', icon: 'Re', defaultUrl: 'https://resend.com/api-keys' },
  { id: 'github', name: 'GitHub', color: '#333333', icon: 'GH', defaultUrl: 'https://github.com/settings/tokens/new' },
  { id: 'supabase', name: 'Supabase', color: '#3ECF8E', icon: 'Sb', defaultUrl: 'https://supabase.com/dashboard' },
  { id: 'twilio', name: 'Twilio', color: '#F22F46', icon: 'Tw', defaultUrl: 'https://console.twilio.com' },
  { id: 'slack', name: 'Slack', color: '#4A154B', icon: 'Sl', defaultUrl: 'https://api.slack.com/apps' },
  { id: 'meta_pixel', name: 'Meta Pixel', color: '#1877F2', icon: 'Px', defaultUrl: 'https://business.facebook.com/events_manager' },
  { id: 'ga4', name: 'GA4', color: '#E37400', icon: 'GA', defaultUrl: 'https://analytics.google.com' },
  { id: 'google_ads', name: 'Google Ads', color: '#4285F4', icon: 'Ad', defaultUrl: 'https://ads.google.com' },
  { id: 'pipedrive', name: 'Pipedrive', color: '#017737', icon: 'Pd', defaultUrl: 'https://app.pipedrive.com/settings/api' },
  { id: 'webflow', name: 'Webflow', color: '#4353FF', icon: 'Wf', defaultUrl: 'https://webflow.com/dashboard/account/integrations' },
  { id: 'shopify', name: 'Shopify', color: '#96BF48', icon: 'Sh', defaultUrl: 'https://admin.shopify.com/settings/apps/development' },
  { id: 'hubspot', name: 'HubSpot', color: '#FF7A59', icon: 'Hs', defaultUrl: 'https://app.hubspot.com/settings/private-apps' },
  { id: 'notion', name: 'Notion', color: '#000000', icon: 'No', defaultUrl: 'https://www.notion.so/my-integrations' },
  { id: 'airtable', name: 'Airtable', color: '#18BFFF', icon: 'At', defaultUrl: 'https://airtable.com/account' },
  { id: 'discord', name: 'Discord', color: '#5865F2', icon: 'Dc', defaultUrl: 'https://discord.com/developers/applications' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', icon: 'Ln', defaultUrl: 'https://www.linkedin.com/developers/apps' },
  { id: 'cloudflare', name: 'Cloudflare', color: '#F48120', icon: 'Cf', defaultUrl: 'https://dash.cloudflare.com/profile/api-tokens' },
  { id: 'vercel', name: 'Vercel', color: '#000000', icon: 'Vc', defaultUrl: 'https://vercel.com/account/tokens' },
]

type ConfigMap = Record<string, ConnectionConfig>

export default function AdminConnections() {
  const [config, setConfig] = useState<ConfigMap>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/connections')
      .then(r => r.json())
      .then(d => {
        if (d.config && typeof d.config === 'object') setConfig(d.config)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function updateConfig(id: string, field: keyof ConnectionConfig, value: string | boolean) {
    setConfig(prev => ({
      ...prev,
      [id]: { ...prev[id], keyUrl: prev[id]?.keyUrl || '', affiliateUrl: prev[id]?.affiliateUrl || '', enabled: prev[id]?.enabled ?? true, [field]: value },
    }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/admin/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const affiliateCount = Object.values(config).filter(c => c.affiliateUrl?.trim()).length

  const inp = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--jp-border, #1E293B)',
    background: 'var(--jp-surface, #0B0F19)',
    color: 'var(--jp-text, #E8EAED)',
    fontSize: '0.75rem', outline: 'none',
    fontFamily: "'JetBrains Mono', monospace",
  } as React.CSSProperties

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--jp-text-muted)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div className="jp-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="jp-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(110,224,90,0.15), rgba(0,212,255,0.10))',
              border: '1px solid rgba(110,224,90,0.25)',
            }}>
              <svg width="18" height="18" fill="none" stroke="#6EE05A" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </span>
            Connection Links
          </h1>
          <p className="jp-page-subtitle">
            {SERVICES.length} services · {affiliateCount} affiliate links configured
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '8px 20px', borderRadius: 8,
          background: saved ? 'rgba(110,224,90,0.15)' : 'var(--jp-green, #6EE05A)',
          color: saved ? 'var(--jp-green)' : '#000',
          border: saved ? '1px solid rgba(110,224,90,0.3)' : 'none',
          fontSize: '0.8125rem', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
        }}>
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save All'}
        </button>
      </div>

      {/* Info */}
      <div style={{
        padding: '12px 16px', borderRadius: 10,
        background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
        marginBottom: 20, fontSize: '0.8125rem', color: 'var(--jp-text-secondary, #9CA3AF)', lineHeight: 1.6,
      }}>
        Configure where users are sent to get their API keys. If an <strong style={{ color: 'var(--jp-green)' }}>affiliate link</strong> is set, users will be directed there instead of the default URL. Leave affiliate blank to use the default.
      </div>

      {/* Service List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {SERVICES.map(svc => {
          const c = config[svc.id] || { keyUrl: '', affiliateUrl: '', enabled: true }
          const hasAffiliate = !!c.affiliateUrl?.trim()
          return (
            <div key={svc.id} style={{
              background: 'var(--jp-surface, #111827)',
              border: `1px solid ${hasAffiliate ? 'rgba(110,224,90,0.2)' : 'var(--jp-border, #1E293B)'}`,
              borderRadius: 12, padding: '1rem 1.125rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: `${svc.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: svc.color, fontSize: '0.6875rem', fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
                }}>
                  {svc.icon}
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--jp-text, #E8EAED)', flex: 1 }}>
                  {svc.name}
                </span>
                {hasAffiliate && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(110,224,90,0.1)', border: '1px solid rgba(110,224,90,0.2)',
                    color: 'var(--jp-green)', fontSize: '0.5625rem', fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    Affiliate
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--jp-text-muted, #4A5568)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Default URL
                  </div>
                  <input
                    value={c.keyUrl || svc.defaultUrl}
                    onChange={e => updateConfig(svc.id, 'keyUrl', e.target.value)}
                    placeholder={svc.defaultUrl}
                    style={inp}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--jp-green, #6EE05A)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Affiliate Link
                  </div>
                  <input
                    value={c.affiliateUrl || ''}
                    onChange={e => updateConfig(svc.id, 'affiliateUrl', e.target.value)}
                    placeholder="https://partner.example.com/ref/0nmcp"
                    style={{ ...inp, borderColor: hasAffiliate ? 'rgba(110,224,90,0.3)' : undefined }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom save */}
      <div style={{ padding: '2rem 0', textAlign: 'center' }}>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '12px 32px', borderRadius: 10,
          background: saved ? 'rgba(110,224,90,0.15)' : 'var(--jp-green, #6EE05A)',
          color: saved ? 'var(--jp-green)' : '#000',
          border: saved ? '1px solid rgba(110,224,90,0.3)' : 'none',
          fontSize: '0.9375rem', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
        }}>
          {saving ? 'Saving...' : saved ? 'All Changes Saved' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}
