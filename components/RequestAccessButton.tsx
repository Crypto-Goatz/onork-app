'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import RequestAccessModal from './RequestAccessModal'
import { track } from '@/lib/track'

/**
 * The CTA + its modal, together.
 *
 * Server components render the marketing pages; only this island is client-side,
 * so opening the form costs one small bundle rather than making a whole page
 * interactive. `source` is carried through to the event and the CRM tag, so
 * "which page produced this lead" is answerable without guessing from referers.
 */
export default function RequestAccessButton({
  label = 'Request access',
  source = 'unknown',
  variant = 'primary',
}: {
  label?: string
  source?: string
  variant?: 'primary' | 'outline'
}) {
  const [open, setOpen] = useState(false)

  const styles =
    variant === 'primary'
      ? 'bg-[#6EE05A] text-[#0d1117] hover:opacity-90'
      : 'border border-[#30363d] text-[#e6edf3] hover:border-[#6EE05A]/40'

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); track('cta_install_crm', { source, label }) }}
        className={`inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold transition-colors ${styles}`}
      >
        {label}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <RequestAccessModal open={open} onClose={() => setOpen(false)} source={source} />
    </>
  )
}
