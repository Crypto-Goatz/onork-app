'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Package, Loader2, AlertTriangle, RefreshCw, DollarSign, Tag,
} from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

interface Product {
  _id: string
  name: string
  description: string
  prices: Array<{ amount: number; currency: string; type: string }>
}

export default function ProductsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [productList, setProductList] = useState<Product[]>([])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await crm.products.list({ limit: 100 })
      setProductList(data.products || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  const formatPrice = (price: { amount: number; currency: string; type: string }) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(price.amount / 100)
    return `${formatted}${price.type === 'recurring' ? '/mo' : ''}`
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[#7ed957]" />
            Products
          </h1>
          <p className="text-xs text-white/40 mt-1">
            {productList.length} product{productList.length !== 1 ? 's' : ''} in your catalog
          </p>
        </div>
        <button
          onClick={() => { loadProducts(); toast.success('Products refreshed') }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-transparent text-white/50 text-xs font-medium cursor-pointer hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#7ed957]" />
        </div>
      )}

      {/* Product Grid */}
      {!loading && (
        <>
          {productList.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <Package className="w-10 h-10 mx-auto text-white/10 mb-3" />
              <p className="text-white/40 text-sm">No products found</p>
              <p className="text-white/20 text-xs mt-1">Products created in your CRM will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {productList.map(product => (
                <div key={product._id} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 hover:border-[#7ed957]/20 transition-colors">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-[#00d4ff]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-white truncate">{product.name}</h3>
                      {product.description && (
                        <p className="text-[11px] text-white/40 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Prices */}
                  {product.prices && product.prices.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                      {product.prices.map((price, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#7ed957]/10 text-[#7ed957] text-xs font-bold">
                          <DollarSign className="w-3 h-3" />
                          {formatPrice(price)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-white/[0.04]">
                      <span className="text-[10px] text-white/20">No prices set</span>
                    </div>
                  )}

                  <div className="mt-2">
                    <span className="text-[9px] font-mono text-white/15">{product._id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
