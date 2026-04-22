'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Package, ShoppingCart, RefreshCw, X } from 'lucide-react'

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
    <div className="max-w-[1100px] mx-auto px-2">

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => !creating && setShowCreate(false)}
        >
          <div
            className="bg-core-card border border-core-border rounded-2xl p-7 max-w-[460px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-core-text">Add Product</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-core-text-muted hover:text-core-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <label className="block mb-3">
                <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-[0.05em] mb-1">
                  Product Name
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Premium Widget"
                  className="w-full px-3 py-[10px] rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none focus:border-core-cyan/50 transition-colors"
                />
              </label>

              <label className="block mb-3">
                <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-[0.05em] mb-1">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Product description"
                  rows={3}
                  className="w-full px-3 py-[10px] rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none focus:border-core-cyan/50 transition-colors resize-y font-[inherit]"
                />
              </label>

              <label className="block mb-5">
                <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-[0.05em] mb-1">
                  Price (USD)
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="29.99"
                  className="w-full px-3 py-[10px] rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none focus:border-core-cyan/50 transition-colors"
                />
              </label>

              <div className="flex gap-2.5">
                <button
                  type="submit"
                  disabled={creating || !form.name}
                  className="flex-1 py-3 rounded-[10px] font-bold text-sm transition-all bg-gradient-to-br from-core-cyan to-teal-600 text-core-bg disabled:bg-core-surface disabled:text-core-text-muted disabled:cursor-not-allowed disabled:bg-none cursor-pointer font-[inherit]"
                >
                  {creating ? 'Adding...' : 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-5 py-3 rounded-[10px] border border-core-border bg-transparent text-core-text-muted text-sm cursor-pointer font-[inherit] hover:text-core-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-core-text m-0 flex items-center gap-2">
            E-Commerce Store
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-core-green/10 text-core-green border border-core-green/20">
              UNLIMITED
            </span>
          </h1>
          <p className="text-[13px] text-core-text-muted mt-1">
            {products.length > 0 ? `${products.length} products` : 'Manage products, orders, and inventory'}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-[11px] font-semibold text-core-green">Activated</span>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-br from-core-cyan to-teal-600 text-core-bg font-bold text-[13px] rounded-[10px] border-none cursor-pointer transition-opacity hover:opacity-90"
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-core-text-dim pointer-events-none" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-core-card border border-core-border rounded-[10px] text-core-text text-sm outline-none focus:border-core-cyan/50 transition-colors"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={28} className="text-core-cyan animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-core-card border border-core-border rounded-2xl p-10 text-center">
          <p className="text-core-red text-sm mb-3">{error}</p>
          <button
            onClick={fetchProducts}
            className="text-core-cyan bg-transparent border-none cursor-pointer text-[13px] font-semibold hover:underline"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-core-card border border-core-border rounded-2xl py-16 px-10 text-center">
          <ShoppingCart size={40} className="mx-auto mb-4 text-core-text-dim opacity-30" />
          <p className="text-core-text-dim text-sm mb-4">
            {search ? 'No products match your search.' : 'No products yet. Add your first one.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 mx-auto px-5 py-2.5 bg-gradient-to-br from-core-cyan to-teal-600 text-core-bg font-bold text-[13px] rounded-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
              Add Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {filtered.map(p => (
            <div
              key={p.id}
              className="bg-core-card border border-core-border rounded-xl overflow-hidden hover:border-core-border/80 hover:bg-core-card-hover transition-colors"
            >
              {/* Product image placeholder */}
              <div className="h-[120px] bg-gradient-to-br from-core-surface to-core-bg flex items-center justify-center">
                <Package size={36} className="text-core-text-dim opacity-20" />
              </div>

              <div className="px-5 py-4">
                <div className="text-[15px] font-semibold text-core-text mb-1.5">{p.name}</div>
                {p.description && (
                  <p className="text-[12px] text-core-text-muted mb-3 leading-[1.4]">
                    {p.description.slice(0, 80)}{p.description.length > 80 ? '...' : ''}
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[18px] font-bold text-core-green">{getPrice(p)}</span>
                  {p.status && (
                    <span className={`text-[11px] font-semibold ${p.status === 'active' ? 'text-core-green' : 'text-core-text-muted'}`}>
                      {p.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
