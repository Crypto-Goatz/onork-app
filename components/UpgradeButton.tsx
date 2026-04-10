'use client'

interface UpgradeButtonProps {
  tierLevel: number
  tierName: string
  price: string
  className?: string
}

export function UpgradeButton({ tierLevel, tierName, price, className }: UpgradeButtonProps) {
  async function handleUpgrade() {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier_level: tierLevel }),
    })
    const { url, error } = await res.json()
    if (error) { alert(error); return }
    if (url) window.location.href = url
  }

  return (
    <button
      onClick={handleUpgrade}
      className={className}
      style={{
        background: '#6EE05A',
        color: '#080B0F',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 20px',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '14px',
      }}
    >
      Unlock {tierName} — {price}
    </button>
  )
}
