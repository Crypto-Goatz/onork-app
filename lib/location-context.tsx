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
      const user = (await supabase.auth.getSession()).data.session?.user ?? null
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
    const user = (await supabase.auth.getSession()).data.session?.user ?? null
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

/**
 * Helper: create fetch options that include the current location.
 * Use this in any component that calls an API needing locationId.
 *
 * Usage:
 *   const { locationId, fetchWithLocation } = useLocation()
 *   const data = await fetchWithLocation('/api/crm/data?type=contacts')
 */
export function useLocationFetch() {
  const { locationId } = useLocation()

  async function fetchWithLocation(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      ...(options.headers as Record<string, string> || {}),
      'x-location-id': locationId,
    }
    return fetch(url, { ...options, headers })
  }

  return { locationId, fetchWithLocation }
}
