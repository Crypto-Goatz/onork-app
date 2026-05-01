/**
 * Tool layout — full-bleed mobile-first container.
 * Suppresses dashboard chrome but keeps the global PWA setup from root.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Email Copy-Paste — 0nCore',
  description: 'Tap-to-copy email fields. Compose once, paste cleanly into any email client. iOS-optimized.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function EmailPasteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0d1117', minHeight: '100vh' }}>
      {children}
    </div>
  )
}
