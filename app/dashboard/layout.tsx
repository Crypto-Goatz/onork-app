'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Sidebar from './components/Sidebar'
import CompactSidebar from './components/CompactSidebar'
import HorizontalNav from './components/HorizontalNav'
import Header, { type LayoutMode } from './components/Header'

const LAYOUT_KEY = '0ncore_layout'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('classic')
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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

          // Auto-provision if missing crm_location_id or stripe_customer_id
          if (!data?.crm_location_id || !data?.stripe_customer_id) {
            fetch('/api/provision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: user.id,
                email: user.email || '',
                name: user.user_metadata?.full_name || '',
              }),
            }).catch(() => {
              // Provisioning failure is non-blocking
            })
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

  // Horizontal layout
  if (layoutMode === 'horizontal') {
    return (
      <div className="jp-wrapper jp-wrapper-horizontal">
        <div className="jp-main jp-main-horizontal">
          <Header {...headerProps} />
          <HorizontalNav isAdmin={isAdmin} />
          <main className="jp-content">
            {children}
          </main>
        </div>
      </div>
    )
  }

  // Compact layout
  if (layoutMode === 'compact') {
    return (
      <div className="jp-wrapper jp-wrapper-compact">
        <CompactSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isAdmin={isAdmin} />
        <div className="jp-main jp-main-compact">
          <Header {...headerProps} />
          <main className="jp-content">
            {children}
          </main>
        </div>
      </div>
    )
  }

  // Classic layout (default)
  return (
    <div className="jp-wrapper">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isAdmin={isAdmin} />
      <div className="jp-main">
        <Header {...headerProps} />
        <main className="jp-content">
          {children}
        </main>
      </div>
    </div>
  )
}
