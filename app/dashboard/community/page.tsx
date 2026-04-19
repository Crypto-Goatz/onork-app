'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type CommunityTab = 'forum' | 'announcements' | 'support'

export default function CommunityPage() {
  const [tab, setTab] = useState<CommunityTab>('forum')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email)
    })
  }, [])

  const tabs: { key: CommunityTab; label: string }[] = [
    { key: 'forum', label: 'Community Forum' },
    { key: 'announcements', label: 'Announcements' },
    { key: 'support', label: 'Support' },
  ]

  // Auto-login URL for 0nmcp.com forum (SSO via email)
  const forumUrl = `https://0nmcp.com/forum${userEmail ? `?sso_email=${encodeURIComponent(userEmail)}` : ''}`
  const announcementsUrl = `https://0nmcp.com/forum/c/announcements${userEmail ? `?sso_email=${encodeURIComponent(userEmail)}` : ''}`

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)', margin: '-24px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-extrabold">Community</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 uppercase tracking-wider">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t.key
                  ? 'bg-primary/15 text-primary border border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.15)]'
                  : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="w-px h-5 bg-border/50 mx-1" />
          <a
            href={forumUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Open in new tab
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          </a>
        </div>
      </div>

      {/* Embedded content */}
      <div className="flex-1 relative">
        {tab === 'forum' && (
          <iframe
            src={forumUrl}
            className="w-full h-full border-0"
            title="0nCore Community Forum"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
          />
        )}

        {tab === 'announcements' && (
          <iframe
            src={announcementsUrl}
            className="w-full h-full border-0"
            title="0nCore Announcements"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
          />
        )}

        {tab === 'support' && (
          <div className="flex items-center justify-center h-full p-8">
            <div className="max-w-md text-center">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-lg font-bold mb-2">Need Help?</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Get help from the 0nCore team and community. Post in the forum or reach out directly.
              </p>
              <div className="space-y-3">
                <a
                  href={`${forumUrl.split('?')[0]}/c/support`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  Post in Support Forum
                </a>
                <a
                  href="mailto:mike@rocketopp.com"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground font-medium text-sm transition-colors"
                >
                  Email Support — mike@rocketopp.com
                </a>
                <a
                  href="/dashboard/docs"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground font-medium text-sm transition-colors"
                >
                  Browse Documentation
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
