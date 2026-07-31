'use client'

/**
 * CroSlot — CRO9-optimized copy slot.
 *
 * SEO-safe by design: the `fallback` (control copy) is server-rendered, so
 * crawlers and answer engines always index stable, real copy. After hydration,
 * the component fetches the Thompson-sampled best variant for live humans and
 * records an impression. Conversions are credited to every variant shown on the
 * page via trackCro9Conversion() (call it on your primary CTA / form submit).
 */

import { createElement, useEffect, useRef, useState } from 'react'

// slot -> variantId currently shown to this visitor
const shown = new Map<string, string>()

function track(id: string, type: 'impression' | 'conversion') {
  try {
    fetch('/api/cro9/variants/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* ignore */ }
}

/** Credit a conversion to all variants the visitor was shown. */
export function trackCro9Conversion() {
  for (const id of shown.values()) track(id, 'conversion')
}

type SlotTag = 'span' | 'h1' | 'h2' | 'p' | 'div' | 'strong'

export function CroSlot({
  slot,
  fallback,
  as = 'span',
  className,
  site = '0ncore',
}: {
  slot: string
  fallback: string
  as?: SlotTag
  className?: string
  site?: string
}) {
  const [content, setContent] = useState(fallback)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    fetch(`/api/cro9/variants?slot=${encodeURIComponent(slot)}&site=${encodeURIComponent(site)}`)
      .then((r) => r.json())
      .then((d) => {
        const v = d?.variant
        if (v?.content && v?.id) {
          setContent(v.content)
          shown.set(slot, v.id)
          track(v.id, 'impression')
        }
      })
      .catch(() => {})
  }, [slot, site])

  return createElement(as, className ? { className } : {}, content)
}
