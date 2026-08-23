'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Settings, Loader2, AlertTriangle, RefreshCw, MapPin, Phone,
  Mail, Globe, Clock, Users, Database, Hash, ChevronDown, ChevronUp,
} from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

interface LocationInfo {
  name?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
  email?: string
  website?: string
  timezone?: string
  [key: string]: unknown
}

interface CustomField {
  id: string
  name: string
  fieldKey: string
  dataType: string
}

interface CustomValue {
  id: string
  name: string
  fieldKey: string
  value: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

type Section = 'location' | 'fields' | 'values' | 'team'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customValues, setCustomValues] = useState<CustomValue[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['location', 'team']))

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [locRes, fieldsRes, valuesRes, usersRes] = await Promise.all([
        crm.location.get(),
        crm.customFields.list(),
        crm.customValues.list(),
        crm.users.list(),
      ])
      setLocationInfo((locRes.location as LocationInfo) || null)
      setCustomFields(fieldsRes.customFields || [])
      setCustomValues(valuesRes.customValues || [])
      setTeamMembers(usersRes.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const toggleSection = (section: Section) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const SectionHeader = ({ section, title, Icon, count }: { section: Section; title: string; Icon: typeof Settings; count?: number }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-[#7ed957]" />
        <span className="text-sm font-bold text-white">{title}</span>
        {count !== undefined && (
          <span className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[10px] font-semibold text-white/40">{count}</span>
        )}
      </div>
      {expandedSections.has(section) ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
    </button>
  )

  const InfoRow = ({ Icon, label, value }: { Icon: typeof MapPin; label: string; value?: string | null }) => {
    if (!value) return null
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="w-4 h-4 text-white/20 mt-0.5 shrink-0" />
        <div>
          <div className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">{label}</div>
          <div className="text-sm text-white mt-0.5">{value}</div>
        </div>
      </div>
    )
  }

  return (
    // WHITE ON WHITE. Every class in this component is dark-theme
    // (text-white, bg-white/[0.02], text-white/40) but it renders inside a
    // LIGHT settings page, so Location, Custom Fields, Custom Values and Team
    // Members were invisible — present in the DOM, unreadable on screen.
    //
    // Repainting twenty-odd classes to light would fight the 0nCore design
    // system, which is dark (#0d1117). Giving the section the surface its
    // classes were written for fixes every one of them at once and matches the
    // rest of the product.
    <div className="rounded-2xl bg-[#0d1117] border border-white/[0.08] p-6 text-[#c9d1d9]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#7ed957]" />
            CRM Settings
          </h1>
          <p className="text-xs text-white/40 mt-1">
            Location, custom fields, and team configuration
          </p>
        </div>
        <button
          onClick={() => { loadData(); toast.success('Settings refreshed') }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-transparent text-white/50 text-xs font-medium cursor-pointer hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#7ed957]" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className="space-y-4">

          {/* Location Info */}
          <div>
            <SectionHeader section="location" title="Location" Icon={MapPin} />
            {expandedSections.has('location') && locationInfo && (
              <div className="mt-2 px-5 py-4 rounded-xl bg-white/[0.01] border border-white/[0.04]">
                <div className="space-y-1">
                  <InfoRow Icon={Globe} label="Name" value={locationInfo.name as string} />
                  <InfoRow Icon={MapPin} label="Address" value={
                    [locationInfo.address, locationInfo.city, locationInfo.state, locationInfo.postalCode, locationInfo.country]
                      .filter(Boolean).join(', ') || null
                  } />
                  <InfoRow Icon={Phone} label="Phone" value={locationInfo.phone as string} />
                  <InfoRow Icon={Mail} label="Email" value={locationInfo.email as string} />
                  <InfoRow Icon={Globe} label="Website" value={locationInfo.website as string} />
                  <InfoRow Icon={Clock} label="Timezone" value={locationInfo.timezone as string} />
                </div>
              </div>
            )}
          </div>

          {/* Custom Fields */}
          <div>
            <SectionHeader section="fields" title="Custom Fields" Icon={Database} count={customFields.length} />
            {expandedSections.has('fields') && (
              <div className="mt-2 rounded-xl border border-white/[0.04] bg-white/[0.01] overflow-hidden">
                {customFields.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="w-8 h-8 mx-auto text-white/10 mb-2" />
                    <p className="text-white/30 text-xs">No custom fields</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Key</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customFields.map(field => (
                        <tr key={field.id} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                          <td className="px-4 py-2.5 text-xs font-medium text-white">{field.name}</td>
                          <td className="px-4 py-2.5 text-[11px] font-mono text-white/40">{field.fieldKey}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-[#00d4ff]/10 text-[#00d4ff] text-[10px] font-semibold">
                              {field.dataType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Custom Values */}
          <div>
            <SectionHeader section="values" title="Custom Values" Icon={Hash} count={customValues.length} />
            {expandedSections.has('values') && (
              <div className="mt-2 rounded-xl border border-white/[0.04] bg-white/[0.01] overflow-hidden">
                {customValues.length === 0 ? (
                  <div className="text-center py-8">
                    <Hash className="w-8 h-8 mx-auto text-white/10 mb-2" />
                    <p className="text-white/30 text-xs">No custom values</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Key</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customValues.map(cv => (
                        <tr key={cv.id} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                          <td className="px-4 py-2.5 text-xs font-medium text-white">{cv.name}</td>
                          <td className="px-4 py-2.5 text-[11px] font-mono text-white/40">{cv.fieldKey}</td>
                          <td className="px-4 py-2.5 text-xs text-white/60 max-w-[200px] truncate">{cv.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Team Members */}
          <div>
            <SectionHeader section="team" title="Team Members" Icon={Users} count={teamMembers.length} />
            {expandedSections.has('team') && (
              <div className="mt-2">
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8 rounded-xl bg-white/[0.01] border border-white/[0.04]">
                    <Users className="w-8 h-8 mx-auto text-white/10 mb-2" />
                    <p className="text-white/30 text-xs">No team members found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:border-[#7ed957]/20 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-[#7ed957]/10 flex items-center justify-center text-[#7ed957] text-xs font-bold shrink-0">
                          {(member.name || '?')[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white">{member.name}</div>
                          <div className="flex items-center gap-3 text-[11px] text-white/40 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-[#00d4ff]/10 text-[#00d4ff] text-[10px] font-semibold shrink-0">
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
