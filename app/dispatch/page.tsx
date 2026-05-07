/**
 * dispatch.0ncore.com landing page.
 *
 * Static index of the dispatch API endpoints. Served at the root of the
 * dispatch subdomain via host-based rewrite in next.config.ts. No auth,
 * no app shell — just a clean catalog so anyone hitting the bare subdomain
 * sees what's available without having to know the route names.
 */

export const dynamic = 'force-static'
export const revalidate = 3600

const ENDPOINTS = [
  { path: '/version', desc: 'Current dispatch SHA + commit metadata. Polled by clients to detect cache-stale.' },
  { path: '/rules', desc: 'Live numbered rule list. Replaces every CLAUDE.md hard rule across the family.' },
  { path: '/ecosystem', desc: 'Map of every product, repo, Vercel project, and domain.' },
  { path: '/state', desc: 'Live state snapshot — which sites are up, which are flagged, which are broken.' },
  { path: '/products/:slug', desc: 'Per-product config. Try /products/onork-app or /products/0nmcp.com.' },
  { path: '/credentials-index', desc: 'Manifest of issued credential keys. Read-only metadata; never returns secrets.' },
]

export default function DispatchLanding() {
  return (
    <div style={{ background: '#0d1117', color: '#e6edf3', minHeight: '100vh', padding: '64px 24px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>dispatch.0ncore.com</h1>
        <p style={{ color: '#8b949e', marginBottom: 32 }}>
          Canonical rules + ecosystem map for the RocketOpp / 0n family. Read-only HTTP API. The
          authoritative source for every Claude / AI session that touches our codebase.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Endpoints</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {ENDPOINTS.map((e) => (
            <a
              key={e.path}
              href={e.path.replace(':slug', 'onork-app')}
              style={{
                display: 'block',
                padding: 16,
                border: '1px solid #30363d',
                borderRadius: 8,
                background: '#161b22',
                textDecoration: 'none',
                color: '#e6edf3',
              }}
            >
              <code style={{ color: '#79c0ff', fontWeight: 600 }}>GET {e.path}</code>
              <p style={{ marginTop: 6, marginBottom: 0, color: '#8b949e', fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>
                {e.desc}
              </p>
            </a>
          ))}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>How clients use it</h2>
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 16, fontSize: 14 }}>
          <p style={{ marginTop: 0 }}>
            Every product repo runs <code>bash scripts/sync-from-dispatch.sh</code> to refresh
            <code> .dispatch-cache/*.json</code> from the live API. CLAUDE.md files in each
            repo are pointer files only — the live rules live here.
          </p>
          <p>
            Signed <code>.0n</code> exports are also served at <code>/api/dispatch/.0n/&lt;section&gt;</code>
            with the public verify key at <code>/.well-known/dispatch.pub</code>.
          </p>
        </div>

        <p style={{ marginTop: 48, color: '#484f58', fontSize: 12, fontFamily: 'system-ui, sans-serif' }}>
          Open source: <a href="https://github.com/Crypto-Goatz/0n-dispatch" style={{ color: '#79c0ff' }}>Crypto-Goatz/0n-dispatch</a>
        </p>
      </div>
    </div>
  )
}
