import { cn } from '@/lib/utils'

const COLORS = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-cyan-500',
  muted: 'bg-muted-foreground',
} as const

export function StatusDot({ status = 'muted', size = 8, className }: { status?: keyof typeof COLORS; size?: number; className?: string }) {
  return <div className={cn('rounded-full shrink-0', COLORS[status], className)} style={{ width: size, height: size }} />
}
