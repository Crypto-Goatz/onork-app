'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [toggled, setToggled] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [showToggle, setShowToggle] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [exiting, setExiting] = useState(false)
  const pulseRef = useRef<NodeJS.Timeout | null>(null)

  const fullText = 'One brain. Every service. Zero limits.'

  // Typing animation
  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i))
        i++
      } else {
        clearInterval(timer)
        // Show toggle after typing completes
        setTimeout(() => setShowToggle(true), 400)
      }
    }, 55)
    return () => clearInterval(timer)
  }, [])

  // Pulse effect every 2 seconds
  useEffect(() => {
    if (!showToggle || toggled) return
    pulseRef.current = setInterval(() => {
      setPulse(true)
      setTimeout(() => setPulse(false), 600)
    }, 2000)
    return () => { if (pulseRef.current) clearInterval(pulseRef.current) }
  }, [showToggle, toggled])

  // Handle toggle
  function handleToggle() {
    if (toggled) return
    setToggled(true)
    if (pulseRef.current) clearInterval(pulseRef.current)

    // Exit animation then navigate
    setTimeout(() => setExiting(true), 800)
    setTimeout(() => router.push('/login'), 1800)
  }

  return (
    <div
      className={`landing-root ${exiting ? 'landing-exit' : ''}`}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-deep, #040A1A)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Parallax orb background — fixed position, gradient overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'url(/bg/0n-orb.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        willChange: 'transform',
      }} />

      {/* Multi-layer gradient overlay for depth + readability */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: [
          'radial-gradient(ellipse at 50% 40%, transparent 0%, rgba(4,10,26,0.3) 50%, rgba(4,10,26,0.85) 100%)',
          'linear-gradient(180deg, rgba(4,10,26,0.1) 0%, rgba(4,10,26,0.4) 40%, rgba(4,10,26,0.7) 100%)',
          'radial-gradient(circle at 50% 50%, rgba(126,217,87,0.06) 0%, transparent 60%)',
        ].join(', '),
      }} />

      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Logo */}
      <img
        src="/logo.png"
        alt="0nCore"
        style={{
          height: 'clamp(50px, 8vw, 80px)',
          objectFit: 'contain',
          marginBottom: '1.5rem',
          position: 'relative',
          zIndex: 2,
          filter: 'drop-shadow(0 0 30px rgba(126, 217, 87, 0.3))',
        }}
      />

      {/* Blur glow effect title */}
      <div className="blur-title-container">
        <h1 className="blur-title" data-text="0nAI">
          0nAI
        </h1>
      </div>

      {/* Typed subtitle */}
      <div
        style={{
          marginTop: '2rem',
          minHeight: '2rem',
          textAlign: 'center',
        }}
      >
        <span className="typed-text">
          {typedText}
          <span className="typed-cursor">|</span>
        </span>
      </div>

      {/* Toggle switch */}
      <div
        style={{
          marginTop: '3rem',
          opacity: showToggle ? 1 : 0,
          transform: showToggle ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <button
          onClick={handleToggle}
          className={`toggle-switch ${toggled ? 'toggled' : ''} ${pulse && !toggled ? 'pulse' : ''}`}
          aria-label="Turn it on"
        >
          <div className="toggle-track">
            <div className="toggle-thumb" />
          </div>
        </button>
      </div>

      {/* Powered by footer */}
      <div
        style={{
          position: 'absolute',
          bottom: '2rem',
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'var(--text-muted, #6b7280)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Powered by 0nMCP — RocketOpp LLC
      </div>

      <style>{`
        /* ── Grain Overlay ──────────────────────────────── */
        .grain-overlay {
          position: fixed;
          top: -50%;
          left: -50%;
          right: -50%;
          bottom: -50%;
          width: 200%;
          height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
          opacity: 0.6;
        }

        /* ── Blur Title Effect ──────────────────────────── */
        .blur-title-container {
          position: relative;
          z-index: 2;
        }

        .blur-title {
          font-size: clamp(4rem, 12vw, 10rem);
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--bg-deep, #040A1A);
          text-transform: lowercase;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          text-shadow:
            0 0 20px rgba(126, 217, 87, 0.8),
            0 0 40px rgba(126, 217, 87, 0.6),
            0 0 80px rgba(126, 217, 87, 0.4),
            0 0 120px rgba(126, 217, 87, 0.3),
            0 4px 30px rgba(126, 217, 87, 0.5),
            0 -4px 30px rgba(126, 217, 87, 0.3),
            0 0 160px rgba(126, 217, 87, 0.2);
          -webkit-text-stroke: 1px rgba(126, 217, 87, 0.15);
          animation: blur-breathe 4s ease-in-out infinite;
          user-select: none;
        }

        .blur-title::before {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          color: transparent;
          text-shadow:
            0 0 60px rgba(126, 217, 87, 0.9),
            0 0 120px rgba(126, 217, 87, 0.5),
            0 8px 40px rgba(126, 217, 87, 0.6);
          filter: blur(8px);
          z-index: -1;
        }

        .blur-title::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          color: transparent;
          text-shadow:
            0 0 100px rgba(126, 217, 87, 0.4),
            0 20px 60px rgba(126, 217, 87, 0.3);
          filter: blur(30px);
          z-index: -2;
          animation: blur-drip 3s ease-in-out infinite alternate;
        }

        @keyframes blur-breathe {
          0%, 100% {
            text-shadow:
              0 0 20px rgba(126, 217, 87, 0.8),
              0 0 40px rgba(126, 217, 87, 0.6),
              0 0 80px rgba(126, 217, 87, 0.4),
              0 0 120px rgba(126, 217, 87, 0.3),
              0 4px 30px rgba(126, 217, 87, 0.5),
              0 -4px 30px rgba(126, 217, 87, 0.3),
              0 0 160px rgba(126, 217, 87, 0.2);
          }
          50% {
            text-shadow:
              0 0 30px rgba(126, 217, 87, 0.9),
              0 0 60px rgba(126, 217, 87, 0.7),
              0 0 100px rgba(126, 217, 87, 0.5),
              0 0 140px rgba(126, 217, 87, 0.35),
              0 6px 40px rgba(126, 217, 87, 0.6),
              0 -6px 40px rgba(126, 217, 87, 0.4),
              0 0 200px rgba(126, 217, 87, 0.25);
          }
        }

        @keyframes blur-drip {
          0% { transform: translateY(0); opacity: 0.6; }
          100% { transform: translateY(8px); opacity: 0.4; }
        }

        /* ── Typed Text ────────────────────────────────── */
        .typed-text {
          font-size: clamp(0.9rem, 2vw, 1.2rem);
          color: var(--text-muted, #6b7280);
          letter-spacing: 0.05em;
          font-weight: 300;
          position: relative;
          z-index: 2;
        }

        .typed-cursor {
          color: var(--accent, #7ed957);
          animation: cursor-blink 0.8s step-end infinite;
          font-weight: 200;
          margin-left: 2px;
        }

        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* ── Toggle Switch ─────────────────────────────── */
        .toggle-switch {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          position: relative;
          z-index: 2;
          outline: none;
        }

        .toggle-track {
          width: 72px;
          height: 36px;
          background: var(--bg-secondary, #161b22);
          border-radius: 18px;
          border: 1px solid var(--border, #30363d);
          position: relative;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .toggle-thumb {
          width: 28px;
          height: 28px;
          background: var(--text-muted, #6b7280);
          border-radius: 50%;
          position: absolute;
          top: 3px;
          left: 4px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Toggled ON state */
        .toggle-switch.toggled .toggle-track {
          background: rgba(126, 217, 87, 0.15);
          border-color: var(--accent, #7ed957);
          box-shadow: 0 0 30px rgba(126, 217, 87, 0.4), 0 0 60px rgba(126, 217, 87, 0.2);
        }

        .toggle-switch.toggled .toggle-thumb {
          left: 40px;
          background: var(--accent, #7ed957);
          box-shadow: 0 0 20px rgba(126, 217, 87, 0.8);
        }

        /* Pulse animation */
        .toggle-switch.pulse .toggle-track {
          box-shadow: 0 0 0 0 rgba(126, 217, 87, 0.5);
          animation: toggle-pulse 0.6s ease-out;
        }

        @keyframes toggle-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(126, 217, 87, 0.5);
          }
          70% {
            box-shadow: 0 0 0 16px rgba(126, 217, 87, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(126, 217, 87, 0);
          }
        }

        /* ── Exit Animation ────────────────────────────── */
        .landing-exit {
          animation: landing-dissolve 1s ease-in forwards;
        }

        @keyframes landing-dissolve {
          0% { opacity: 1; filter: blur(0); }
          100% { opacity: 0; filter: blur(20px); }
        }

        /* ── Hover ─────────────────────────────────────── */
        .toggle-switch:not(.toggled):hover .toggle-track {
          border-color: var(--text-muted, #6b7280);
        }

        .toggle-switch:not(.toggled):hover .toggle-thumb {
          background: var(--text-secondary, #9ca3af);
        }
      `}</style>
    </div>
  )
}
