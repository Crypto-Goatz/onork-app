'use client'

import { useEffect, useRef } from 'react'
import { Activity, Sparkles, ShieldAlert, Filter, ExternalLink } from 'lucide-react'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

function track(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try {
    window.gtag?.('event', event, { surface: 'adaptive_siphon', ...payload })
  } catch {
    // ignore
  }
}

export default function AdaptiveSiphonPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    track('siphon_view')
    const onMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return
      const data = e.data as { type?: string; seed?: number }
      if (!data.type || !data.type.startsWith('siphon:')) return
      if (data.type === 'siphon:reset') track('siphon_reset', { seed: data.seed })
      if (data.type === 'siphon:save') track('siphon_save_png', { seed: data.seed })
      if (data.type === 'siphon:ready') track('siphon_ready')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div className="min-h-screen bg-core-bg text-core-text">
      {/* Header strip */}
      <div className="px-6 pt-6 pb-4 border-b border-core-border bg-core-bg">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-core-green" />
              <span className="text-[10px] font-bold uppercase tracking-[2px] text-core-green">
                Add-on · Traffic Intelligence
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-1">Adaptive Siphon</h1>
            <p className="text-[13px] text-core-text-muted mt-1 max-w-[680px]">
              Real-time PPC traffic visualizer. Every click is a particle, graded by
              behavioral fingerprint. The field learns what good traffic looks like
              and pulls A+ converters toward the nucleus while ejecting bots.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard/ads"
              className="text-[11px] font-semibold text-core-text-dim hover:text-core-green inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-core-border bg-core-card"
            >
              Paid Ads <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/dashboard/cro9-engine"
              className="text-[11px] font-semibold text-core-text-dim hover:text-core-green inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-core-border bg-core-card"
            >
              CRO9 Engine <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Quick legend pills */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Pill color="#6EE05A" icon={<Activity className="w-3 h-3" />} label="A+ converter" />
          <Pill color="#58a6ff" icon={<Filter className="w-3 h-3" />} label="B–C nurture" />
          <Pill color="#8b949e" icon={<Activity className="w-3 h-3" />} label="D–F dead" />
          <Pill color="#f87171" icon={<ShieldAlert className="w-3 h-3" />} label="X bot — blocked" />
        </div>
      </div>

      {/* Simulator frame */}
      <div className="px-6 py-4">
        <div className="rounded-xl overflow-hidden border border-core-border bg-core-card shadow-[0_0_40px_rgba(110,224,90,0.04)]">
          <iframe
            ref={iframeRef}
            src="/widgets/adaptive-siphon/index.html"
            title="Adaptive Siphon"
            className="w-full block"
            style={{ height: 'calc(100vh - 220px)', minHeight: 640, border: 0 }}
            sandbox="allow-scripts allow-same-origin allow-downloads"
          />
        </div>

        {/* Explainer cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Explainer
            title="How grading works"
            body="Each click gets three signals: behavioral variance (mouse jitter, scroll cadence), engagement depth (time on page, interactions), and velocity smoothness. Bots score uniform — the model flags anything too clean."
          />
          <Explainer
            title="Why the field evolves"
            body="A+ particles strengthen the nearby field cells. X-grade bots create turbulence that repels future traffic. Over time the gravity well learns which channels send converters."
          />
          <Explainer
            title="What to do with it"
            body="Watch the nucleus charge — that is your conversion confidence. If turbulence dominates the field, your traffic source is mostly noise. Reset and try a new seed to compare creatives."
          />
        </div>
      </div>
    </div>
  )
}

function Pill({ color, icon, label }: { color: string; icon: React.ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1.2px] px-2.5 py-1 rounded-full border"
      style={{
        color,
        borderColor: `${color}55`,
        background: `${color}11`,
      }}
    >
      {icon}
      {label}
    </span>
  )
}

function Explainer({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-core-border bg-core-card p-4">
      <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-core-green mb-1.5">
        {title}
      </div>
      <p className="text-[12px] leading-relaxed text-core-text-dim m-0">{body}</p>
    </div>
  )
}
