'use client'

import { useState, useEffect } from 'react'
import { Link2, Check, Loader2 } from 'lucide-react'

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
  { id: 'crm', name: 'CRM (PIT)', color: '#7ed957', icon: '0n', defaultUrl: 'https://app.rocketclients.com/settings' },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-core-text-muted text-sm">
        Loading...
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Header */}
      <div className="jp-page-header flex items-center justify-between">
        <div>
          <h1 className="jp-page-title flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-[10px] bg-gradient-to-br from-core-green/15 to-core-cyan/10 border border-core-green/25">
              <Link2 className="w-[18px] h-[18px] text-core-green" strokeWidth={1.75} />
            </span>
            Connection Links
          </h1>
          <p className="jp-page-subtitle">
            {SERVICES.length} services · {affiliateCount} affiliate links configured
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={[
            'px-5 py-2 rounded-lg text-[0.8125rem] font-bold cursor-pointer transition-all duration-200',
            saved
              ? 'bg-core-green/15 text-core-green border border-core-green/30'
              : 'bg-core-green text-black border-0',
          ].join(' ')}
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save All'}
        </button>
      </div>

      {/* Info */}
      <div className="px-4 py-3 rounded-[10px] bg-core-cyan/[0.06] border border-core-cyan/15 mb-5 text-[0.8125rem] text-core-text-dim leading-relaxed">
        Configure where users are sent to get their API keys. If an{' '}
        <strong className="text-core-green">affiliate link</strong> is set, users will be directed
        there instead of the default URL. Leave affiliate blank to use the default.
      </div>

      {/* Service List */}
      <div className="flex flex-col gap-2.5">
        {SERVICES.map(svc => {
          const c = config[svc.id] || { keyUrl: '', affiliateUrl: '', enabled: true }
          const hasAffiliate = !!c.affiliateUrl?.trim()
          return (
            <div
              key={svc.id}
              className={[
                'bg-core-surface rounded-xl px-[1.125rem] py-4',
                hasAffiliate
                  ? 'border border-core-green/20'
                  : 'border border-core-border',
              ].join(' ')}
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.6875rem] font-extrabold shrink-0 font-mono"
                  style={{ background: `${svc.color}15`, color: svc.color }}
                >
                  {svc.icon}
                </div>
                <span className="text-[0.875rem] font-bold text-core-text flex-1">
                  {svc.name}
                </span>
                {hasAffiliate && (
                  <span className="px-2 py-0.5 rounded text-[0.5625rem] font-bold tracking-[0.06em] uppercase bg-core-green/10 border border-core-green/20 text-core-green">
                    Affiliate
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[0.5625rem] font-bold text-core-text-muted uppercase tracking-[0.08em] mb-1">
                    Default URL
                  </div>
                  <input
                    value={c.keyUrl || svc.defaultUrl}
                    onChange={e => updateConfig(svc.id, 'keyUrl', e.target.value)}
                    placeholder={svc.defaultUrl}
                    className="w-full px-2.5 py-2 rounded-lg border border-core-border bg-core-bg text-core-text text-[0.75rem] outline-none font-mono focus:border-core-cyan/40 transition-colors"
                  />
                </div>
                <div>
                  <div className="text-[0.5625rem] font-bold text-core-green uppercase tracking-[0.08em] mb-1">
                    Affiliate Link
                  </div>
                  <input
                    value={c.affiliateUrl || ''}
                    onChange={e => updateConfig(svc.id, 'affiliateUrl', e.target.value)}
                    placeholder="https://partner.example.com/ref/0nmcp"
                    className={[
                      'w-full px-2.5 py-2 rounded-lg border bg-core-bg text-core-text text-[0.75rem] outline-none font-mono transition-colors',
                      hasAffiliate
                        ? 'border-core-green/30 focus:border-core-green/50'
                        : 'border-core-border focus:border-core-cyan/40',
                    ].join(' ')}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom save */}
      <div className="py-8 text-center">
        <button
          onClick={handleSave}
          disabled={saving}
          className={[
            'px-8 py-3 rounded-[10px] text-[0.9375rem] font-bold cursor-pointer transition-all duration-200 flex items-center gap-2 mx-auto',
            saved
              ? 'bg-core-green/15 text-core-green border border-core-green/30'
              : 'bg-core-green text-black border-0',
          ].join(' ')}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saved && <Check className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'All Changes Saved' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}
