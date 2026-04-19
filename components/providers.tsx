'use client'

import { Toaster } from 'sonner'
import { LoadingScreen } from './loading-screen'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LoadingScreen />
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
