import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
