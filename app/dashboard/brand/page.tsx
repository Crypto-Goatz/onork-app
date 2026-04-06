'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * 0nBrandBuilder — Core Branding Application
 * 6-tab brand profile builder. Exports .0n brand files.
 * Sub-location scoped. One business per sub-location.
 */

type TabKey = 'import' | 'identity' | 'facts' | 'services' | 'contact' | 'export'

interface LogoSlot { url: string; width: number; height: number }
interface DynamicFact { id: string; label: string; type: string; value: string; suffix: string; enabled: boolean }
interface Service { id: number; name: string; description: string; price: string; price_type: string; units_label: string; units_conducted: string; enabled: boolean }

interface BrandProfile {
  schema: string
  generated: string
  sub_location_id: string
  business: { name: string; tagline: string; description: string; founded: string; phone: string; booking_url: string; contact_url: string }
  identity: {
    logos: { primary: LogoSlot; icon: LogoSlot; dark: LogoSlot; light: LogoSlot }
    colors: { primary: string; secondary: string; accent: string; background: string; text_color: string }
    fonts: { display: { family: string; weight: string }; body: { family: string; weight: string }; mono: { family: string; weight: string } }
  }
  dynamic_facts: DynamicFact[]
  services: Service[]
}

const DEFAULT_BRAND: BrandProfile = {
  schema: '0n-brand/v1',
  generated: '',
  sub_location_id: '',
  business: { name: '', tagline: '', description: '', founded: '', phone: '', booking_url: '', contact_url: '' },
  identity: {
    logos: {
      primary: { url: '', width: 180, height: 48 },
      icon: { url: '', width: 48, height: 48 },
      dark: { url: '', width: 180, height: 48 },
      light: { url: '', width: 180, height: 48 },
    },
    colors: { primary: '#000000', secondary: '#ffffff', accent: '#7ed957', background: '#0A0A0A', text_color: '#F5F5F0' },
    fonts: {
      display: { family: 'Space Mono', weight: '700' },
      body: { family: 'DM Sans', weight: '400' },
      mono: { family: 'Space Mono', weight: '400' },
    },
  },
  dynamic_facts: [
    { id: 'yib', label: 'Years in business', type: 'age_from_year', value: '', suffix: 'years in business', enabled: true },
    { id: 'clients', label: 'Clients served', type: 'count', value: '', suffix: 'clients', enabled: true },
    { id: 'price', label: 'Starting price', type: 'currency', value: '', suffix: '', enabled: true },
  ],
  services: [
    { id: 1, name: '', description: '', price: '', price_type: 'flat', units_label: '', units_conducted: '', enabled: true },
    { id: 2, name: '', description: '', price: '', price_type: 'flat', units_label: '', units_conducted: '', enabled: false },
    { id: 3, name: '', description: '', price: '', price_type: 'flat', units_label: '', units_conducted: '', enabled: false },
  ],
}

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'import', label: 'Import', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
  { key: 'identity', label: 'Identity', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { key: 'facts', label: 'Facts', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { key: 'services', label: 'Services', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { key: 'contact', label: 'Contact', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
  { key: 'export', label: 'Export', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
]

const FACT_TYPES = [
  { value: 'age_from_year', label: 'Age from Year' },
  { value: 'count', label: 'Count' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'text', label: 'Text' },
]

const PRICE_TYPES = [
  { value: 'flat', label: 'Flat Rate' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'starting_at', label: 'Starting At' },
  { value: 'range', label: 'Range' },
  { value: 'free', label: 'Free' },
  { value: 'contact', label: 'Contact for Pricing' },
]

function computeFact(f: DynamicFact): string {
  if (!f.value) return '—'
  switch (f.type) {
    case 'age_from_year': return `${new Date().getFullYear() - parseInt(f.value)} ${f.suffix}`
    case 'count': return `${parseInt(f.value).toLocaleString()} ${f.suffix}`
    case 'currency': return `$${parseInt(f.value).toLocaleString()} ${f.suffix}`
    case 'percentage': return `${f.value}% ${f.suffix}`
    default: return `${f.value} ${f.suffix}`
  }
}

function formatPrice(price: string, type: string): string {
  if (!price && type !== 'free' && type !== 'contact') return '—'
  switch (type) {
    case 'flat': return `$${parseInt(price || '0').toLocaleString()}`
    case 'hourly': return `$${price}/hr`
    case 'starting_at': return `From $${parseInt(price || '0').toLocaleString()}`
    case 'range': return `$${price}`
    case 'free': return 'Free'
    case 'contact': return 'Contact for pricing'
    default: return `$${price}`
  }
}

export default function BrandBuilder() {
  const [tab, setTab] = useState<TabKey>('import')
  const [brand, setBrand] = useState<BrandProfile>(JSON.parse(JSON.stringify(DEFAULT_BRAND)))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load saved brand on mount
  useEffect(() => {
    fetch('/api/brand').then(r => r.json()).then(d => {
      if (d.brand) setBrand({ ...JSON.parse(JSON.stringify(DEFAULT_BRAND)), ...d.brand })
    }).catch(() => {})
  }, [])

  // Deep set helper
  function deepSet(path: string, val: unknown) {
    setBrand(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const parts = path.split('.')
      let o: any = next
      for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]]
      o[parts[parts.length - 1]] = val
      return next
    })
  }

  // Save to Supabase
  async function save() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: { ...brand, generated: new Date().toISOString() } }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // AI import from URL
  async function handleImportUrl() {
    if (!importUrl.trim()) return
    setImporting(true)
    setImportError('')
    try {
      const res = await fetch('/api/brand/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      })
      const data = await res.json()
      if (data.brand) {
        applyAI(data.brand)
        setTab('identity')
      } else {
        setImportError(data.error || 'Could not extract brand data')
      }
    } catch (e: any) {
      setImportError(e.message)
    }
    setImporting(false)
  }

  // Apply AI-extracted data
  function applyAI(ai: any) {
    if (ai.name) deepSet('business.name', ai.name)
    if (ai.tagline) deepSet('business.tagline', ai.tagline)
    if (ai.description) deepSet('business.description', ai.description)
    if (ai.founded) deepSet('business.founded', String(ai.founded))
    if (ai.phone) deepSet('business.phone', ai.phone)
    if (ai.primary_color) deepSet('identity.colors.primary', ai.primary_color)
    if (ai.secondary_color) deepSet('identity.colors.secondary', ai.secondary_color)
    if (ai.accent_color) deepSet('identity.colors.accent', ai.accent_color)
    if (ai.background_color) deepSet('identity.colors.background', ai.background_color)
    if (ai.text_color) deepSet('identity.colors.text_color', ai.text_color)
    if (ai.display_font) deepSet('identity.fonts.display.family', ai.display_font)
    if (ai.body_font) deepSet('identity.fonts.body.family', ai.body_font)
    if (ai.logo_primary_url) deepSet('identity.logos.primary.url', ai.logo_primary_url)
    if (ai.logo_icon_url) deepSet('identity.logos.icon.url', ai.logo_icon_url)
    if (ai.services?.length) {
      const svcs = brand.services.map((s, i) => {
        const ais = ai.services[i]
        if (!ais) return s
        return { ...s, name: ais.name || '', description: ais.description || '', price: String(ais.price || ''), price_type: ais.price_type || 'flat', enabled: true }
      })
      setBrand(prev => ({ ...prev, services: svcs }))
    }
  }

  // File import
  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    if (file.name.endsWith('.0n') || file.name.endsWith('.json')) {
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string)
          if (parsed.schema === '0n-brand/v1') {
            setBrand(parsed)
            setTab('identity')
          } else {
            applyAI(parsed)
            setTab('identity')
          }
        } catch { setImportError('Invalid file format') }
      }
      reader.readAsText(file)
    } else if (file.name.endsWith('.txt')) {
      reader.onload = async () => {
        setImporting(true)
        const res = await fetch('/api/brand/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: (reader.result as string).slice(0, 5000) }),
        })
        const data = await res.json()
        if (data.brand) { applyAI(data.brand); setTab('identity') }
        else setImportError(data.error || 'Could not extract')
        setImporting(false)
      }
      reader.readAsText(file)
    }
  }

  // Export .0n file
  function exportFile() {
    const output = { ...brand, generated: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${brand.business.name || 'brand'}.0n`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyJson() {
    navigator.clipboard.writeText(JSON.stringify({ ...brand, generated: new Date().toISOString() }, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Fact helpers
  function updFact(id: string, key: string, val: unknown) {
    setBrand(prev => ({
      ...prev,
      dynamic_facts: prev.dynamic_facts.map(f => f.id === id ? { ...f, [key]: val } : f),
    }))
  }
  function rmFact(id: string) {
    setBrand(prev => ({ ...prev, dynamic_facts: prev.dynamic_facts.filter(f => f.id !== id) }))
  }
  function addFact() {
    setBrand(prev => ({
      ...prev,
      dynamic_facts: [...prev.dynamic_facts, { id: `f${Date.now()}`, label: '', type: 'count', value: '', suffix: '', enabled: true }],
    }))
  }

  // Service helpers
  function updSvc(id: number, key: string, val: unknown) {
    setBrand(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === id ? { ...s, [key]: val } : s),
    }))
  }

  const currentYear = new Date().getFullYear()
  const foundedAge = brand.business.founded ? currentYear - parseInt(brand.business.founded) : null

  // Shared input style
  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--jp-border, #1E293B)',
    background: 'var(--jp-surface, #0B0F19)',
    color: 'var(--jp-text, #E8EAED)',
    fontSize: '0.875rem', outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  } as React.CSSProperties

  const label = {
    fontSize: '0.6875rem', fontWeight: 600,
    color: 'var(--jp-text-muted, #4A5568)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 4, display: 'block',
  } as React.CSSProperties

  const card = {
    background: 'var(--jp-surface, #111827)',
    border: '1px solid var(--jp-border, #1E293B)',
    borderRadius: 14, padding: '1.25rem',
    marginBottom: '1rem',
  } as React.CSSProperties

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div className="jp-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="jp-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(110,224,90,0.15), rgba(167,139,250,0.10))',
              border: '1px solid rgba(110,224,90,0.25)',
            }}>
              <svg width="18" height="18" fill="none" stroke="#7ed957" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
            </span>
            0nBrandBuilder
          </h1>
          <p className="jp-page-subtitle">
            {brand.business.name || 'New Brand'} {brand.sub_location_id ? `· ${brand.sub_location_id}` : ''}
          </p>
        </div>
        <button onClick={save} disabled={saving} style={{
          padding: '8px 20px', borderRadius: 8,
          background: saved ? 'rgba(110,224,90,0.15)' : 'var(--jp-green, #7ed957)',
          color: saved ? 'var(--jp-green)' : '#000',
          border: saved ? '1px solid rgba(110,224,90,0.3)' : 'none',
          fontSize: '0.8125rem', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.2s',
        }}>
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Brand'}
        </button>
      </div>

      {/* Sub-location ID */}
      <div style={{ marginBottom: 16 }}>
        <span style={label}>Sub-Location ID</span>
        <input value={brand.sub_location_id} onChange={e => deepSet('sub_location_id', e.target.value)} placeholder="loc_abc123" style={{ ...inp, maxWidth: 300 }} />
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderRadius: 12, background: 'var(--jp-surface, #111827)', border: '1px solid var(--jp-border, #1E293B)', padding: 4 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 8, border: 'none',
            background: tab === t.key ? 'var(--jp-surface-elevated, #162032)' : 'transparent',
            color: tab === t.key ? 'var(--jp-green, #7ed957)' : 'var(--jp-text-muted, #4A5568)',
            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: IMPORT ═══ */}
      {tab === 'import' && (
        <div>
          <div style={card}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--jp-text)', margin: '0 0 0.75rem' }}>Import from URL</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              Enter a website URL and AI will extract brand colors, fonts, logos, and business details automatically.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={importUrl} onChange={e => setImportUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleImportUrl()} placeholder="https://example.com" style={{ ...inp, flex: 1 }} />
              <button onClick={handleImportUrl} disabled={importing} style={{
                padding: '10px 20px', borderRadius: 8, background: 'var(--jp-green, #7ed957)',
                color: '#000', fontWeight: 700, fontSize: '0.8125rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}>
                {importing ? 'Extracting...' : 'Extract Brand'}
              </button>
            </div>
            {importError && <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 8 }}>{importError}</p>}
          </div>

          <div style={card}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--jp-text)', margin: '0 0 0.75rem' }}>Import from File</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              Upload a .0n brand file, .json, or .txt document.
            </p>
            <input ref={fileRef} type="file" accept=".0n,.json,.txt" onChange={handleFileImport} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{
              padding: '10px 20px', borderRadius: 8,
              background: 'var(--jp-surface-elevated, #162032)',
              border: '1px solid var(--jp-border)',
              color: 'var(--jp-text-secondary)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Choose File
            </button>
          </div>

          <div style={card}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--jp-text)', margin: '0 0 0.75rem' }}>Start Fresh</h3>
            <button onClick={() => setTab('identity')} style={{
              padding: '10px 20px', borderRadius: 8,
              background: 'transparent', border: '1px solid var(--jp-border)',
              color: 'var(--jp-text-secondary)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Build from Scratch
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB: IDENTITY ═══ */}
      {tab === 'identity' && (
        <div>
          {/* Business Info */}
          <div style={card}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--jp-text)', margin: '0 0 1rem' }}>Business Info</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><span style={label}>Business Name</span><input value={brand.business.name} onChange={e => deepSet('business.name', e.target.value)} style={inp} /></div>
              <div><span style={label}>Founded Year {foundedAge !== null && foundedAge > 0 ? `(${foundedAge} years)` : ''}</span><input value={brand.business.founded} onChange={e => deepSet('business.founded', e.target.value)} placeholder="2005" style={inp} /></div>
              <div style={{ gridColumn: 'span 2' }}><span style={label}>Tagline</span><input value={brand.business.tagline} onChange={e => deepSet('business.tagline', e.target.value)} style={inp} /></div>
              <div style={{ gridColumn: 'span 2' }}><span style={label}>Description</span><textarea value={brand.business.description} onChange={e => deepSet('business.description', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' as const }} /></div>
            </div>
          </div>

          {/* Logos */}
          <div style={card}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--jp-text)', margin: '0 0 1rem' }}>Logos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(['primary', 'icon', 'dark', 'light'] as const).map(slot => (
                <div key={slot}>
                  <span style={label}>{slot} Logo URL</span>
                  <input value={brand.identity.logos[slot].url} onChange={e => deepSet(`identity.logos.${slot}.url`, e.target.value)} placeholder="https://..." style={inp} />
                  {brand.identity.logos[slot].url && (
                    <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: slot === 'dark' ? '#fff' : slot === 'light' ? '#000' : 'var(--jp-surface-elevated)', border: '1px solid var(--jp-border)', textAlign: 'center' }}>
                      <img src={brand.identity.logos[slot].url} alt={slot} style={{ maxHeight: 40, maxWidth: '100%' }} onError={e => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div style={card}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--jp-text)', margin: '0 0 1rem' }}>Colors</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {(['primary', 'secondary', 'accent', 'background', 'text_color'] as const).map(key => (
                <div key={key} style={{ textAlign: 'center' }}>
                  <span style={{ ...label, textAlign: 'center' }}>{key.replace('_', ' ')}</span>
                  <input type="color" value={brand.identity.colors[key]} onChange={e => deepSet(`identity.colors.${key}`, e.target.value)} style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid var(--jp-border)', cursor: 'pointer', background: 'transparent' }} />
                  <input value={brand.identity.colors[key]} onChange={e => deepSet(`identity.colors.${key}`, e.target.value)} style={{ ...inp, fontSize: '0.6875rem', fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', marginTop: 4, padding: '6px 4px' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div style={card}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--jp-text)', margin: '0 0 1rem' }}>Typography</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {(['display', 'body', 'mono'] as const).map(role => (
                <div key={role}>
                  <span style={label}>{role} Font</span>
                  <input value={brand.identity.fonts[role].family} onChange={e => deepSet(`identity.fonts.${role}.family`, e.target.value)} style={inp} />
                  <span style={{ ...label, marginTop: 8 }}>Weight</span>
                  <input value={brand.identity.fonts[role].weight} onChange={e => deepSet(`identity.fonts.${role}.weight`, e.target.value)} style={inp} />
                  <div style={{ marginTop: 8, padding: 10, borderRadius: 6, background: 'var(--jp-surface-elevated)', fontFamily: brand.identity.fonts[role].family, fontWeight: parseInt(brand.identity.fonts[role].weight) || 400, fontSize: '0.875rem', color: 'var(--jp-text)' }}>
                    The quick brown fox
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: FACTS ═══ */}
      {tab === 'facts' && (
        <div>
          {brand.dynamic_facts.map(f => (
            <div key={f.id} style={{ ...card, opacity: f.enabled ? 1 : 0.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => updFact(f.id, 'enabled', !f.enabled)} style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: f.enabled ? '#7ed957' : 'var(--jp-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: 2, left: f.enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>{f.label || 'New Fact'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--jp-green)', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{computeFact(f)}</span>
                  <button onClick={() => rmFact(f.id)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '0.6875rem', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                <div><span style={label}>Label</span><input value={f.label} onChange={e => updFact(f.id, 'label', e.target.value)} style={inp} /></div>
                <div>
                  <span style={label}>Type</span>
                  <select value={f.type} onChange={e => updFact(f.id, 'type', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {FACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div><span style={label}>Value</span><input value={f.value} onChange={e => updFact(f.id, 'value', e.target.value)} style={inp} /></div>
                <div><span style={label}>Suffix</span><input value={f.suffix} onChange={e => updFact(f.id, 'suffix', e.target.value)} style={inp} /></div>
              </div>
            </div>
          ))}
          <button onClick={addFact} style={{ padding: '10px 20px', borderRadius: 8, border: '1px dashed var(--jp-border)', background: 'transparent', color: 'var(--jp-green)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
            + Add Fact
          </button>
        </div>
      )}

      {/* ═══ TAB: SERVICES ═══ */}
      {tab === 'services' && (
        <div>
          {brand.services.map(s => (
            <div key={s.id} style={{ ...card, opacity: s.enabled ? 1 : 0.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => updSvc(s.id, 'enabled', !s.enabled)} style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: s.enabled ? '#7ed957' : 'var(--jp-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: 2, left: s.enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--jp-text)' }}>Service {s.id}</span>
                </div>
                {s.price && <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--jp-green)', fontFamily: "'JetBrains Mono', monospace" }}>{formatPrice(s.price, s.price_type)}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><span style={label}>Service Name</span><input value={s.name} onChange={e => updSvc(s.id, 'name', e.target.value)} style={inp} /></div>
                <div>
                  <span style={label}>Price Type</span>
                  <select value={s.price_type} onChange={e => updSvc(s.id, 'price_type', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {PRICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}><span style={label}>Description</span><textarea value={s.description} onChange={e => updSvc(s.id, 'description', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' as const }} /></div>
                <div><span style={label}>Price</span><input value={s.price} onChange={e => updSvc(s.id, 'price', e.target.value)} style={inp} /></div>
                <div><span style={label}>Units Label</span><input value={s.units_label} onChange={e => updSvc(s.id, 'units_label', e.target.value)} placeholder="projects" style={inp} /></div>
                <div><span style={label}>Units Completed</span><input value={s.units_conducted} onChange={e => updSvc(s.id, 'units_conducted', e.target.value)} style={inp} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ TAB: CONTACT ═══ */}
      {tab === 'contact' && (
        <div style={card}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--jp-text)', margin: '0 0 1rem' }}>Contact Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><span style={label}>Phone</span><input value={brand.business.phone} onChange={e => deepSet('business.phone', e.target.value)} placeholder="+1 (555) 555-5555" style={inp} /></div>
            <div><span style={label}>Booking URL</span><input value={brand.business.booking_url} onChange={e => deepSet('business.booking_url', e.target.value)} placeholder="https://calendly.com/..." style={inp} /></div>
            <div style={{ gridColumn: 'span 2' }}><span style={label}>Contact Page URL</span><input value={brand.business.contact_url} onChange={e => deepSet('business.contact_url', e.target.value)} placeholder="https://yoursite.com/contact" style={inp} /></div>
          </div>
        </div>
      )}

      {/* ═══ TAB: EXPORT ═══ */}
      {tab === 'export' && (
        <div>
          {/* Preview */}
          <div style={card}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--jp-text)', margin: '0 0 1rem' }}>Brand Preview</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {brand.identity.logos.primary.url && <img src={brand.identity.logos.primary.url} alt="Logo" style={{ height: 32 }} onError={e => (e.currentTarget.style.display = 'none')} />}
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--jp-text)' }}>{brand.business.name || 'Business Name'}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>{brand.business.tagline}</div>
              </div>
            </div>

            {/* Color swatches */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {Object.entries(brand.identity.colors).map(([k, v]) => (
                <div key={k} style={{ textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: v, border: '1px solid var(--jp-border)' }} />
                  <div style={{ fontSize: '0.5625rem', color: 'var(--jp-text-muted)', marginTop: 4 }}>{k}</div>
                </div>
              ))}
            </div>

            {/* Active facts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {brand.dynamic_facts.filter(f => f.enabled && f.value).map(f => (
                <span key={f.id} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(110,224,90,0.08)', border: '1px solid rgba(110,224,90,0.15)', color: 'var(--jp-green)', fontSize: '0.75rem', fontWeight: 600 }}>
                  {computeFact(f)}
                </span>
              ))}
            </div>

            {/* Active services */}
            {brand.services.filter(s => s.enabled && s.name).map(s => (
              <div key={s.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--jp-surface-elevated)', border: '1px solid var(--jp-border)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>{s.name}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--jp-green)', fontFamily: "'JetBrains Mono', monospace" }}>{formatPrice(s.price, s.price_type)}</span>
              </div>
            ))}
          </div>

          {/* Export actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={exportFile} style={{
              padding: '12px 24px', borderRadius: 10, background: 'var(--jp-green, #7ed957)',
              color: '#000', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Download .0n File
            </button>
            <button onClick={copyJson} style={{
              padding: '12px 24px', borderRadius: 10,
              background: copied ? 'rgba(110,224,90,0.15)' : 'var(--jp-surface-elevated)',
              color: copied ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
              border: '1px solid var(--jp-border)',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
            <button onClick={save} style={{
              padding: '12px 24px', borderRadius: 10,
              background: 'var(--jp-surface-elevated)',
              color: 'var(--jp-text-secondary)',
              border: '1px solid var(--jp-border)',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Save to Cloud
            </button>
          </div>

          {/* Danger zone */}
          <div style={{ marginTop: 32, padding: 16, borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
            <button onClick={() => { setBrand(JSON.parse(JSON.stringify(DEFAULT_BRAND))); setTab('import') }} style={{
              padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Reset Brand Profile
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
