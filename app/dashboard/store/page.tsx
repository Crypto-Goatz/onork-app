'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  description?: string
  price?: number
  currency?: string
  status?: string
  image?: string
  inventory?: number
  prices?: { amount: number; currency: string; type: string }[]
}

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '' })

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
      setForm({ name: '', description: '', price: '' })
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
      return `$${(pr.amount / 100).toFixed(2)}`
    }
    if (p.price) return `$${(p.price / 100).toFixed(2)}`
    return 'Free'
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
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 20px' }}>Add Product</h2>
            <form onSubmit={handleCreate}>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product Name</span>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Premium Widget"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </label>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</span>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Product description"
                  rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
              </label>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price (USD)</span>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="29.99"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={creating || !form.name} style={{
                  flex: 1, padding: 12, background: creating ? '#374151' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                  color: creating ? '#9CA3AF' : '#0c1220', fontWeight: 700, fontSize: 14, borderRadius: 10, border: 'none', cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}>{creating ? 'Adding...' : 'Add Product'}</button>
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
            E-Commerce Store
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>
            {products.length > 0 ? `${products.length} products` : 'Manage products, orders, and inventory'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ Add Product</button>
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
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#128722;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 16 }}>
            {search ? 'No products match your search.' : 'No products yet. Add your first one.'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)} style={{
              padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
              color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
            }}>+ Add Product</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map(p => (
            <div key={p.id} style={{
              background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <div style={{ height: 120, background: 'linear-gradient(135deg, #1a2740, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 36, opacity: 0.2 }}>&#128230;</span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)', marginBottom: 6 }}>{p.name}</div>
                {p.description && <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 12, lineHeight: 1.4 }}>{p.description.slice(0, 80)}{p.description.length > 80 ? '...' : ''}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#7ed957' }}>{getPrice(p)}</span>
                  {p.status && <span style={{ fontSize: 11, fontWeight: 600, color: p.status === 'active' ? '#7ed957' : 'var(--text-muted, #6b7280)' }}>{p.status}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
