'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Routes that own their own viewport — the canvas, auth, etc. — should never
// be covered by the global loading screen. The canvas is the front-end layer.
const SKIP_PREFIXES = ['/canvas', '/login', '/signup', '/forgot-password', '/reset-password', '/auth']

export function LoadingScreen() {
  const pathname = usePathname()
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

  if (SKIP_PREFIXES.some((p) => pathname?.startsWith(p))) return null
  if (!visible) return null

  return (
    <div
      data-fade={fadeOut ? 'true' : 'false'}
      className="ls-root fixed inset-0 z-[9999] bg-[#020810] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Keyframe animations + phase-driven CSS */}
      <style>{`
        .ls-root { transition: opacity 0.8s ease-out; }
        .ls-root[data-fade='true'] { opacity: 0; pointer-events: none; }
        .ls-root[data-fade='false'] { opacity: 1; pointer-events: auto; }

        .ls-glow {
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(126,217,87,0.05) 0%, transparent 60%);
          transform: scale(0.8);
          transition: all 1.2s ease-out;
        }
        .ls-glow.phase2 {
          background: radial-gradient(circle, rgba(126,217,87,0.15) 0%, rgba(126,217,87,0.05) 40%, transparent 70%);
          transform: scale(1.3);
        }

        .ls-particle {
          position: absolute;
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.5s;
        }
        .ls-particle.active { opacity: 1; }

        .ls-p1 { width: 4px; height: 4px; background: #7ed957; box-shadow: 0 0 8px rgba(126,217,87,0.8); }
        .ls-p1.active { animation: orbit1 3s linear infinite; }

        .ls-p2 { width: 3px; height: 3px; background: #14b8a6; box-shadow: 0 0 6px rgba(20,184,166,0.8); }
        .ls-p2.active { animation: orbit2 4s linear infinite; }

        .ls-p3 { width: 3px; height: 3px; background: #8b5cf6; box-shadow: 0 0 6px rgba(139,92,246,0.8); }
        .ls-p3.active { animation: orbit3 2.5s linear infinite; }

        .ls-logo {
          height: 56px; object-fit: contain;
          opacity: 0; transform: scale(0.9);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }
        .ls-logo.phase1 { opacity: 1; transform: scale(1); }
        .ls-logo.phase2 { animation: logoPulse 2s ease-in-out infinite; }

        .ls-scan {
          position: absolute; left: 0; right: 0; height: 2px; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(126,217,87,0.8), transparent);
          animation: scanLine 1.5s ease-in-out infinite;
        }

        .ls-tagline {
          opacity: 0;
          margin-top: 24px;
          font-size: 11px; font-weight: 500;
          color: rgba(110,224,90,0.5);
          font-family: monospace;
          text-transform: uppercase;
          letter-spacing: 4px;
        }
        .ls-tagline.phase2 { animation: textReveal 1s ease-out forwards; }

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

      {/* Radial glow */}
      <div className={`ls-glow${phase >= 2 ? ' phase2' : ''}`} />

      {/* Particle 1 */}
      <div className={`ls-particle ls-p1${phase >= 1 ? ' active' : ''}`} />

      {/* Particle 2 */}
      <div className={`ls-particle ls-p2${phase >= 1 ? ' active' : ''}`} />

      {/* Particle 3 */}
      <div className={`ls-particle ls-p3${phase >= 1 ? ' active' : ''}`} />

      {/* Logo container with scan line */}
      <div className="relative z-[1]">
        <img
          src="/brand/0ncore-logo-dark.png"
          alt="0nCore"
          className={`ls-logo${phase >= 1 ? ' phase1' : ''}${phase >= 2 ? ' phase2' : ''}`}
        />
        {phase >= 2 && <div className="ls-scan" />}
      </div>

      {/* Tagline */}
      <div className={`ls-tagline${phase >= 2 ? ' phase2' : ''}`}>
        initializing
      </div>
    </div>
  )
}
