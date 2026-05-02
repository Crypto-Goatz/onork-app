/**
 * Marketplace layout — pass-through.
 *
 * The global <PublicNavWrapper /> in app/layout.tsx already renders the
 * unified header. This file used to ship a duplicate custom nav that
 * collided with it; removed so /marketplace matches the rest of the site.
 *
 * The padding-top below leaves room for the fixed h-16 header.
 */
export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen pt-16">{children}</div>
}
