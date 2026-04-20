'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CartItem {
  slug: string
  name: string
  price: number
  priceLabel: string
}

function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('0ncore_cart') || '[]')
  } catch {
    return []
  }
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem('0ncore_cart', JSON.stringify(cart))
  window.dispatchEvent(new Event('cart-updated'))
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setCart(getCart())
    setMounted(true)
    const handler = () => setCart(getCart())
    window.addEventListener('cart-updated', handler)
    return () => window.removeEventListener('cart-updated', handler)
  }, [])

  function removeItem(slug: string) {
    const updated = cart.filter(i => i.slug !== slug)
    saveCart(updated)
    setCart(updated)
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price, 0)

  if (!mounted) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>
        <Link href="/marketplace" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Marketplace</Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Cart</span>
      </nav>

      <h1 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, marginBottom: 24 }}>Your Cart</h1>

      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Your cart is empty.</p>
          <Link href="/marketplace" style={{
            display: 'inline-block', padding: '10px 24px', background: '#7ed957', color: '#020810',
            fontWeight: 700, borderRadius: 8, textDecoration: 'none', fontSize: 14,
          }}>Browse Add-ons</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {cart.map(item => (
              <div key={item.slug} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 16, borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div>
                  <Link href={`/marketplace/addon/${item.slug}`} style={{ fontSize: 14, fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
                    {item.name}
                  </Link>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{item.priceLabel}</div>
                </div>
                <button
                  onClick={() => removeItem(item.slug)}
                  style={{
                    fontSize: 12, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '4px 8px',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{
            padding: 20, borderRadius: 16,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
              <span style={{ fontSize: 24, fontWeight: 800 }}>${(subtotal / 100).toFixed(2)}<span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>/mo</span></span>
            </div>
            <Link href="/login" style={{
              display: 'block', textAlign: 'center', padding: '12px 24px',
              background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10,
              textDecoration: 'none', fontSize: 15,
            }}>
              Sign In to Checkout
            </Link>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 8 }}>
              You need an account to complete your purchase.
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link href="/marketplace" style={{ fontSize: 13, color: '#7ed957', textDecoration: 'none' }}>
              &larr; Continue browsing
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
