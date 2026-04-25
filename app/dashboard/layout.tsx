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
import { ActionDock } from '@/components/action-dock'
import { AIChatBox } from '@/components/ai-chat-box'
import { CrmStatusBar } from '@/components/crm-status-bar'

const LAYOUT_KEY = '0ncore_layout'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-core-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LocationProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
        <ActionDock />
        <AIChatBox />
        <CrmStatusBar />
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
      <div className="min-h-screen bg-core-bg flex items-center justify-center">
        <div className="w-9 h-9 border-2 border-core-border border-t-core-green rounded-full animate-spin" />
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
        <div className="min-h-screen bg-core-bg">
          {/* Minimal embed header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-core-border bg-core-card">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-core-green flex items-center justify-center text-[9px] font-black text-black">0n</div>
              <span className="text-[13px] font-bold text-core-text">
                <span className="text-core-green">0n</span>Core
              </span>
              {embedLocationId && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-core-green/10 text-core-green font-mono">
                  {embedLocationId.slice(0, 8)}...
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href="https://0ncore.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-core-green no-underline px-2.5 py-1 rounded bg-core-green/[0.08] border border-core-green/[0.15]"
              >
                Open Full Dashboard
              </a>
            </div>
          </div>
          <main className="p-4">
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
