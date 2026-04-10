'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UpgradeButton } from '@/components/UpgradeButton'

interface Feature {
  id: string
  name: string
  description: string
  tier_required: number
  category: string
  route: string | null
}

const TIER_NAMES: Record<number, string> = {
  0: 'Lobby',
  1: 'Front Office',
  2: 'Operations Wing',
  3: 'Intelligence Suite',
  4: 'The Vault',
  5: 'The Penthouse',
}

const TIER_PRICES: Record<number, string> = {
  1: '$29.00/mo',
  2: '$79.00/mo',
  3: '$149.00/mo',
  4: '$299.00/mo',
  5: '$499.00/mo',
}

export default function ConsoleDashboard() {
  const supabase = createClient()
  const [tierLevel, setTierLevel] = useState(0)
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [businessName, setBusinessName] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [tierRes, featRes, profileRes] = await Promise.all([
        supabase.from('user_tiers').select('tier_level').eq('user_id', user.id).single(),
        supabase.from('feature_catalog').select('*').order('tier_required').order('name'),
        supabase.from('profiles').select('business_name').eq('id', user.id).single(),
      ])

      setTierLevel(tierRes.data?.tier_level ?? 0)
      setFeatures(featRes.data || [])
      setBusinessName(profileRes.data?.business_name || '')
      setLoading(false)
    }
    load()
  }, [supabase])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <p style={{ color: '#9CA3AF' }}>Loading dashboard...</p>
      </div>
    )
  }

  // Group features by tier
  const tiers = [0, 1, 2, 3, 4, 5]
  const grouped = tiers.map(tier => ({
    tier,
    name: TIER_NAMES[tier],
    price: TIER_PRICES[tier],
    features: features.filter(f => f.tier_required === tier),
    unlocked: tierLevel >= tier,
  })).filter(g => g.features.length > 0)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
      maxWidth: '900px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
          {businessName ? `${businessName} Dashboard` : '0nCore Dashboard'}
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          Current tier: <strong style={{ color: '#111827' }}>{TIER_NAMES[tierLevel]}</strong>
          {tierLevel > 0 && ` (${TIER_PRICES[tierLevel]})`}
        </p>
      </div>

      {/* Room groups */}
      {grouped.map(group => (
        <div key={group.tier} style={{ marginBottom: '24px' }}>
          {/* Section header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: group.unlocked ? '#111827' : '#9CA3AF',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              {!group.unlocked && <span style={{ fontSize: '14px' }}>🔒</span>}
              {group.name}
            </h2>
            {!group.unlocked && group.price && (
              <UpgradeButton
                tierLevel={group.tier}
                tierName={group.name}
                price={group.price}
              />
            )}
          </div>

          {/* Feature cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
            {group.features.map(feature => {
              const unlocked = tierLevel >= feature.tier_required
              return (
                <div
                  key={feature.id}
                  style={{
                    background: unlocked ? '#FFFFFF' : '#F9FAFB',
                    border: unlocked ? '1px solid #E5E7EB' : '1px solid #E5E7EB',
                    borderLeft: unlocked ? '4px solid #6EE05A' : '4px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '16px',
                    opacity: unlocked ? 1 : 0.6,
                  }}
                >
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: unlocked ? '#111827' : '#9CA3AF',
                    marginBottom: '4px',
                  }}>
                    {feature.name}
                  </h3>
                  <p style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    marginBottom: '12px',
                    lineHeight: '1.4',
                  }}>
                    {feature.description}
                  </p>
                  {unlocked && feature.route && (
                    <a
                      href={feature.route}
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#6EE05A',
                        textDecoration: 'none',
                      }}
                    >
                      Open →
                    </a>
                  )}
                  {!unlocked && (
                    <span style={{ fontSize: '11px', color: '#D1D5DB' }}>
                      Requires {TIER_NAMES[feature.tier_required]}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
