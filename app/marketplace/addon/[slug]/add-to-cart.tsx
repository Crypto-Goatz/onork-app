'use client'

import { useState } from 'react'

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

export function AddToCartButton({ slug, name, price, priceLabel }: CartItem) {
  const [added, setAdded] = useState(false)

  function handleAdd() {
    const cart = getCart()
    if (cart.some(i => i.slug === slug)) {
      setAdded(true)
      return
    }
    cart.push({ slug, name, price, priceLabel })
    saveCart(cart)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <button
      onClick={handleAdd}
      style={{
        width: '100%', padding: '12px 20px', borderRadius: 10,
        background: added ? 'rgba(126,217,87,0.15)' : '#7ed957',
        color: added ? '#7ed957' : '#020810',
        fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {added ? 'Added to Cart' : 'Add to Cart'}
    </button>
  )
}
