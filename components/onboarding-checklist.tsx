'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle,
  Circle,
  UserPlus,
  Server,
  Globe,
  Contact,
  Workflow,
  Linkedin,
  BarChart3,
  MonitorSmartphone,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'

interface ChecklistItem {
  id: string
  label: string
  icon: typeof CheckCircle
  href: string
  checkField?: string
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'account_created',
    label: 'Account created',
    icon: UserPlus,
    href: '/dashboard/settings',
    checkField: 'id',
  },
  {
    id: 'crm_provisioned',
    label: 'CRM provisioned',
    icon: Server,
    href: '/dashboard/settings',
    checkField: 'crm_location_id',
  },
  {
    id: 'website_imported',
    label: 'Website imported',
    icon: Globe,
    href: '/dashboard/brand',
    checkField: 'website',
  },
  {
    id: 'first_contact',
    label: 'First contact added',
    icon: Contact,
    href: '/dashboard/contacts',
  },
  {
    id: 'first_automation',
    label: 'First automation built',
    icon: Workflow,
    href: '/dashboard/automations',
  },
  {
    id: 'linkedin_connected',
    label: 'LinkedIn connected',
    icon: Linkedin,
    href: '/dashboard/social0n',
  },
  {
    id: 'first_post_scored',
    label: 'First post scored',
    icon: BarChart3,
    href: '/dashboard/social0n',
  },
  {
    id: 'wordpress_connected',
    label: 'WordPress connected',
    icon: MonitorSmartphone,
    href: '/dashboard/integrations',
  },
]

export function OnboardingChecklist() {
  const router = useRouter()
  const supabase = createClient()

  const [visible, setVisible] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [show, setShow] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session: __sess } } = await supabase.auth.getSession()
  const user = __sess?.user ?? null
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, crm_location_id, website')
        .eq('id', user.id)
        .single()

      if (!profile || profile.onboarding_completed) {
        setShow(false)
        return
      }

      setShow(true)

      // Determine completed items from profile
      const done = new Set<string>()
      done.add('account_created')
      if (profile.crm_location_id) done.add('crm_provisioned')
      if (profile.website) done.add('website_imported')

      // Check for contacts
      const { count: contactCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .limit(1)
      if (contactCount && contactCount > 0) done.add('first_contact')

      // Check for automations
      const { count: autoCount } = await supabase
        .from('automations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .limit(1)
      if (autoCount && autoCount > 0) done.add('first_automation')

      // Check for LinkedIn connection
      const { data: linkedinConn } = await supabase
        .from('oauth_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'linkedin')
        .limit(1)
        .maybeSingle()
      if (linkedinConn) done.add('linkedin_connected')

      // Check for VPIS scores
      const { count: vpisCount } = await supabase
        .from('vpis_scores')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .limit(1)
      if (vpisCount && vpisCount > 0) done.add('first_post_scored')

      // Check for WordPress connection
      const { data: wpConn } = await supabase
        .from('oauth_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'wordpress')
        .limit(1)
        .maybeSingle()
      if (wpConn) done.add('wordpress_connected')

      setCompleted(done)
    }

    load()
  }, [supabase])

  if (!show || !visible) return null

  const doneCount = completed.size
  const totalCount = CHECKLIST_ITEMS.length
  const progressPct = Math.round((doneCount / totalCount) * 100)

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer"
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          )}
          Getting Started
          <span className="text-xs text-text-muted font-normal">
            {doneCount}/{totalCount}
          </span>
        </button>
        <button
          onClick={() => setVisible(false)}
          className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!collapsed && (
        <div className="p-4">
          {/* Progress bar */}
          <div className="w-full bg-white/[0.04] rounded-full h-1.5 mb-4 overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Items */}
          <div className="space-y-1">
            {CHECKLIST_ITEMS.map((item) => {
              const Icon = item.icon
              const isDone = completed.has(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!isDone) router.push(item.href)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                    isDone
                      ? 'opacity-60'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-white/[0.15] shrink-0" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${isDone ? 'text-text-muted' : 'text-text-secondary'}`} />
                  <span className={`text-sm ${isDone ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
