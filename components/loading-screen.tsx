'use client'

import { useState, useEffect } from 'react'

export function LoadingScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Start fade out after page loads
    const timer = setTimeout(() => setFadeOut(true), 600)
    const remove = setTimeout(() => setVisible(false), 1200)
    return () => { clearTimeout(timer); clearTimeout(remove) }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#020810',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.6s ease-out',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      <img
        src="/brand/loading.gif"
        alt="Loading"
        style={{
          width: 120, height: 120,
          filter: 'drop-shadow(0 0 40px rgba(126,217,87,0.3))',
        }}
      />
    </div>
  )
}
