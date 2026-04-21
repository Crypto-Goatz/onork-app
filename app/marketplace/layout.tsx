import Link from 'next/link'

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(10px, 2vw, 12px) clamp(16px, 4vw, 32px)',
        background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/brand/0ncore-logo.png" alt="0nCore" style={{ height: 32, objectFit: 'contain' }} />
        </Link>
        <div className="mp-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link href="/marketplace" style={{ fontSize: 13, color: '#7ed957', textDecoration: 'none', fontWeight: 600 }}>Marketplace</Link>
          <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/connections" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Connections</Link>
          <Link href="/login" style={{
            fontSize: 13, fontWeight: 600, color: '#020810',
            background: '#7ed957', padding: '8px 20px', borderRadius: 8,
            textDecoration: 'none',
          }}>VIP Access</Link>
        </div>
        <Link href="/login" className="mp-mobile-cta" style={{
          display: 'none', fontSize: 13, fontWeight: 600, color: '#020810',
          background: '#7ed957', padding: '8px 20px', borderRadius: 8,
          textDecoration: 'none',
        }}>VIP Access</Link>
      </nav>

      {/* Content */}
      <main style={{ paddingTop: 56 }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>&copy; 2026 RocketOpp LLC. Powered by 0nMCP.</span>
        <div style={{ display: 'flex', gap: 'clamp(12px, 2vw, 20px)', flexWrap: 'wrap' }}>
          <Link href="/marketplace" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Marketplace</Link>
          <Link href="/pricing" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/connections" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Connections</Link>
          <Link href="/request" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Request Access</Link>
          <a href="https://0nmcp.com" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>0nMCP</a>
          <a href="mailto:mike@rocketopp.com" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .mp-nav-links { display: none !important; }
          .mp-mobile-cta { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
