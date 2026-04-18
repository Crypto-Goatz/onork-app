import { cn } from '@/lib/utils'

export function StatCard({ label, value, icon, color = 'text-foreground', className }: { label: string; value: string | number; icon: React.ReactNode; color?: string; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border/50 bg-card/50 p-4', className)}>
      <div className='flex items-center gap-2 mb-1'>
        <span className={color}>{icon}</span>
        <span className='text-[11px] text-muted-foreground uppercase tracking-wider'>{label}</span>
      </div>
      <div className='text-2xl font-bold text-foreground'>{value}</div>
    </div>
  )
}
