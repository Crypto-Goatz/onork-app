'use client'

import { AlertTriangle, RefreshCw, Loader2, Inbox } from 'lucide-react'

/**
 * Full-page loading spinner — use when page data is loading
 */
export function PageLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-core-green/20 border-t-core-green animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-core-green animate-pulse" />
          </div>
        </div>
        {message && <p className="text-[11px] text-core-text-muted font-mono tracking-wider">{message}</p>}
      </div>
    </div>
  )
}

/**
 * Inline loading spinner — use inside cards/sections
 */
export function InlineLoading({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className={`animate-spin text-core-green ${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'}`} />
    </div>
  )
}

/**
 * Error state with retry — use when a fetch fails
 */
export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[40vh] px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-xl bg-core-red/10 border border-core-red/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-5 h-5 text-core-red" />
        </div>
        <h3 className="text-[15px] font-bold text-core-text mb-1.5">Something went wrong</h3>
        <p className="text-[13px] text-core-text-muted mb-4 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-core-green text-core-bg text-[13px] font-bold cursor-pointer border-none hover:bg-core-green/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Inline error banner — use inside cards for non-fatal errors
 */
export function InlineError({ message, onRetry, onDismiss }: { message: string; onRetry?: () => void; onDismiss?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-core-red/[0.06] border border-core-red/15 text-core-red text-[13px]">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-[11px] font-semibold underline bg-transparent border-none text-core-red cursor-pointer shrink-0">
          Retry
        </button>
      )}
      {onDismiss && (
        <button onClick={onDismiss} className="text-[11px] font-semibold bg-transparent border-none text-core-red/50 cursor-pointer shrink-0">
          Dismiss
        </button>
      )}
    </div>
  )
}

/**
 * Empty state — use when there's no data to show
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: typeof Inbox
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-10 h-10 text-core-border mb-3" />
      <p className="text-[14px] font-semibold text-core-text-dim mb-1">{title}</p>
      {description && <p className="text-[12px] text-core-text-muted max-w-xs">{description}</p>}
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <a href={actionHref} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-core-green text-core-bg text-[12px] font-bold no-underline hover:bg-core-green/90 transition-colors">
            {actionLabel}
          </a>
        ) : (
          <button onClick={onAction} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-core-green text-core-bg text-[12px] font-bold cursor-pointer border-none hover:bg-core-green/90 transition-colors">
            {actionLabel}
          </button>
        )
      )}
    </div>
  )
}

/**
 * Skeleton loader — use for placeholder content while loading
 */
export function Skeleton({ className = '', count = 1 }: { className?: string; count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-pulse rounded-xl bg-white/[0.03] ${className || 'h-16'}`} />
      ))}
    </div>
  )
}

/**
 * Card skeleton — full card placeholder
 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-core-card border border-core-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/[0.04]" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-white/[0.04] rounded w-2/3" />
              <div className="h-2.5 bg-white/[0.03] rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
