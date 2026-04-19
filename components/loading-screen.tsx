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
      {/* Animated logo */}
      <img
        src="/brand/0n-anim-logo.svg"
        alt="Loading"
        style={{
          width: 64, height: 64, marginBottom: 20,
          filter: 'drop-shadow(0 0 30px rgba(126,217,87,0.4))',
        }}
      />

      {/* Spinner */}
      <div style={{
        width: 24, height: 24, marginBottom: 12,
        border: '2px solid rgba(126,217,87,0.15)',
        borderTopColor: '#7ed957',
        borderRadius: '50%',
        animation: 'onLoadSpin 0.8s linear infinite',
      }} />

      <span style={{
        fontSize: 12, fontWeight: 600, color: 'rgba(126,217,87,0.5)',
        letterSpacing: '0.15em', textTransform: 'uppercase',
      }}>
        Loading
      </span>

      <style>{`
        @keyframes onLoadSpin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
