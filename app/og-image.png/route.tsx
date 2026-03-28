import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0c1220 0%, #141e30 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #2dd4bf, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 900,
              color: '#fff',
            }}
          >
            0n
          </div>
          <span style={{ fontSize: 56, fontWeight: 900, color: '#e8ecf2' }}>
            <span style={{ color: '#2dd4bf' }}>0n</span>Core
          </span>
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#8b9ab5',
            marginBottom: 40,
            letterSpacing: '0.05em',
          }}
        >
          One brain. Every service. Zero limits.
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          {[
            { n: '900+', l: 'Tools' },
            { n: '55', l: 'Services' },
            { n: '5', l: 'AI Models' },
            { n: '$80', l: '/month' },
          ].map((s) => (
            <div
              key={s.l}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 28px',
                background: 'rgba(45,212,191,0.08)',
                border: '1px solid rgba(45,212,191,0.2)',
                borderRadius: 12,
              }}
            >
              <span style={{ fontSize: 32, fontWeight: 900, color: '#2dd4bf' }}>{s.n}</span>
              <span style={{ fontSize: 14, color: '#556880', marginTop: 4 }}>{s.l}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 24, fontSize: 14, color: '#556880' }}>
          0ncore.com — Powered by 0nMCP — RocketOpp LLC
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
