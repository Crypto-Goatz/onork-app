'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldOff } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session: __sess } } = await supabase.auth.getSession()
  const user = __sess?.user ?? null
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (profile?.is_admin) {
        setStatus('allowed')
      } else {
        setStatus('denied')
        setTimeout(() => router.push('/dashboard'), 2000)
      }
    }
    checkAdmin()
  }, [router, supabase])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-core-text-muted text-sm">
        <div className="w-9 h-9 rounded-full border-2 border-core-border border-t-core-green animate-spin" />
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-core-red/10 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-core-red" strokeWidth={1.5} />
        </div>
        <h2 className="text-core-red text-xl font-semibold">Access Denied</h2>
        <p className="text-core-text-muted text-sm">Admin privileges required. Redirecting...</p>
      </div>
    )
  }

  return <>{children}</>
}
