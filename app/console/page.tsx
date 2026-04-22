'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UpgradeButton } from '@/components/UpgradeButton'
import { Lock } from 'lucide-react'

interface Feature {
  id: string
  feature_key: string
  feature_name: string
  description: string
  tier_required: number
  category: string
  icon: string | null
  sort_order: number
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
        supabase.from('feature_catalog').select('*').order('tier_required').order('sort_order'),
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
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <p className="text-[#9ca3af]">Loading dashboard...</p>
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
    <div className="min-h-screen bg-[#0d1117] p-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f4f8] mb-1">
          {businessName ? `${businessName} Dashboard` : '0nCore Dashboard'}
        </h1>
        <p className="text-sm text-[#6b7280]">
          Current tier: <strong className="text-[#f0f4f8]">{TIER_NAMES[tierLevel]}</strong>
          {tierLevel > 0 && ` (${TIER_PRICES[tierLevel]})`}
        </p>
      </div>

      {/* Room groups */}
      {grouped.map(group => (
        <div key={group.tier} className="mb-6">
          {/* Section header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-base font-bold flex items-center gap-2 m-0 ${group.unlocked ? 'text-[#f0f4f8]' : 'text-[#9ca3af]'}`}>
              {!group.unlocked && <Lock size={14} className="text-[#9ca3af]" />}
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
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {group.features.map(feature => {
              const unlocked = tierLevel >= feature.tier_required
              return (
                <div
                  key={feature.id}
                  className={`rounded-lg p-4 border border-[#30363d] transition-opacity ${
                    unlocked
                      ? 'bg-[#161b22] border-l-4 border-l-[#6EE05A]'
                      : 'bg-[#161b22] border-l-4 border-l-[#30363d] opacity-60'
                  }`}
                >
                  <h3 className={`text-sm font-semibold mb-1 ${unlocked ? 'text-[#f0f4f8]' : 'text-[#9ca3af]'}`}>
                    {feature.feature_name}
                  </h3>
                  <p className="text-xs text-[#6b7280] mb-3 leading-relaxed">
                    {feature.description}
                  </p>
                  {unlocked && feature.feature_key && (
                    <a
                      href={`/console/${feature.feature_key}`}
                      className="text-xs font-semibold text-[#6EE05A] no-underline hover:underline"
                    >
                      Open →
                    </a>
                  )}
                  {!unlocked && (
                    <span className="text-[11px] text-[#6b7280]">
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
