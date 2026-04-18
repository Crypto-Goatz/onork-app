'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  description?: string
  productType?: string
  status?: string
  prices?: { id: string; amount: number; currency: string; type: string; recurring?: { interval: string } }[]
  image?: string
  createdAt?: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', priceType: 'one_time' })

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/products')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setProducts(data.products || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return
    setCreating(true)
    try {
      const res = await fetch('/api/crm/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: form.price ? parseFloat(form.price) * 100 : 0,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      setShowCreate(false)
      setForm({ name: '', description: '', price: '', priceType: 'one_time' })
      await fetchProducts()
    } catch {
      // handled silently
    } finally {
      setCreating(false)
    }
  }

  function getPrice(p: Product): string {
    if (p.prices && p.prices.length > 0) {
      const pr = p.prices[0]
      const amt = `$${(pr.amount / 100).toFixed(2)}`
      if (pr.recurring?.interval) return `${amt}/${pr.recurring.interval}`
      return amt
    }
    return 'No price'
  }

  function getPriceType(p: Product): string {
    if (p.prices && p.prices.length > 0) {
      const pr = p.prices[0]
      if (pr.recurring) return 'Recurring'
      return pr.type === 'one_time' ? 'One-time' : pr.type
    }
    return '—'
  }

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => !creating && setShowCreate(false)}>
          <div style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 16, padding: 28, maxWidth: 460, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 20px' }}>Create Product</h2>
            <form onSubmit={handleCreate}>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product Name</span>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Consultation Package"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </label>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</span>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Product description"
                  rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <label>
                  <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price (USD)</span>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="49.99"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </label>
                <label>
                  <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price Type</span>
                  <select value={form.priceType} onChange={e => setForm(f => ({ ...f, priceType: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                    <option value="one_time">One-time</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={creating || !form.name} style={{
                  flex: 1, padding: 12, background: creating ? '#374151' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                  color: creating ? '#9CA3AF' : '#0c1220', fontWeight: 700, fontSize: 14, borderRadius: 10, border: 'none', cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}>{creating ? 'Creating...' : 'Create Product'}</button>
                <button type="button" onClick={() => setShowCreate(false)} style={{
                  padding: '12px 20px', borderRadius: 10, border: '1px solid #1c2b42', background: 'transparent', color: 'var(--text-muted, #6b7280)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center' }}>
            Product Catalog
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>
            {products.length > 0 ? `${products.length} products` : 'Manage your product catalog and pricing'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ Create Product</button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px 12px 40px',
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 10, color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23556880' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: '14px center',
          }} />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #1c2b42', borderTopColor: 'var(--color-cyan, #14b8a6)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button onClick={fetchProducts} style={{ color: 'var(--color-cyan, #14b8a6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#127991;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 16 }}>
            {search ? 'No products match your search.' : 'No products yet. Create your first one.'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)} style={{
              padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
              color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
            }}>+ Create Product</button>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1c2b42' }}>
                {['Product', 'Price', 'Type', 'Status', 'Created'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(28,43,66,0.5)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a2740'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{p.description.slice(0, 60)}{p.description.length > 60 ? '...' : ''}</div>}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700, color: '#7ed957' }}>{getPrice(p)}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'rgba(45,212,191,0.1)', color: 'var(--color-cyan, #14b8a6)' }}>{getPriceType(p)}</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: p.status === 'active' ? '#7ed957' : 'var(--text-muted, #6b7280)' }}>{p.status || 'active'}</span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
