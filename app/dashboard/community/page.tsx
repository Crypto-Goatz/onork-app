'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, ExternalLink as ExternalLinkIcon } from 'lucide-react'

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
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6">
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
            <ExternalLinkIcon className="size-3" />
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
              <div className="flex items-center justify-center mb-4"><MessageCircle className="size-10 text-core-text-muted" /></div>
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
