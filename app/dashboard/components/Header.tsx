'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { NotificationBell } from '@/components/NotificationBell'
import { TokenButton } from '@/components/token-modal'
import {
  LayoutDashboard, MessageSquare, BarChart3, Users, Target, Calendar,
  CreditCard, Tag, Mail, Share2, FileText, Link2, ClipboardList, Megaphone,
  Mic, Bot, Brain, Zap, RefreshCw, Phone, FolderOpen, FileCheck, Globe,
  GraduationCap, Palette, User, CheckSquare, Settings, Shield, Plug,
  Building2, ShoppingCart, Download, UserPlus, PenLine, HeartPulse, ChevronDown, Check, type LucideIcon,
} from 'lucide-react'

export type LayoutMode = 'classic' | 'compact' | 'horizontal'

interface Location {
  id: string
  name: string
}

interface HeaderProps {
  userEmail?: string
  userName?: string
  onMenuToggle: () => void
  onLogout: () => void
  layoutMode?: LayoutMode
  onLayoutChange?: (mode: LayoutMode) => void
}

/* ─── Smart Search Navigation Items — Lucide icons only ─── */
const NAV_ITEMS: { label: string; href: string; keywords: string; Icon: LucideIcon }[] = [
  { label: 'Dashboard', href: '/dashboard', keywords: 'home overview main', Icon: LayoutDashboard },
  { label: 'Chat with Jaxx', href: '/dashboard/chat', keywords: 'ai assistant conversation talk', Icon: MessageSquare },
  { label: 'Analytics', href: '/dashboard/analytics', keywords: 'stats data traffic visitors ga4 google', Icon: BarChart3 },
  { label: 'Contacts', href: '/dashboard/contacts', keywords: 'people clients leads crm customers', Icon: Users },
  { label: 'Pipeline', href: '/dashboard/pipeline', keywords: 'deals opportunities sales stages funnel', Icon: Target },
  { label: 'Calendar', href: '/dashboard/calendar', keywords: 'events booking appointments schedule', Icon: Calendar },
  { label: 'Invoices', href: '/dashboard/invoices', keywords: 'billing payments money charges', Icon: CreditCard },
  { label: 'Products', href: '/dashboard/products', keywords: 'catalog items pricing store', Icon: Tag },
  { label: 'Email Campaigns', href: '/dashboard/email/campaigns', keywords: 'email marketing newsletter blast', Icon: Mail },
  { label: 'Social Planner', href: '/dashboard/social', keywords: 'social media posts facebook instagram linkedin', Icon: Share2 },
  { label: 'Blog Engine', href: '/dashboard/blog', keywords: 'blog posts articles content writing seo', Icon: FileText },
  { label: 'Funnels', href: '/dashboard/funnels', keywords: 'funnel landing pages conversion', Icon: Link2 },
  { label: 'Forms', href: '/dashboard/forms', keywords: 'form survey intake submission', Icon: ClipboardList },
  { label: 'Campaigns', href: '/dashboard/campaigns', keywords: 'campaign sms email drip sequence', Icon: Megaphone },
  { label: 'Voice AI', href: '/dashboard/voice', keywords: 'voice agent phone call ai assistant', Icon: Mic },
  { label: 'Agent Studio', href: '/dashboard/ai', keywords: 'agent builder ai tools mcp', Icon: Bot },
  { label: 'Knowledge Base', href: '/dashboard/training', keywords: 'kb training knowledge brain docs', Icon: Brain },
  { label: 'Workflows', href: '/dashboard/workflows', keywords: 'workflow automation triggers switches', Icon: Zap },
  { label: 'Automations', href: '/dashboard/automations', keywords: 'automation sequence trigger workflow', Icon: RefreshCw },
  { label: 'Phone System', href: '/dashboard/phone', keywords: 'phone call sms numbers dialer', Icon: Phone },
  { label: 'Media Manager', href: '/dashboard/files', keywords: 'files upload images media assets', Icon: FolderOpen },
  { label: 'Documents', href: '/dashboard/documents', keywords: 'documents contracts proposals esign', Icon: FileCheck },
  { label: 'WordPress', href: '/dashboard/wordpress', keywords: 'wordpress site blog wp', Icon: Globe },
  { label: 'Courses', href: '/dashboard/courses', keywords: 'course builder education training lessons', Icon: GraduationCap },
  { label: 'Brand Board', href: '/dashboard/brand', keywords: 'brand colors fonts design identity', Icon: Palette },
  { label: 'Users', href: '/dashboard/users', keywords: 'users team members roles permissions', Icon: User },
  { label: 'Tasks', href: '/dashboard/tasks', keywords: 'tasks todo project management board', Icon: CheckSquare },
  { label: 'Settings', href: '/dashboard/settings', keywords: 'settings configuration preferences account', Icon: Settings },
  { label: 'Security', href: '/dashboard/security', keywords: 'security audit trust score hipaa', Icon: Shield },
  { label: 'Integrations', href: '/dashboard/integrations', keywords: 'integrations connect api services stripe', Icon: Plug },
  { label: 'Agency', href: '/dashboard/agency', keywords: 'agency locations sub-accounts management', Icon: Building2 },
  { label: 'Marketplace', href: '/marketplace', keywords: 'marketplace addons plugins store buy', Icon: ShoppingCart },
  { label: 'Downloads', href: '/dashboard/downloads', keywords: 'downloads install cli mcp server', Icon: Download },
  { label: 'New Contact', href: '/dashboard/contacts?action=new', keywords: 'create new contact add person', Icon: UserPlus },
  { label: 'Send Email', href: '/dashboard/email/builder', keywords: 'compose new email send write', Icon: PenLine },
  { label: 'HIPAA Scanner', href: '/dashboard/hipaa', keywords: 'hipaa scan compliance healthcare security', Icon: HeartPulse },
]

const layoutOptions: { mode: LayoutMode; label: string }[] = [
  { mode: 'classic', label: 'Classic' },
  { mode: 'compact', label: 'Compact' },
  { mode: 'horizontal', label: 'Horizontal' },
]

export default function Header({ userEmail, userName, onMenuToggle, onLogout, layoutMode = 'classic', onLayoutChange }: HeaderProps) {
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const [showLocations, setShowLocations] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [activeLocation, setActiveLocation] = useState<string>('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/console/locations').then(r => r.json()).then(d => {
      const locs = d.locations || []
      setLocations(locs)
      if (d.activeLocationId) setActiveLocation(d.activeLocationId)
      else if (locs.length > 0) setActiveLocation(locs[0]?.id || '')
    }).catch(() => {})
  }, [])

  // Keyboard shortcut: / or Cmd+K to open search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === '/' || (e.metaKey && e.key === 'k')) && !searchOpen) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [searchOpen])

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 50)
      setSelectedIdx(0)
    }
  }, [searchOpen])

  const filtered = searchQuery.trim()
    ? NAV_ITEMS.filter(item => {
        const q = searchQuery.toLowerCase()
        return item.label.toLowerCase().includes(q) || item.keywords.includes(q)
      })
    : NAV_ITEMS.slice(0, 8)

  function handleSearchNav(href: string) {
    setSearchOpen(false)
    setSearchQuery('')
    router.push(href)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && filtered[selectedIdx]) { handleSearchNav(filtered[selectedIdx].href) }
  }

  async function switchLocation(id: string) {
    setActiveLocation(id)
    setShowLocations(false)
    await fetch('/api/console/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: id }),
    }).catch(() => {})
    window.location.reload()
  }

  // ── Rotating "Did you know" tips ──
  const TIPS = [
    { text: 'Press / to search anything', colorClass: 'text-core-green' },
    { text: 'Cmd+K opens smart navigation', colorClass: 'text-core-cyan' },
    { text: 'Switch locations from the header', colorClass: 'text-core-purple' },
    { text: 'Ask Jaxx to create contacts for you', colorClass: 'text-core-green' },
    { text: 'Voice AI can handle intake calls', colorClass: 'text-core-amber' },
    { text: 'Blog Engine writes SEO content with AI', colorClass: 'text-core-cyan' },
    { text: 'Connect Google in Settings → Analytics', colorClass: 'text-core-green' },
    { text: 'HIPAA Scanner checks 63 compliance points', colorClass: 'text-core-red' },
    { text: 'Workflows automate your entire pipeline', colorClass: 'text-core-purple' },
    { text: 'Brand Board stores your design identity', colorClass: 'text-core-amber' },
  ]
  const [tipIdx, setTipIdx] = useState(0)
  const [tipVisible, setTipVisible] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTipVisible(true)
      setTimeout(() => setTipVisible(false), 4000)
      setTipIdx(prev => (prev + 1) % TIPS.length)
    }, 30000)

    // Show first tip after 5s
    const first = setTimeout(() => {
      setTipVisible(true)
      setTimeout(() => setTipVisible(false), 4000)
    }, 5000)

    return () => { clearInterval(interval); clearTimeout(first) }
  }, [])

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.slice(0, 2).toUpperCase() || '0N'

  const activeName = locations.find(l => l.id === activeLocation)?.name || 'Select location'

  return (
    <>
      <header className="jp-header">
        <div className="jp-header-start">
          {layoutMode !== 'horizontal' && (
            <button className="jp-header-mobile-toggle" onClick={onMenuToggle}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {layoutMode === 'horizontal' && (
            <a href="/dashboard" className="flex items-center mr-4 no-underline">
              <img src="/brand/0ncore-logo.png" alt="0nCore" className="h-7 object-contain" />
            </a>
          )}

          {/* ═══ Location Switcher ═══ */}
          <div className="relative mr-2">
            <button
              onClick={() => { setShowLocations(!showLocations); setShowUserMenu(false); setShowLayoutMenu(false) }}
              className="flex items-center gap-2 px-3 h-[34px] bg-transparent border border-core-border rounded-lg text-core-text text-[13px] font-medium cursor-pointer max-w-[180px] transition-colors duration-150 hover:border-core-green"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-core-green shrink-0" />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{activeName}</span>
              <ChevronDown className="w-2.5 h-2.5 shrink-0 opacity-40" />
            </button>
            {showLocations && (
              <>
                <div className="fixed inset-0 z-[99]" onClick={() => setShowLocations(false)} />
                <div className="absolute top-full left-0 mt-1 w-[280px] bg-core-card border border-core-border rounded-[10px] overflow-hidden z-[100] shadow-[0_12px_40px_rgba(0,0,0,0.5)] max-h-80 overflow-y-auto">
                  <div className="px-3.5 py-2.5 text-[10px] font-bold text-core-text-muted uppercase tracking-widest border-b border-core-border">
                    Locations
                  </div>
                  {locations.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => switchLocation(loc.id)}
                      className="w-full px-3.5 py-2.5 flex items-center gap-2.5 bg-transparent border-none border-b border-core-border text-core-text text-[13px] cursor-pointer text-left font-[inherit] transition-colors duration-150 hover:bg-white/[0.03]"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${loc.id === activeLocation ? 'bg-core-green' : 'bg-core-border'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`${loc.id === activeLocation ? 'font-semibold text-core-green' : 'font-normal'}`}>
                          {loc.name}
                        </div>
                        <div className="text-[10px] text-core-text-muted font-mono mt-px">
                          {loc.id.substring(0, 20)}
                        </div>
                      </div>
                      {loc.id === activeLocation && (
                        <Check className="w-3.5 h-3.5 text-core-green" />
                      )}
                    </button>
                  ))}
                  {locations.length === 0 && (
                    <div className="px-3.5 py-5 text-[12px] text-core-text-muted text-center">No locations linked</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ═══ Search Trigger ═══ */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 h-[34px] px-3 bg-transparent border border-core-border rounded-lg cursor-pointer text-core-text-muted text-[13px] font-[inherit] transition-colors duration-150 min-w-[200px] hover:border-core-green"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} className="shrink-0 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="opacity-50 whitespace-nowrap">Search or navigate...</span>
            <kbd className="ml-auto px-[5px] py-px text-[10px] rounded border border-core-border font-mono opacity-50">/</kbd>
          </button>
        </div>

        {/* ═══ Did You Know Tips ═══ */}
        {tipVisible && (
          <div className={`absolute left-1/2 -translate-x-1/2 text-[11px] font-medium whitespace-nowrap pointer-events-none transition-opacity duration-600 ${TIPS[tipIdx].colorClass} ${tipVisible ? 'opacity-100' : 'opacity-0'}`}>
            {TIPS[tipIdx].text}
          </div>
        )}

        <div className="jp-header-end">
          <TokenButton />
          <NotificationBell />

          {/* Layout switcher */}
          <div className="relative">
            <button className="jp-header-btn" onClick={() => { setShowLayoutMenu(!showLayoutMenu); setShowUserMenu(false) }} title="Layout">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zm10-3a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
              </svg>
            </button>
            {showLayoutMenu && (
              <>
                <div className="fixed inset-0 z-[99]" onClick={() => setShowLayoutMenu(false)} />
                <div className="absolute top-full right-0 mt-1.5 w-40 bg-core-card border border-core-border rounded-lg p-1 z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                  {layoutOptions.map(opt => (
                    <button
                      key={opt.mode}
                      onClick={() => { onLayoutChange?.(opt.mode); setShowLayoutMenu(false) }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 text-[13px] font-medium rounded-md border-none cursor-pointer font-[inherit] transition-colors duration-100 ${layoutMode === opt.mode ? 'text-core-green bg-core-green/[0.06]' : 'text-core-text bg-transparent hover:bg-white/[0.03]'}`}
                    >
                      {opt.label}
                      {layoutMode === opt.mode && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="jp-header-user relative" onClick={() => { setShowUserMenu(!showUserMenu); setShowLayoutMenu(false) }}>
            <div className="jp-header-user-info">
              <div className="jp-header-user-name">{userName || userEmail?.split('@')[0] || 'User'}</div>
              <div className="jp-header-user-role">Administrator</div>
            </div>
            <div className="jp-avatar">{initials}</div>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-[99]" onClick={() => setShowUserMenu(false)} />
                <div className="absolute top-full right-0 mt-1.5 w-[200px] bg-core-card border border-core-border rounded-lg p-1 z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                  <div className="px-2.5 py-2 text-[11px] text-core-text-muted border-b border-core-border mb-1 font-mono">{userEmail}</div>
                  <a
                    href="/dashboard/settings"
                    className="block px-2.5 py-2 text-[13px] text-core-text no-underline rounded-md transition-colors duration-100 hover:bg-white/[0.03]"
                  >
                    Settings
                  </a>
                  <button
                    onClick={onLogout}
                    className="w-full px-2.5 py-2 text-[13px] text-core-red bg-transparent border-none rounded-md cursor-pointer text-left font-[inherit] transition-colors duration-100 hover:bg-core-red/[0.06]"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ═══ Smart Search Command Palette ═══ */}
      {searchOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[9000] backdrop-blur-[4px]"
            onClick={() => { setSearchOpen(false); setSearchQuery('') }}
          />
          <div className="fixed top-[18%] left-1/2 -translate-x-1/2 w-full max-w-[520px] z-[9001] bg-core-card border border-core-border rounded-[14px] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-[searchIn_0.15s_ease-out]">
            {/* Search input */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-core-border">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} className="text-core-text-muted">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedIdx(0) }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search pages, tools, or actions..."
                className="flex-1 bg-transparent border-none outline-none text-core-text text-[15px] font-[inherit] placeholder:text-core-text-muted"
              />
              <kbd className="px-1.5 py-0.5 text-[10px] rounded border border-core-border text-core-text-muted font-mono">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[360px] overflow-y-auto py-1">
              {!searchQuery && (
                <div className="px-4 py-1.5 text-[10px] font-bold text-core-text-muted uppercase tracking-widest">Quick Navigation</div>
              )}
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-core-text-muted text-[13px]">No results for &ldquo;{searchQuery}&rdquo;</div>
              )}
              {filtered.map((item, i) => {
                const ItemIcon = item.Icon
                return (
                  <button
                    key={item.href}
                    onClick={() => handleSearchNav(item.href)}
                    onMouseEnter={() => setSelectedIdx(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 border-none cursor-pointer text-[13px] font-[inherit] text-left transition-colors duration-100 border-l-2 ${i === selectedIdx ? 'bg-core-green/[0.06] text-core-text border-l-core-green' : 'bg-transparent text-core-text-dim border-l-transparent'}`}
                  >
                    <ItemIcon className={`w-4 h-4 shrink-0 ${i === selectedIdx ? 'opacity-100' : 'opacity-50'}`} />
                    <span className={i === selectedIdx ? 'font-semibold' : 'font-normal'}>{item.label}</span>
                    {i === selectedIdx && (
                      <span className="ml-auto text-[10px] text-core-text-muted font-mono">Enter ↵</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-core-border flex gap-3 justify-center">
              <span className="text-[10px] text-core-text-muted">↑↓ navigate</span>
              <span className="text-[10px] text-core-text-muted">↵ open</span>
              <span className="text-[10px] text-core-text-muted">esc close</span>
            </div>
          </div>

          <style>{`
            @keyframes searchIn {
              from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.98); }
              to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
            }
          `}</style>
        </>
      )}
    </>
  )
}
