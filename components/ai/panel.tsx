'use client'

/**
 * AI Panel — card-styled overlay that floats over a canvas/viewport. Stays
 * fixed when the underlying canvas pans/zooms. Stops mouse propagation so
 * clicks inside the panel never pick or move nodes.
 *
 * Typical content: node config, run logs, minimap, action buttons.
 *
 * Composition:
 *   <Panel position="top-right">
 *     <PanelHeader>Workflow Settings</PanelHeader>
 *     <PanelContent>...</PanelContent>
 *     <PanelFooter>...</PanelFooter>
 *   </Panel>
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const panelShell = cva(
  'pointer-events-auto absolute z-20 flex flex-col rounded-lg border bg-card text-card-foreground shadow-lg backdrop-blur-sm',
  {
    variants: {
      position: {
        'top-left': 'left-4 top-4',
        'top-right': 'right-4 top-4',
        'bottom-left': 'left-4 bottom-4',
        'bottom-right': 'right-4 bottom-4',
        'top-center': 'left-1/2 top-4 -translate-x-1/2',
        'bottom-center': 'left-1/2 bottom-4 -translate-x-1/2',
      },
      width: {
        sm: 'w-64',
        md: 'w-80',
        lg: 'w-96',
        xl: 'w-[28rem]',
      },
    },
    defaultVariants: {
      position: 'top-right',
      width: 'md',
    },
  }
)

export interface PanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof panelShell> {
  open?: boolean // when controlled, hides when false
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, position, width, open = true, children, onMouseDown, onWheel, ...props }, ref) => {
    if (!open) return null
    return (
      <div
        ref={ref}
        className={cn(panelShell({ position, width }), className)}
        // Stop propagation so canvas doesn't try to pan/select on panel interactions
        onMouseDown={(e) => {
          e.stopPropagation()
          onMouseDown?.(e)
        }}
        onWheel={(e) => {
          e.stopPropagation()
          onWheel?.(e)
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Panel.displayName = 'Panel'

export interface PanelHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  onClose?: () => void
  title?: React.ReactNode
}

export function PanelHeader({ className, onClose, title, children, ...props }: PanelHeaderProps) {
  return (
    <div
      className={cn('flex items-center justify-between gap-2 border-b px-3 py-2', className)}
      {...props}
    >
      <div className="text-sm font-semibold">{title ?? children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function PanelContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-auto p-3', className)} {...props} />
}

export function PanelFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 border-t px-3 py-2', className)}
      {...props}
    />
  )
}
