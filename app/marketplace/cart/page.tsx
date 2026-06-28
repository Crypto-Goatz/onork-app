'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

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
      <main className="min-h-screen bg-[#020810] px-4 py-16 text-center font-sans text-white antialiased sm:px-6 sm:py-20">
        <p className="text-white/40">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#020810] font-sans text-white antialiased">
      <div className="mx-auto max-w-[700px] px-4 py-12 sm:px-6 sm:py-20">
        {/* Breadcrumb */}
        <nav className="mb-6 text-xs text-white/30">
          <Link href="/marketplace" className="text-white/40 transition-colors hover:text-[#7ed957]">Marketplace</Link>
          <span className="mx-2">/</span>
          <span className="text-white/60">Cart</span>
        </nav>

        <h1 className="mb-6 text-balance text-3xl font-black tracking-tight sm:text-4xl">
          <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">Your Cart</span>
        </h1>

        {cart.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-5 text-[15px] text-white/40">Your cart is empty.</p>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-6 py-2.5 text-sm font-bold text-[#020810] no-underline shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
            >Browse Add-ons<ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-3">
              {cart.map(item => (
                <div key={item.slug} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur">
                  <div>
                    <Link href={`/marketplace/addon/${item.slug}`} className="text-sm font-semibold text-white no-underline transition-colors hover:text-[#7ed957]">
                      {item.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-white/30">{item.priceLabel}</div>
                  </div>
                  <button
                    onClick={() => removeItem(item.slug)}
                    className="cursor-pointer border-none bg-transparent px-2 py-1 text-xs text-white/30 transition-colors hover:text-white/70"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-white/50">Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
                <span className="text-2xl font-extrabold">${(subtotal / 100).toFixed(2)}<span className="text-[13px] font-normal text-white/40">/mo</span></span>
              </div>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-6 py-3 text-[15px] font-bold text-[#020810] no-underline shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
              >
                Sign In to Checkout
              </Link>
              <p className="mt-2 text-center text-[11px] text-white/20">
                You need an account to complete your purchase.
              </p>
            </div>

            <div className="text-center">
              <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[13px] text-[#7ed957] no-underline transition-colors hover:text-[#7ed957]/80">
                <ArrowLeft className="h-3.5 w-3.5" /> Continue browsing
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
