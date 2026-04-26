'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Share2, Loader2, AlertTriangle, RefreshCw, Plus, X, Send,
  CheckCircle, Clock, Globe, Linkedin, Twitter, Instagram,
  Facebook, Video, CalendarDays,
} from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

const PLATFORM_ICON: Record<string, typeof Globe> = {
  google: Globe,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  tiktok: Video,
}

export default function SocialPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accounts, setAccounts] = useState<crm.SocialAccount[]>([])
  const [posts, setPosts] = useState<crm.SocialPost[]>([])
  const [showComposer, setShowComposer] = useState(false)

  // Composer
  const [postText, setPostText] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [posting, setPosting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [acctRes, postRes] = await Promise.all([
        crm.social.accounts(),
        crm.social.posts({ limit: 50 }),
      ])
      setAccounts(acctRes.accounts || [])
      setPosts(postRes.posts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load social data')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const handlePost = async () => {
    if (!postText.trim()) {
      toast.error('Enter post content')
      return
    }
    if (selectedAccounts.length === 0) {
      toast.error('Select at least one account')
      return
    }
    if (!scheduleDate || !scheduleTime) {
      toast.error('Set a schedule date and time')
      return
    }
    setPosting(true)
    try {
      const scheduledDate = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
      await crm.social.createPost({
        summary: postText,
        scheduledDate,
        accountIds: selectedAccounts,
      })
      toast.success('Post scheduled')
      setShowComposer(false)
      setPostText('')
      setSelectedAccounts([])
      setScheduleDate('')
      setScheduleTime('')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create post')
    }
    setPosting(false)
  }

  const postStatusBadge = (status: string) => {
    const s = status?.toLowerCase()
    if (s === 'published' || s === 'posted') return 'bg-[#7ed957]/10 text-[#7ed957]'
    if (s === 'scheduled') return 'bg-[#00d4ff]/10 text-[#00d4ff]'
    if (s === 'failed') return 'bg-red-500/10 text-red-400'
    if (s === 'draft') return 'bg-yellow-500/10 text-yellow-400'
    return 'bg-white/[0.06] text-white/40'
  }

  const getPlatformIcon = (platform: string) => {
    const Icon = PLATFORM_ICON[platform?.toLowerCase()] || Globe
    return <Icon className="w-4 h-4" />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#7ed957]" />
            Social Planner
          </h1>
          <p className="text-xs text-white/40 mt-1">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-transparent text-white/50 text-xs font-medium cursor-pointer hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7ed957] text-black text-xs font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Post
          </button>
        </div>
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

      {!loading && (
        <>
          {/* Connected Accounts */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-white/70 mb-3">Connected Accounts</h2>
            {accounts.length === 0 ? (
              <div className="px-4 py-6 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <Globe className="w-8 h-8 mx-auto text-white/10 mb-2" />
                <p className="text-white/40 text-xs">No social accounts connected</p>
                <p className="text-white/20 text-[10px] mt-1">Connect accounts in your CRM settings</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {accounts.map(acct => (
                  <div key={acct.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#7ed957]/20 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center text-[#00d4ff] shrink-0">
                      {getPlatformIcon(acct.platform)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{acct.name}</div>
                      <div className="text-[10px] text-white/30 capitalize">{acct.platform}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Posts */}
          <div>
            <h2 className="text-sm font-bold text-white/70 mb-3">Posts</h2>
            {posts.length === 0 ? (
              <div className="px-4 py-10 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <Send className="w-8 h-8 mx-auto text-white/10 mb-2" />
                <p className="text-white/40 text-xs">No posts yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map(post => (
                  <div key={post.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#7ed957]/20 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#7ed957]/10 flex items-center justify-center text-[#7ed957] shrink-0 mt-0.5">
                      <Send className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white leading-relaxed line-clamp-2">{post.summary}</div>
                      <div className="flex items-center gap-3 mt-2">
                        {post.scheduledDate && (
                          <span className="flex items-center gap-1 text-[10px] text-white/30">
                            <CalendarDays className="w-3 h-3" />
                            {new Date(post.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                        <span className="text-[10px] text-white/20">
                          {post.accountIds?.length || 0} account{post.accountIds?.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${postStatusBadge(post.status)}`}>
                      {post.status === 'published' || post.status === 'posted' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {post.status?.charAt(0).toUpperCase() + post.status?.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Post Composer Modal */}
      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-2xl bg-[#0a0a0a] border border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Create Post</h2>
              <button onClick={() => setShowComposer(false)} className="p-1 rounded-lg hover:bg-white/[0.04] text-white/50 hover:text-white cursor-pointer bg-transparent border-none transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Post Content */}
              <div>
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Content</label>
                <textarea
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  rows={4}
                  placeholder="What do you want to share?"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/20 outline-none focus:border-[#7ed957]/40 resize-none"
                />
                <div className="text-right text-[10px] text-white/20 mt-1">{postText.length} characters</div>
              </div>

              {/* Account Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Accounts</label>
                {accounts.length === 0 ? (
                  <p className="text-xs text-white/30">No accounts connected</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {accounts.map(acct => {
                      const selected = selectedAccounts.includes(acct.id)
                      return (
                        <button
                          key={acct.id}
                          onClick={() => toggleAccount(acct.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${
                            selected
                              ? 'bg-[#7ed957]/10 border-[#7ed957]/30 text-[#7ed957]'
                              : 'bg-transparent border-white/[0.06] text-white/40 hover:text-white hover:border-white/[0.12]'
                          }`}
                        >
                          {getPlatformIcon(acct.platform)}
                          {acct.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none focus:border-[#7ed957]/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none focus:border-[#7ed957]/40"
                  />
                </div>
              </div>

              <button
                onClick={handlePost}
                disabled={posting}
                className="w-full py-2.5 rounded-xl bg-[#7ed957] text-black text-sm font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-50"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Schedule Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
