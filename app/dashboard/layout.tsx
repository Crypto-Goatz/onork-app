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
    })
  }, [router, supabase.auth])

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
        background: 'var(--jp-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: '2px solid var(--jp-border)',
          borderTopColor: 'var(--jp-green)',
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
          <HorizontalNav />
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
        <CompactSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="jp-main">
        <Header {...headerProps} />
        <main className="jp-content">
          {children}
        </main>
      </div>
    </div>
  )
}
