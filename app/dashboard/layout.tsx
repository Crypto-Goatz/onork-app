'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Sidebar from './components/Sidebar'
import Header from './components/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setLoading(false)
    })
  }, [router, supabase.auth])

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

  return (
    <div className="jp-wrapper">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="jp-main">
        <Header
          userEmail={user?.email}
          userName={user?.user_metadata?.full_name}
          onMenuToggle={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="jp-content">
          {children}
        </main>
      </div>
    </div>
  )
}
