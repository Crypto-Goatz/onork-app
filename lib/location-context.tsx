'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface LocationContextValue {
  locationId: string
  switchLocation: (id: string) => Promise<void>
  refreshKey: number
  loading: boolean
}

const LocationContext = createContext<LocationContextValue>({
  locationId: '',
  switchLocation: async () => {},
  refreshKey: 0,
  loading: true,
})

export function LocationProvider({ children }: { children: ReactNode }) {
  const [locationId, setLocationId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const supabase = createClient()

  // URL param override (for embed mode)
  const urlLocationId = searchParams.get('locationId')

  useEffect(() => {
    async function load() {
      // If URL has ?locationId=, use that
      if (urlLocationId) {
        setLocationId(urlLocationId)
        setLoading(false)
        return
      }

      // Otherwise fetch from profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('crm_location_id')
        .eq('id', user.id)
        .single()

      if (profile?.crm_location_id) {
        setLocationId(profile.crm_location_id)
      }
      setLoading(false)
    }

    load()
  }, [urlLocationId, supabase])

  const switchLocation = useCallback(async (id: string) => {
    setLocationId(id)
    setRefreshKey(prev => prev + 1)

    // Update profile in Supabase
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ crm_location_id: id })
        .eq('id', user.id)
    }
  }, [supabase])

  return (
    <LocationContext.Provider value={{ locationId, switchLocation, refreshKey, loading }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  return useContext(LocationContext)
}
