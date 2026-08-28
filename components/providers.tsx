'use client'

import { Toaster } from 'sonner'
import { LoadingScreen } from './loading-screen'

/**
 * `isAppHost` is read from the request headers in the root layout and passed
 * down, rather than sniffed here: on app.0ncore.com middleware rewrites every
 * path to /crm, and usePathname() reports the PRE-rewrite URL — so a client-side
 * guess is wrong on exactly the host it matters most on. Same reasoning the
 * layout already gives for deciding the marketing chrome by host.
 */
export function Providers({ children, isAppHost = false }: { children: React.ReactNode; isAppHost?: boolean }) {
  return (
    <>
      <LoadingScreen isAppHost={isAppHost} />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1117',
            border: '1px solid #1e293b',
            color: '#f0f4f8',
            fontSize: '13px',
            fontWeight: 500,
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          },
          className: 'oncore-toast',
        }}
        theme="dark"
        richColors
        closeButton
        duration={4000}
      />
    </>
  )
}
