import { cn } from '@/lib/utils'

export function OnCard({ className, children, onClick, ...props }: React.HTMLAttributes<HTMLDivElement> & { onClick?: () => void }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card/50 p-5 transition-colors hover:border-border cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

export function OnCardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3 flex items-center justify-between', className)} {...props}>{children}</div>
}

export function OnCardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold text-foreground', className)} {...props}>{children}</h3>
}

export function OnCardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-muted-foreground leading-relaxed line-clamp-2', className)} {...props}>{children}</p>
}

export function OnCardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-4 pt-3 border-t border-border/30 flex items-center justify-between', className)} {...props}>{children}</div>
}
