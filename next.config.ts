import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * dispatch.0ncore.com — host-based rewrites so the subdomain serves the
   * dispatch API at clean pretty URLs:
   *   dispatch.0ncore.com/         → /dispatch (landing page)
   *   dispatch.0ncore.com/rules    → /api/dispatch/rules
   *   dispatch.0ncore.com/version  → /api/dispatch/version
   *   dispatch.0ncore.com/<thing>  → /api/dispatch/<thing>
   *
   * NOTE: if the Vercel project still has a dashboard-level redirect on the
   * dispatch.0ncore.com domain (currently sending every path to /login), it
   * runs BEFORE these rewrites. Mike: open Vercel → onork-app → Settings →
   * Domains → dispatch.0ncore.com → Redirects, and remove any rule that
   * sends "/" or "/:path*" to /login. That's the actual root cause; this
   * rewrite is the clean URL layer underneath.
   */
  async rewrites() {
    return [
      // vault.0ncore.com → the 0nVault door. Only the root is rewritten; every
      // other path (/api/*, /login, /_next, /downloads…) serves normally on the
      // subdomain, and the session rides the shared .0ncore.com cookie.
      {
        source: '/',
        has: [{ type: 'host', value: 'vault.0ncore.com' }],
        destination: '/hub',
      },
      {
        source: '/',
        has: [{ type: 'host', value: 'dispatch.0ncore.com' }],
        destination: '/dispatch',
      },
      {
        source: '/api/dispatch/:path*',
        has: [{ type: 'host', value: 'dispatch.0ncore.com' }],
        destination: '/api/dispatch/:path*',
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'dispatch.0ncore.com' }],
        destination: '/api/dispatch/:path*',
      },
    ]
  },
  async headers() {
    return [
      {
        // CORS for all API routes — allows Chrome extension + external clients
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, Mcp-Session-Id' },
        ],
      },
      {
        // Allow CRM marketplace + custom-menu-link iframes to embed widget pages
        source: '/widgets/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://*.gohighlevel.com https://*.leadconnectorhq.com https://*.msgsndr.com",
          },
        ],
      },
      {
        // Detect & Refine embed dashboards — explicitly designed to be iframed
        // by customers anywhere (their wp-admin, GHL pages, agency portals,
        // Notion docs, etc). frame-ancestors * is correct here — the data
        // shown is per-site_id which the customer already has on the calling
        // page anyway, so embedding adds no privacy risk.
        source: '/embed/dr/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
    ];
  },
};

export default nextConfig;
