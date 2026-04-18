export interface SubNavItem {
  key: string
  label: string
  icon: React.ReactNode
  color: string
}

export function SubNav({ items, active, onChange }: { items: SubNavItem[]; active: string; onChange: (key: string) => void }) {
  return (
    <div style={{ width: 220, borderLeft: '1px solid rgba(255,255,255,0.04)', paddingLeft: 20, flexShrink: 0 }}>
      <div style={{ position: 'sticky', top: 80 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Navigation</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map(item => (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8,
                background: active === item.key ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <span style={{ color: active === item.key ? item.color : 'rgba(255,255,255,0.3)' }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: active === item.key ? 600 : 400, color: active === item.key ? '#fff' : 'rgba(255,255,255,0.4)' }}>{item.label}</span>
              {active === item.key && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: 2, background: item.color }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
