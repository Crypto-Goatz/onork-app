'use client'

import { useState, useEffect } from 'react'

export function LoadingScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [phase, setPhase] = useState(0) // 0=dark, 1=logo appears, 2=glow intensifies

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100)
    const t2 = setTimeout(() => setPhase(2), 800)
    const t3 = setTimeout(() => setFadeOut(true), 2000)
    const t4 = setTimeout(() => setVisible(false), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  if (!visible) return null

  return (
    <div
      className={[
        'fixed inset-0 z-[9999] bg-[#020810] flex flex-col items-center justify-center overflow-hidden',
        'transition-opacity duration-[800ms] ease-out',
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto',
      ].join(' ')}
    >
      {/* Radial glow behind logo */}
      <div
        className={[
          'absolute w-[400px] h-[400px] rounded-full transition-all duration-[1200ms] ease-out',
          phase >= 2 ? 'scale-[1.3]' : 'scale-[0.8]',
        ].join(' ')}
        style={{
          background: phase >= 2
            ? 'radial-gradient(circle, rgba(126,217,87,0.15) 0%, rgba(126,217,87,0.05) 40%, transparent 70%)'
            : 'radial-gradient(circle, rgba(126,217,87,0.05) 0%, transparent 60%)',
        }}
      />

      {/* Keyframe animations */}
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
      <div
        className="absolute w-1 h-1 rounded-full bg-[#6EE05A] shadow-[0_0_8px_rgba(126,217,87,0.8)] transition-opacity duration-500"
        style={{
          animation: phase >= 1 ? 'orbit1 3s linear infinite' : 'none',
          opacity: phase >= 1 ? 1 : 0,
        }}
      />

      {/* Particle 2 */}
      <div
        className="absolute w-[3px] h-[3px] rounded-full bg-[#14b8a6] shadow-[0_0_6px_rgba(20,184,166,0.8)] transition-opacity duration-500"
        style={{
          animation: phase >= 1 ? 'orbit2 4s linear infinite' : 'none',
          opacity: phase >= 1 ? 1 : 0,
        }}
      />

      {/* Particle 3 */}
      <div
        className="absolute w-[3px] h-[3px] rounded-full bg-[#8b5cf6] shadow-[0_0_6px_rgba(139,92,246,0.8)] transition-opacity duration-500"
        style={{
          animation: phase >= 1 ? 'orbit3 2.5s linear infinite' : 'none',
          opacity: phase >= 1 ? 1 : 0,
        }}
      />

      {/* Logo container with scan line */}
      <div className="relative z-[1]">
        <img
          src="/brand/0ncore-logo.png"
          alt="0nCore"
          className="h-14 object-contain transition-[opacity,transform] duration-[800ms] ease-out"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'scale(1)' : 'scale(0.9)',
            animation: phase >= 2 ? 'logoPulse 2s ease-in-out infinite' : 'none',
          }}
        />
        {phase >= 2 && (
          <div
            className="absolute left-0 right-0 h-0.5 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(126,217,87,0.8), transparent)',
              animation: 'scanLine 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Tagline */}
      <div
        className="mt-6 text-[11px] font-medium text-[#6EE05A]/50 font-mono uppercase tracking-[4px]"
        style={{
          animation: phase >= 2 ? 'textReveal 1s ease-out forwards' : 'none',
          opacity: phase >= 2 ? undefined : 0,
        }}
      >
        initializing
      </div>
    </div>
  )
}
