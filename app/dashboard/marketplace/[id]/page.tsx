'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Download, Loader2, CheckCircle2, AlertCircle, Lock, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MarketplaceApp {
  id: string
  slug: string
  name: string
  description: string
  long_description: string | null
  category: string
  tags: string[]
  version: string
  vendor_name: string
  vendor_verified: boolean
  icon: string | null
  screenshots: string[]
  demo_url: string | null
  price_cents: number
  price_type: 'one_time' | 'recurring'
  installs: number
  avg_rating: number | null
  review_count: number
  required_plan: string
  required_services: string[]
  app_config: { trigger?: { type: string; cron?: string }; steps?: { type: string }[] }
}

interface Review {
  id: string
  user_id: string
  rating: number
  title: string | null
  body: string | null
  created_at: string
}

function formatPrice(cents: number, type: string) {
  if (cents === 0) return 'Free'
  const dollars = (cents / 100).toFixed(2).replace(/\.00$/, '')
  return type === 'recurring' ? `$${dollars}/mo` : `$${dollars} one-time`
}

export default function AppDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [app, setApp] = useState<MarketplaceApp | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requirementsError, setRequirementsError] = useState<{ missing_services: string[]; required_plan: string; user_plan: string } | null>(null)

  useEffect(() => {
    fetch(`/api/marketplace/apps/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else {
          setApp(data.app)
          setReviews(data.reviews || [])
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function install() {
    if (!app) return
    setInstalling(true)
    setError(null)
    setRequirementsError(null)

    try {
      const supabase = createClient()
      const { data: { session: __sess } } = await supabase.auth.getSession()
  const user = __sess?.user ?? null
      if (!user) {
        setError('Please sign in first')
        setInstalling(false)
        return
      }

      const res = await fetch('/api/marketplace/install-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: app.id, user_id: user.id, user_email: user.email }),
      })
      const data = await res.json()

      if (data.requires_payment && data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }

      if (data.error) {
        if (data.requirements) setRequirementsError(data.requirements)
        else setError(data.error)
        setInstalling(false)
        return
      }

      router.push('/dashboard/marketplace/my-apps?installed=' + app.slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install failed')
      setInstalling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-white/60">{error || 'App not found'}</p>
        <Link href="/dashboard/marketplace" className="text-[#7ed957] hover:underline">Back to marketplace</Link>
      </div>
    )
  }

  const trigger = app.app_config?.trigger
  const stepCount = app.app_config?.steps?.length || 0

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/dashboard/marketplace" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition">
          <ArrowLeft className="h-4 w-4" /> Marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-16 w-16 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-2xl font-semibold flex-shrink-0">
                {app.icon || app.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-1">{app.name}</h1>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <span>{app.vendor_name}</span>
                  {app.vendor_verified && <span className="text-[#7ed957]">✓ Verified</span>}
                  <span>·</span>
                  <span>v{app.version}</span>
                </div>
              </div>
            </div>

            <p className="text-lg text-white/80 mb-6">{app.description}</p>

            {app.long_description && (
              <div className="prose prose-invert max-w-none mb-8">
                <p className="text-white/70 whitespace-pre-wrap">{app.long_description}</p>
              </div>
            )}

            {app.screenshots.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-8">
                {app.screenshots.map((src, i) => (
                  <img key={i} src={src} alt={`Screenshot ${i + 1}`} className="rounded-lg border border-white/[0.06]" />
                ))}
              </div>
            )}

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mb-6">
              <h3 className="font-semibold mb-3">How it works</h3>
              <div className="space-y-2 text-sm text-white/70">
                <div><span className="text-white/50">Trigger:</span> {trigger?.type || 'manual'}{trigger?.cron ? ` (${trigger.cron})` : ''}</div>
                <div><span className="text-white/50">Steps:</span> {stepCount}</div>
                {app.required_services.length > 0 && (
                  <div><span className="text-white/50">Connects to:</span> {app.required_services.join(', ')}</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Reviews ({app.review_count})</h3>
              {reviews.length === 0 ? (
                <p className="text-white/50 text-sm">No reviews yet. Be the first.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map(r => (
                    <div key={r.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                        ))}
                        {r.title && <span className="text-sm font-medium ml-2">{r.title}</span>}
                      </div>
                      {r.body && <p className="text-sm text-white/70">{r.body}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 sticky top-6">
              <div className="text-3xl font-bold mb-2">{formatPrice(app.price_cents, app.price_type)}</div>
              <div className="flex items-center gap-3 text-sm text-white/60 mb-5">
                <span className="flex items-center gap-1"><Download className="h-3 w-3" />{app.installs} installs</span>
                {app.avg_rating != null && (
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-400" />{Number(app.avg_rating).toFixed(1)}</span>
                )}
              </div>

              {requirementsError && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3 text-xs">
                  <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-1">
                    <Lock className="h-3 w-3" /> Requirements not met
                  </div>
                  {requirementsError.missing_services.length > 0 && (
                    <p className="text-white/70">Connect: {requirementsError.missing_services.join(', ')}</p>
                  )}
                  {requirementsError.user_plan !== requirementsError.required_plan && (
                    <p className="text-white/70">Plan: {requirementsError.required_plan} required (you have {requirementsError.user_plan})</p>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3 text-xs flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-red-400" />
                  <span className="text-white/80">{error}</span>
                </div>
              )}

              <button
                onClick={install}
                disabled={installing}
                className="w-full bg-[#7ed957] hover:bg-[#6bc847] disabled:opacity-50 text-black font-semibold rounded-lg py-3 transition flex items-center justify-center gap-2"
              >
                {installing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {installing ? 'Installing...' : app.price_cents === 0 ? 'Install Free' : 'Install'}
              </button>

              {app.demo_url && (
                <a
                  href={app.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg py-2.5 text-sm transition flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" /> Live Demo
                </a>
              )}

              <div className="mt-5 pt-5 border-t border-white/[0.06] text-xs text-white/50 space-y-1">
                <div>Category: <span className="text-white/70">{app.category}</span></div>
                <div>Plan required: <span className="text-white/70">{app.required_plan}</span></div>
                {app.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {app.tags.map(tag => (
                      <span key={tag} className="bg-white/[0.04] rounded px-2 py-0.5">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
