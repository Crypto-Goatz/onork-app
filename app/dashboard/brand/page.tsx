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

// Shared class strings
const inpCls = 'w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none font-[inherit] transition-colors focus:border-core-border-hi'
const labelCls = 'block text-[0.6875rem] font-semibold text-core-text-muted uppercase tracking-[0.06em] mb-1'
const cardCls = 'bg-core-card border border-core-border rounded-[14px] p-5 mb-4'

export default function BrandBuilder() {
  const [tab, setTab] = useState<TabKey>('import')
  const [brand, setBrand] = useState<BrandProfile>(JSON.parse(JSON.stringify(DEFAULT_BRAND)))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [copied, setCopied] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
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

  // Sync to CRM Brand Board
  async function syncToCRM() {
    setSyncing(true)
    setSynced(false)
    try {
      await fetch('/api/crm/brand-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: brand.business.name,
          colors: brand.identity.colors,
          fonts: {
            heading: brand.identity.fonts.display.family,
            body: brand.identity.fonts.body.family,
          },
          logos: brand.identity.logos,
        }),
      })
      setSynced(true)
      setTimeout(() => setSynced(false), 3000)
    } catch {}
    setSyncing(false)
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

  return (
    <div className="max-w-[900px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="jp-page-header flex items-center justify-between">
        <div>
          <h1 className="jp-page-title flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-[10px] bg-gradient-to-br from-core-green/15 to-core-purple/10 border border-core-green/25">
              <svg width="18" height="18" fill="none" stroke="#6EE05A" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </span>
            0nBrandBuilder
          </h1>
          <p className="jp-page-subtitle">
            {brand.business.name || 'New Brand'} {brand.sub_location_id ? `· ${brand.sub_location_id}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving}
            className={`px-5 py-2 rounded-lg text-[0.8125rem] font-bold transition-all font-[inherit] ${
              saved
                ? 'bg-core-green/15 text-core-green border border-core-green/30'
                : 'bg-core-green text-black border-none'
            }`}
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Brand'}
          </button>
          <button
            onClick={syncToCRM}
            disabled={syncing}
            className={`px-5 py-2 rounded-lg text-[0.8125rem] font-bold transition-all font-[inherit] border ${
              synced
                ? 'bg-core-cyan/15 text-core-cyan border-core-cyan/30'
                : 'bg-core-cyan/10 text-core-cyan border-core-cyan/20'
            } ${syncing ? 'cursor-wait' : 'cursor-pointer'}`}
          >
            {syncing ? 'Syncing...' : synced ? 'Synced to CRM' : 'Sync to CRM'}
          </button>
        </div>
      </div>

      {/* Sub-location ID */}
      <div className="mb-4">
        <span className={labelCls}>Sub-Location ID</span>
        <input
          value={brand.sub_location_id}
          onChange={e => deepSet('sub_location_id', e.target.value)}
          placeholder="loc_abc123"
          className={`${inpCls} max-w-[300px]`}
        />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-0.5 mb-5 rounded-xl bg-core-card border border-core-border p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 px-2 rounded-lg border-none text-[0.75rem] font-semibold cursor-pointer font-[inherit] transition-all flex items-center justify-center gap-1.5 ${
              tab === t.key
                ? 'bg-core-card-hover text-core-green shadow-sm'
                : 'bg-transparent text-core-text-muted'
            }`}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: IMPORT ═══ */}
      {tab === 'import' && (
        <div>
          <div className={cardCls}>
            <h3 className="text-[0.9375rem] font-bold text-core-text mt-0 mb-3">Import from URL</h3>
            <p className="text-[0.8125rem] text-core-text-dim mb-3 leading-relaxed">
              Enter a website URL and AI will extract brand colors, fonts, logos, and business details automatically.
            </p>
            <div className="flex gap-2">
              <input
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleImportUrl()}
                placeholder="https://example.com"
                className={`${inpCls} flex-1`}
              />
              <button
                onClick={handleImportUrl}
                disabled={importing}
                className="px-5 py-2.5 rounded-lg bg-core-green text-black font-bold text-[0.8125rem] border-none cursor-pointer font-[inherit] whitespace-nowrap"
              >
                {importing ? 'Extracting...' : 'Extract Brand'}
              </button>
            </div>
            {importError && <p className="text-[0.75rem] text-core-red mt-2">{importError}</p>}
          </div>

          <div className={cardCls}>
            <h3 className="text-[0.9375rem] font-bold text-core-text mt-0 mb-3">Import from File</h3>
            <p className="text-[0.8125rem] text-core-text-dim mb-3 leading-relaxed">
              Upload a .0n brand file, .json, or .txt document.
            </p>
            <input ref={fileRef} type="file" accept=".0n,.json,.txt" onChange={handleFileImport} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="px-5 py-2.5 rounded-lg bg-core-card-hover border border-core-border text-core-text-dim text-[0.8125rem] font-semibold cursor-pointer font-[inherit]"
            >
              Choose File
            </button>
          </div>

          <div className={cardCls}>
            <h3 className="text-[0.9375rem] font-bold text-core-text mt-0 mb-3">Start Fresh</h3>
            <button
              onClick={() => setTab('identity')}
              className="px-5 py-2.5 rounded-lg bg-transparent border border-core-border text-core-text-dim text-[0.8125rem] font-semibold cursor-pointer font-[inherit]"
            >
              Build from Scratch
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB: IDENTITY ═══ */}
      {tab === 'identity' && (
        <div>
          {/* Business Info */}
          <div className={cardCls}>
            <h3 className="text-[0.9375rem] font-bold text-core-text mt-0 mb-4">Business Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={labelCls}>Business Name</span>
                <input value={brand.business.name} onChange={e => deepSet('business.name', e.target.value)} className={inpCls} />
              </div>
              <div>
                <span className={labelCls}>
                  Founded Year {foundedAge !== null && foundedAge > 0 ? `(${foundedAge} years)` : ''}
                </span>
                <input value={brand.business.founded} onChange={e => deepSet('business.founded', e.target.value)} placeholder="2005" className={inpCls} />
              </div>
              <div className="col-span-2">
                <span className={labelCls}>Tagline</span>
                <input value={brand.business.tagline} onChange={e => deepSet('business.tagline', e.target.value)} className={inpCls} />
              </div>
              <div className="col-span-2">
                <span className={labelCls}>Description</span>
                <textarea value={brand.business.description} onChange={e => deepSet('business.description', e.target.value)} rows={2} className={`${inpCls} resize-y`} />
              </div>
            </div>
          </div>

          {/* Logos */}
          <div className={cardCls}>
            <h3 className="text-[0.9375rem] font-bold text-core-text mt-0 mb-4">Logos</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['primary', 'icon', 'dark', 'light'] as const).map(slot => (
                <div key={slot}>
                  <span className={labelCls}>{slot} Logo URL</span>
                  <input
                    value={brand.identity.logos[slot].url}
                    onChange={e => deepSet(`identity.logos.${slot}.url`, e.target.value)}
                    placeholder="https://..."
                    className={inpCls}
                  />
                  {brand.identity.logos[slot].url && (
                    <div className={`mt-2 p-3 rounded-lg border border-core-border text-center ${
                      slot === 'dark' ? 'bg-white' : slot === 'light' ? 'bg-black' : 'bg-core-card-hover'
                    }`}>
                      <img
                        src={brand.identity.logos[slot].url}
                        alt={slot}
                        className="max-h-10 max-w-full"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className={cardCls}>
            <h3 className="text-[0.9375rem] font-bold text-core-text mt-0 mb-4">Colors</h3>
            <div className="grid grid-cols-5 gap-3">
              {(['primary', 'secondary', 'accent', 'background', 'text_color'] as const).map(key => (
                <div key={key} className="text-center">
                  <span className={`${labelCls} text-center`}>{key.replace('_', ' ')}</span>
                  <input
                    type="color"
                    value={brand.identity.colors[key]}
                    onChange={e => deepSet(`identity.colors.${key}`, e.target.value)}
                    className="w-full h-10 rounded-lg border border-core-border cursor-pointer bg-transparent"
                  />
                  <input
                    value={brand.identity.colors[key]}
                    onChange={e => deepSet(`identity.colors.${key}`, e.target.value)}
                    className={`${inpCls} text-[0.6875rem] font-mono text-center mt-1 py-1.5 px-1`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div className={cardCls}>
            <h3 className="text-[0.9375rem] font-bold text-core-text mt-0 mb-4">Typography</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['display', 'body', 'mono'] as const).map(role => (
                <div key={role}>
                  <span className={labelCls}>{role} Font</span>
                  <input value={brand.identity.fonts[role].family} onChange={e => deepSet(`identity.fonts.${role}.family`, e.target.value)} className={inpCls} />
                  <span className={`${labelCls} mt-2`}>Weight</span>
                  <input value={brand.identity.fonts[role].weight} onChange={e => deepSet(`identity.fonts.${role}.weight`, e.target.value)} className={inpCls} />
                  <div
                    className="mt-2 p-2.5 rounded-md bg-core-card-hover text-[0.875rem] text-core-text"
                    style={{ fontFamily: brand.identity.fonts[role].family, fontWeight: parseInt(brand.identity.fonts[role].weight) || 400 }}
                  >
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
            <div key={f.id} className={`${cardCls} ${f.enabled ? 'opacity-100' : 'opacity-50'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  {/* Toggle */}
                  <button
                    onClick={() => updFact(f.id, 'enabled', !f.enabled)}
                    className={`relative w-9 h-5 rounded-full border-none cursor-pointer transition-colors ${f.enabled ? 'bg-core-green' : 'bg-core-border'}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${f.enabled ? 'left-[18px]' : 'left-0.5'}`}
                    />
                  </button>
                  <span className="text-[0.8125rem] font-semibold text-core-text">{f.label || 'New Fact'}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-[0.75rem] text-core-green font-bold font-mono">{computeFact(f)}</span>
                  <button
                    onClick={() => rmFact(f.id)}
                    className="px-2 py-1 rounded-md border border-core-red/20 bg-core-red/5 text-core-red text-[0.6875rem] cursor-pointer font-[inherit]"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                <div>
                  <span className={labelCls}>Label</span>
                  <input value={f.label} onChange={e => updFact(f.id, 'label', e.target.value)} className={inpCls} />
                </div>
                <div>
                  <span className={labelCls}>Type</span>
                  <select value={f.type} onChange={e => updFact(f.id, 'type', e.target.value)} className={`${inpCls} cursor-pointer`}>
                    {FACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <span className={labelCls}>Value</span>
                  <input value={f.value} onChange={e => updFact(f.id, 'value', e.target.value)} className={inpCls} />
                </div>
                <div>
                  <span className={labelCls}>Suffix</span>
                  <input value={f.suffix} onChange={e => updFact(f.id, 'suffix', e.target.value)} className={inpCls} />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addFact}
            className="w-full px-5 py-2.5 rounded-lg border border-dashed border-core-border bg-transparent text-core-green text-[0.8125rem] font-semibold cursor-pointer font-[inherit]"
          >
            + Add Fact
          </button>
        </div>
      )}

      {/* ═══ TAB: SERVICES ═══ */}
      {tab === 'services' && (
        <div>
          {brand.services.map(s => (
            <div key={s.id} className={`${cardCls} ${s.enabled ? 'opacity-100' : 'opacity-50'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  {/* Toggle */}
                  <button
                    onClick={() => updSvc(s.id, 'enabled', !s.enabled)}
                    className={`relative w-9 h-5 rounded-full border-none cursor-pointer transition-colors ${s.enabled ? 'bg-core-green' : 'bg-core-border'}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${s.enabled ? 'left-[18px]' : 'left-0.5'}`}
                    />
                  </button>
                  <span className="text-[0.875rem] font-bold text-core-text">Service {s.id}</span>
                </div>
                {s.price && (
                  <span className="text-[0.8125rem] font-bold text-core-green font-mono">{formatPrice(s.price, s.price_type)}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className={labelCls}>Service Name</span>
                  <input value={s.name} onChange={e => updSvc(s.id, 'name', e.target.value)} className={inpCls} />
                </div>
                <div>
                  <span className={labelCls}>Price Type</span>
                  <select value={s.price_type} onChange={e => updSvc(s.id, 'price_type', e.target.value)} className={`${inpCls} cursor-pointer`}>
                    {PRICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <span className={labelCls}>Description</span>
                  <textarea value={s.description} onChange={e => updSvc(s.id, 'description', e.target.value)} rows={2} className={`${inpCls} resize-y`} />
                </div>
                <div>
                  <span className={labelCls}>Price</span>
                  <input value={s.price} onChange={e => updSvc(s.id, 'price', e.target.value)} className={inpCls} />
                </div>
                <div>
                  <span className={labelCls}>Units Label</span>
                  <input value={s.units_label} onChange={e => updSvc(s.id, 'units_label', e.target.value)} placeholder="projects" className={inpCls} />
                </div>
                <div>
                  <span className={labelCls}>Units Completed</span>
                  <input value={s.units_conducted} onChange={e => updSvc(s.id, 'units_conducted', e.target.value)} className={inpCls} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ TAB: CONTACT ═══ */}
      {tab === 'contact' && (
        <div className={cardCls}>
          <h3 className="text-[0.9375rem] font-bold text-core-text mt-0 mb-4">Contact Information</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={labelCls}>Phone</span>
              <input value={brand.business.phone} onChange={e => deepSet('business.phone', e.target.value)} placeholder="+1 (555) 555-5555" className={inpCls} />
            </div>
            <div>
              <span className={labelCls}>Booking URL</span>
              <input value={brand.business.booking_url} onChange={e => deepSet('business.booking_url', e.target.value)} placeholder="https://calendly.com/..." className={inpCls} />
            </div>
            <div className="col-span-2">
              <span className={labelCls}>Contact Page URL</span>
              <input value={brand.business.contact_url} onChange={e => deepSet('business.contact_url', e.target.value)} placeholder="https://yoursite.com/contact" className={inpCls} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: EXPORT ═══ */}
      {tab === 'export' && (
        <div>
          {/* Preview */}
          <div className={cardCls}>
            <h3 className="text-[0.9375rem] font-bold text-core-text mt-0 mb-4">Brand Preview</h3>
            <div className="flex items-center gap-3 mb-4">
              {brand.identity.logos.primary.url && (
                <img
                  src={brand.identity.logos.primary.url}
                  alt="Logo"
                  className="h-8"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div>
                <div className="text-lg font-extrabold text-core-text">{brand.business.name || 'Business Name'}</div>
                <div className="text-[0.8125rem] text-core-text-dim">{brand.business.tagline}</div>
              </div>
            </div>

            {/* Color swatches */}
            <div className="flex gap-1.5 mb-4">
              {Object.entries(brand.identity.colors).map(([k, v]) => (
                <div key={k} className="text-center">
                  <div
                    className="w-10 h-10 rounded-lg border border-core-border"
                    style={{ background: v }}
                  />
                  <div className="text-[0.5625rem] text-core-text-muted mt-1">{k}</div>
                </div>
              ))}
            </div>

            {/* Active facts */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {brand.dynamic_facts.filter(f => f.enabled && f.value).map(f => (
                <span
                  key={f.id}
                  className="px-2.5 py-1 rounded-md bg-core-green/[0.08] border border-core-green/15 text-core-green text-[0.75rem] font-semibold"
                >
                  {computeFact(f)}
                </span>
              ))}
            </div>

            {/* Active services */}
            {brand.services.filter(s => s.enabled && s.name).map(s => (
              <div
                key={s.id}
                className="px-3 py-2.5 rounded-lg bg-core-card-hover border border-core-border mb-1.5 flex justify-between"
              >
                <span className="text-[0.8125rem] font-semibold text-core-text">{s.name}</span>
                <span className="text-[0.8125rem] font-bold text-core-green font-mono">{formatPrice(s.price, s.price_type)}</span>
              </div>
            ))}
          </div>

          {/* Export actions */}
          <div className="flex gap-2.5 flex-wrap">
            <button
              onClick={exportFile}
              className="px-6 py-3 rounded-[10px] bg-core-green text-black font-bold text-[0.875rem] border-none cursor-pointer font-[inherit]"
            >
              Download .0n File
            </button>
            <button
              onClick={copyJson}
              className={`px-6 py-3 rounded-[10px] border border-core-border font-semibold text-[0.875rem] cursor-pointer font-[inherit] transition-all ${
                copied
                  ? 'bg-core-green/15 text-core-green'
                  : 'bg-core-card-hover text-core-text-dim'
              }`}
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
            <button
              onClick={save}
              className="px-6 py-3 rounded-[10px] bg-core-card-hover text-core-text-dim border border-core-border font-semibold text-[0.875rem] cursor-pointer font-[inherit]"
            >
              Save to Cloud
            </button>
          </div>

          {/* Danger zone */}
          <div className="mt-8 p-4 rounded-[10px] border border-core-red/20 bg-core-red/[0.03]">
            <button
              onClick={() => { setBrand(JSON.parse(JSON.stringify(DEFAULT_BRAND))); setTab('import') }}
              className="px-4 py-2 rounded-lg bg-core-red/10 border border-core-red/20 text-core-red text-[0.8125rem] font-semibold cursor-pointer font-[inherit]"
            >
              Reset Brand Profile
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
