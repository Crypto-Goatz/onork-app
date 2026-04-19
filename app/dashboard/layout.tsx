'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Sidebar from './components/Sidebar'
import CompactSidebar from './components/CompactSidebar'
import HorizontalNav from './components/HorizontalNav'
import Header, { type LayoutMode } from './components/Header'
import { RoleContext, useRoleLoader } from '@/lib/use-role'
import { AIAssistant } from '@/components/ai-assistant'
import { LocationProvider } from '@/lib/location-context'
import { GlobalStrikeMenu } from '@/components/global-strike-menu'
import { DialerButton } from '@/components/dialer-button'

const LAYOUT_KEY = '0ncore_layout'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 24, height: 24, border: '2px solid #7ed957', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style></div>}>
      <LocationProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
        <GlobalStrikeMenu />
        <DialerButton />
        <AIAssistant />
      </LocationProvider>
    </Suspense>
  )
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('classic')
  const [isAdmin, setIsAdmin] = useState(false)
  const roleState = useRoleLoader()
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()

  // Detect CRM iframe embed mode
  const isEmbed = searchParams.get('embed') === 'true'
  const embedLocationId = searchParams.get('locationId')

  // Embed mode effects
  useEffect(() => {
    if (!isEmbed) return
    // Disable right-click in embed mode
    const handler = (e: MouseEvent) => { e.preventDefault() }
    document.addEventListener('contextmenu', handler)
    // Store embed location for API calls
    if (embedLocationId) {
      sessionStorage.setItem('0ncore_embed_location', embedLocationId)
    }
    return () => document.removeEventListener('contextmenu', handler)
  }, [isEmbed, embedLocationId])

  useEffect(() => {
    // Load layout preference
    try {
      const saved = localStorage.getItem(LAYOUT_KEY) as LayoutMode | null
      if (saved && ['classic', 'compact', 'horizontal'].includes(saved)) {
        setLayoutMode(saved)
      }
    } catch {}

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setLoading(false)

      // Check admin status + provisioning
      supabase
        .from('profiles')
        .select('is_admin, crm_location_id, stripe_customer_id')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.is_admin) setIsAdmin(true)

          // Auto-provision ONLY if crm_location_id is missing (not stripe)
          // Never overwrite an existing crm_location_id
          if (!data?.crm_location_id) {
            fetch('/api/provision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: user.id,
                email: user.email || '',
                name: user.user_metadata?.full_name || '',
              }),
            }).catch(() => {})
          }
        })
    })
  }, [router, supabase])

  function handleLayoutChange(mode: LayoutMode) {
    setLayoutMode(mode)
    setSidebarOpen(false)
    try {
      localStorage.setItem(LAYOUT_KEY, mode)
    } catch {}
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary, #f1f2f7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: '2px solid var(--border, #e2e8f0)',
          borderTopColor: 'var(--accent, #7ed957)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const headerProps = {
    userEmail: user?.email,
    userName: user?.user_metadata?.full_name,
    onMenuToggle: () => setSidebarOpen(true),
    onLogout: handleLogout,
    layoutMode,
    onLayoutChange: handleLayoutChange,
  }

  // Embed layout (CRM iframe) — no sidebar, minimal header
  if (isEmbed) {
    return (
      <RoleContext.Provider value={roleState}>
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0d1117)' }}>
          {/* Minimal embed header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', borderBottom: '1px solid var(--border, #1e293b)',
            background: 'var(--bg-card, #161b22)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#7ed957', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#000' }}>0n</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)' }}>
                <span style={{ color: '#7ed957' }}>0n</span>Core
              </span>
              {embedLocationId && (
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(126,217,87,0.1)', color: '#7ed957', fontFamily: 'monospace' }}>
                  {embedLocationId.slice(0, 8)}...
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <a href="https://0ncore.com/dashboard" target="_blank" rel="noopener noreferrer" style={{
                fontSize: 11, fontWeight: 600, color: '#7ed957', textDecoration: 'none',
                padding: '4px 10px', borderRadius: 4, background: 'rgba(126,217,87,0.08)',
                border: '1px solid rgba(126,217,87,0.15)',
              }}>Open Full Dashboard</a>
            </div>
          </div>
          <main style={{ padding: 16 }}>
            {children}
          </main>
        </div>
      </RoleContext.Provider>
    )
  }

  // Horizontal layout
  if (layoutMode === 'horizontal') {
    return (
      <RoleContext.Provider value={roleState}>
        <div className="jp-wrapper jp-wrapper-horizontal">
          <div className="jp-main jp-main-horizontal">
            <Header {...headerProps} />
            <HorizontalNav isAdmin={isAdmin} />
            <main className="jp-content">
              {children}
            </main>
          </div>
        </div>
      </RoleContext.Provider>
    )
  }

  // Compact layout
  if (layoutMode === 'compact') {
    return (
      <RoleContext.Provider value={roleState}>
        <div className="jp-wrapper jp-wrapper-compact">
          <CompactSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isAdmin={isAdmin} />
          <div className="jp-main jp-main-compact">
            <Header {...headerProps} />
            <main className="jp-content">
              {children}
            </main>
          </div>
        </div>
      </RoleContext.Provider>
    )
  }

  // Classic layout (default)
  return (
    <RoleContext.Provider value={roleState}>
      <div className="jp-wrapper">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isAdmin={isAdmin} />
        <div className="jp-main">
          <Header {...headerProps} />
          <main className="jp-content">
            {children}
          </main>
        </div>
      </div>
    </RoleContext.Provider>
  )
}
