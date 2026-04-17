'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RoleState {
  role: 'admin' | 'vip' | 'standard'
  isAdmin: boolean
  isVip: boolean
  hiddenFeatures: string[]
  sidebarOrder: string[]
  installedAddons: string[]
  capabilities: string[]
  locationId: string
  loading: boolean
  toggleFeature: (slug: string) => void
  hasAddon: (slug: string) => boolean
  hasCapability: (cap: string) => boolean
}

const defaults: RoleState = {
  role: 'standard',
  isAdmin: false,
  isVip: false,
  hiddenFeatures: [],
  sidebarOrder: [],
  installedAddons: [],
  capabilities: [],
  locationId: '',
  loading: true,
  toggleFeature: () => {},
  hasAddon: () => false,
  hasCapability: () => false,
}

export const RoleContext = createContext<RoleState>(defaults)

export function useRole() {
  return useContext(RoleContext)
}

export function useRoleLoader(): RoleState {
  const [state, setState] = useState<Omit<RoleState, 'toggleFeature' | 'hasAddon' | 'hasCapability' | 'loading'>>({
    role: 'standard',
    isAdmin: false,
    isVip: false,
    hiddenFeatures: [],
    sidebarOrder: [],
    installedAddons: [],
    capabilities: [],
    locationId: '',
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const res = await fetch('/api/user/role', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setState({
          role: data.role,
          isAdmin: data.isAdmin,
          isVip: data.isVip,
          hiddenFeatures: data.hiddenFeatures || [],
          sidebarOrder: data.sidebarOrder || [],
          installedAddons: data.installedAddons || [],
          capabilities: data.capabilities || [],
          locationId: data.locationId || '',
        })
      }
      setLoading(false)
    })()
  }, [supabase])

  async function toggleFeature(slug: string) {
    const hidden = state.hiddenFeatures.includes(slug)
      ? state.hiddenFeatures.filter(f => f !== slug)
      : [...state.hiddenFeatures, slug]

    setState(prev => ({ ...prev, hiddenFeatures: hidden }))

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      fetch('/api/user/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ hidden_features: hidden }),
      }).catch(() => {})
    }
  }

  function hasAddon(slug: string): boolean {
    if (state.isVip || state.isAdmin) return true
    return state.installedAddons.includes(slug)
  }

  function hasCapability(cap: string): boolean {
    if (state.isVip || state.isAdmin) return true
    return state.capabilities.includes(cap)
  }

  return { ...state, loading, toggleFeature, hasAddon, hasCapability }
}
