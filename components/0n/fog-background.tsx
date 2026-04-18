export function FogBackground() {
  return (
    <>
      <div className='fog-layer' style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse at 20% 60%, rgba(126,217,87,0.07) 0%, transparent 55%)', animation: 'fog-drift-1 12s ease-in-out infinite alternate' }} />
      <div className='fog-layer' style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse at 80% 30%, rgba(126,217,87,0.05) 0%, transparent 50%)', animation: 'fog-drift-2 16s ease-in-out infinite alternate' }} />
      <div className='fog-layer' style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse at 50% 90%, rgba(20,184,166,0.04) 0%, transparent 50%)', animation: 'fog-drift-3 20s ease-in-out infinite alternate' }} />
      <style>{`
        @keyframes fog-drift-1 { 0% { transform: translate(0,0) scale(1); opacity:.6; } 100% { transform: translate(40px,-30px) scale(1.15); opacity:1; } }
        @keyframes fog-drift-2 { 0% { transform: translate(0,0) scale(1.1); opacity:.5; } 100% { transform: translate(-50px,20px) scale(1); opacity:.9; } }
        @keyframes fog-drift-3 { 0% { transform: translate(0,0) scale(1); opacity:.4; } 100% { transform: translate(30px,-40px) scale(1.2); opacity:.7; } }
        @media (prefers-reduced-motion: reduce) { .fog-layer { animation: none !important; } }
      `}</style>
    </>
  )
}
