'use client'

import { useState, useEffect } from 'react'

export function LoadingScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [phase, setPhase] = useState(0) // 0=dark, 1=logo appears, 2=glow intensifies

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100)   // Logo fades in
    const t2 = setTimeout(() => setPhase(2), 800)   // Glow intensifies
    const t3 = setTimeout(() => setFadeOut(true), 2000)  // Start fade out
    const t4 = setTimeout(() => setVisible(false), 2800) // Remove
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
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
        transition: 'opacity 0.8s ease-out',
        pointerEvents: fadeOut ? 'none' : 'auto',
        overflow: 'hidden',
      }}
    >
      {/* Radial glow behind logo */}
      <div
        style={{
          position: 'absolute',
          width: 400, height: 400,
          borderRadius: '50%',
          background: phase >= 2
            ? 'radial-gradient(circle, rgba(126,217,87,0.15) 0%, rgba(126,217,87,0.05) 40%, transparent 70%)'
            : 'radial-gradient(circle, rgba(126,217,87,0.05) 0%, transparent 60%)',
          transition: 'all 1.2s ease-out',
          transform: phase >= 2 ? 'scale(1.3)' : 'scale(0.8)',
        }}
      />

      {/* Orbiting particles */}
      <style>{`
        @keyframes orbit1 {
          0% { transform: rotate(0deg) translateX(80px) rotate(0deg); opacity: 0.6; }
          50% { opacity: 1; }
          100% { transform: rotate(360deg) translateX(80px) rotate(-360deg); opacity: 0.6; }
        }
        @keyframes orbit2 {
          0% { transform: rotate(120deg) translateX(100px) rotate(-120deg); opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { transform: rotate(480deg) translateX(100px) rotate(-480deg); opacity: 0.4; }
        }
        @keyframes orbit3 {
          0% { transform: rotate(240deg) translateX(60px) rotate(-240deg); opacity: 0.5; }
          50% { opacity: 0.9; }
          100% { transform: rotate(600deg) translateX(60px) rotate(-600deg); opacity: 0.5; }
        }
        @keyframes logoPulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(126,217,87,0.3)); }
          50% { filter: drop-shadow(0 0 40px rgba(126,217,87,0.6)) drop-shadow(0 0 80px rgba(126,217,87,0.2)); }
        }
        @keyframes scanLine {
          0% { top: -2px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: calc(100% + 2px); opacity: 0; }
        }
        @keyframes textReveal {
          0% { opacity: 0; letter-spacing: 12px; }
          100% { opacity: 0.5; letter-spacing: 4px; }
        }
      `}</style>

      {/* Particle 1 */}
      <div style={{
        position: 'absolute',
        width: 4, height: 4, borderRadius: '50%',
        background: '#7ed957',
        boxShadow: '0 0 8px rgba(126,217,87,0.8)',
        animation: phase >= 1 ? 'orbit1 3s linear infinite' : 'none',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 0.5s',
      }} />

      {/* Particle 2 */}
      <div style={{
        position: 'absolute',
        width: 3, height: 3, borderRadius: '50%',
        background: '#00d4ff',
        boxShadow: '0 0 6px rgba(0,212,255,0.8)',
        animation: phase >= 1 ? 'orbit2 4s linear infinite' : 'none',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 0.5s',
      }} />

      {/* Particle 3 */}
      <div style={{
        position: 'absolute',
        width: 3, height: 3, borderRadius: '50%',
        background: '#a78bfa',
        boxShadow: '0 0 6px rgba(167,139,250,0.8)',
        animation: phase >= 1 ? 'orbit3 2.5s linear infinite' : 'none',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 0.5s',
      }} />

      {/* Logo container with scan line */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <img
          src="/brand/0ncore-logo.png"
          alt="0nCore"
          style={{
            height: 56,
            objectFit: 'contain',
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'scale(1)' : 'scale(0.9)',
            transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
            animation: phase >= 2 ? 'logoPulse 2s ease-in-out infinite' : 'none',
          }}
        />
        {/* Scan line effect */}
        {phase >= 2 && (
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(126,217,87,0.8), transparent)',
            animation: 'scanLine 1.5s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 24,
          fontSize: 11,
          fontWeight: 500,
          color: 'rgba(126,217,87,0.5)',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          animation: phase >= 2 ? 'textReveal 1s ease-out forwards' : 'none',
          opacity: phase >= 2 ? undefined : 0,
          letterSpacing: 4,
        }}
      >
        initializing
      </div>
    </div>
  )
}
