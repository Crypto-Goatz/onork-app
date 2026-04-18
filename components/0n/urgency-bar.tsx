export function urgencyColor(v: number) {
  if (v >= 70) return '#ef4444'
  if (v >= 40) return '#f59e0b'
  return '#7ed957'
}

export function UrgencyBar({ value, height = 3 }: { value: number; height?: number }) {
  return (
    <div className='flex items-center gap-2'>
      <div className='flex-1 rounded-full overflow-hidden' style={{ height, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', width: `${value}%`, background: urgencyColor(value), borderRadius: height, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, color: urgencyColor(value) }}>{value}</span>
    </div>
  )
}
