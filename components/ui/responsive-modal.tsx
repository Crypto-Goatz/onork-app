'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Button } from '@/components/ui/button'

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  showCancel?: boolean
}

/**
 * ResponsiveModal — centered modal on desktop, bottom sheet on mobile
 * Uses pure CSS/HTML, no dependency on specific dialog library
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  showCancel = true,
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (!open) return null

  if (isDesktop) {
    return (
      <>
        <div className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
        <div className={cn(
          'fixed z-[9001] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          {children}
          <button onClick={() => onOpenChange(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </>
    )
  }

  // Mobile — bottom sheet
  return (
    <>
      <div className="fixed inset-0 z-[9000] bg-black/60" onClick={() => onOpenChange(false)} />
      <div className={cn(
        'fixed z-[9001] bottom-0 left-0 right-0',
        'rounded-t-2xl border-t border-border bg-card p-6 pb-8',
        'animate-in slide-in-from-bottom',
        className
      )}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {children}
        {showCancel && (
          <div className="mt-4">
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        )}
      </div>
    </>
  )
}
