'use client'

import { useState, useEffect } from 'react'

interface AffiliateStats {
  totalReferrals: number
  activeReferrals: number
  totalEarnings: number
  pendingPayout: number
  conversionRate: number
  referralLink: string
}

export default function AffiliatesPage() {
  const [stats, setStats] = useState<AffiliateStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0,
    pendingPayout: 0,
    conversionRate: 0,
    referralLink: '',
  })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/affiliates/stats')
      .then(r => r.json())
      .then(d => { if (d.stats) setStats(d.stats) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function copyLink() {
    navigator.clipboard.writeText(stats.referralLink || `https://0ncore.com/signup?ref=${btoa(Date.now().toString()).slice(0, 8)}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>Affiliate Program</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>Earn 30% recurring commission for every customer you refer to 0nCore.</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Referrals', value: stats.totalReferrals, color: 'var(--color-cyan, #14b8a6)' },
          { label: 'Active Customers', value: stats.activeReferrals, color: '#34d399' },
          { label: 'Total Earned', value: `$${stats.totalEarnings.toFixed(2)}`, color: '#8b5cf6' },
          { label: 'Pending Payout', value: `$${stats.pendingPayout.toFixed(2)}`, color: '#fbbf24' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 12, padding: '20px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Referral Link */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 14, padding: 24, marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 12 }}>Your Referral Link</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            readOnly
            value={stats.referralLink || `https://0ncore.com/signup?ref=...`}
            style={{
              flex: 1, padding: '12px 16px',
              background: 'var(--bg-secondary, #161b22)', border: '1px solid #1c2b42',
              borderRadius: 10, color: 'var(--text-secondary, #9ca3af)', fontSize: 14,
            }}
          />
          <button onClick={copyLink} style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13,
            borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>{copied ? '✓ Copied!' : 'Copy Link'}</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 10 }}>
          Share this link anywhere. When someone signs up and subscribes, you earn 30% of their monthly payment — every month they stay.
        </p>
      </div>

      {/* Commission Structure */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 14, padding: 24, marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 16 }}>Commission Structure</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { plan: 'Starter', price: '$80/mo', commission: '$24/mo', color: 'var(--color-cyan, #14b8a6)' },
            { plan: 'Pro', price: '$180/mo', commission: '$54/mo', color: '#8b5cf6' },
            { plan: 'Agency', price: '$380/mo', commission: '$114/mo', color: '#f59e0b' },
          ].map(p => (
            <div key={p.plan} style={{
              background: 'var(--bg-secondary, #161b22)', border: '1px solid #1c2b42',
              borderRadius: 10, padding: 16, textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)', marginBottom: 4 }}>{p.plan}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginBottom: 8 }}>{p.price}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: p.color }}>{p.commission}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>recurring</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 14, textAlign: 'center' }}>
          10 Agency referrals = $1,140/mo passive income
        </p>
      </div>

      {/* Marketing Materials */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 14, padding: 24, marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 16 }}>Marketing Materials</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { name: 'Social Media Kit', desc: 'Pre-written posts for LinkedIn, Twitter, Facebook', icon: '📱' },
            { name: 'Email Templates', desc: '3 email templates for cold outreach', icon: '📧' },
            { name: 'Comparison Sheet', desc: '0nCore vs OpenClaw vs competitors', icon: '📊' },
            { name: 'Demo Video Script', desc: 'Walk-through script for live demos', icon: '🎥' },
          ].map(m => (
            <div key={m.name} style={{
              background: 'var(--bg-secondary, #161b22)', border: '1px solid #1c2b42',
              borderRadius: 10, padding: '14px 16px',
              display: 'flex', gap: 12, alignItems: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2dd4bf40'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border, #30363d)'}
            >
              <span style={{ fontSize: 24 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout Info */}
      <div style={{
        background: 'rgba(45,212,191,0.04)', border: '1px solid rgba(45,212,191,0.15)',
        borderRadius: 14, padding: 24, textAlign: 'center',
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-cyan, #14b8a6)', marginBottom: 8 }}>Payouts</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #9ca3af)', lineHeight: 1.6 }}>
          Commissions are paid monthly via Stripe or PayPal. Minimum payout: $50.
          30-day cookie window. Lifetime recurring commission on every referral.
        </p>
      </div>
    </div>
  )
}
