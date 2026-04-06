'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function VoicePage() {
  const [agentId, setAgentId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [showEmbed, setShowEmbed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [aiName, setAiName] = useState('0nAI')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setLocationId(user.user_metadata?.active_location_id || '')
        setAiName(user.user_metadata?.ai_name || '0nAI')
      }
    })
    // Load agent ID from CRM
    fetch('/api/crm/agent').then(r => r.json()).then(d => {
      if (d.agentId) setAgentId(d.agentId)
    }).catch(() => {})
  }, [])

  const embedCode = `<!-- ${aiName} Voice Widget -->
<script src="https://widgets.leadconnectorhq.com/loader.js"
  data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
  data-widget-id="${agentId}">
</script>`

  const assessmentEmbedCode = `<!-- ${aiName} Free Business Assessment -->
<div id="0nai-assessment" style="position:fixed;bottom:24px;right:24px;z-index:9999;">
  <script src="https://widgets.leadconnectorhq.com/loader.js"
    data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
    data-widget-id="${agentId}">
  </script>
</div>`

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>Voice AI</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>Talk to your AI or embed it on your website for clients.</p>
      </div>

      {/* Live Voice Orb */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 16, padding: '40px', marginBottom: 24,
        textAlign: 'center',
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%', margin: '0 auto 24px',
          background: 'radial-gradient(circle, rgba(45,212,191,0.15) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid rgba(45,212,191,0.2)',
          animation: 'voice-pulse 3s ease-in-out infinite',
          cursor: 'pointer',
          position: 'relative',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(45,212,191,0.3), rgba(139,92,246,0.3))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="1.5">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 19v3m-4 0h8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 6 }}>
          {aiName}'s Voice
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginBottom: 20 }}>
          {agentId ? 'Your AI agent is active and ready to talk.' : 'Set up your AI agent in the CRM to enable voice.'}
        </p>
        {agentId && (
          <p style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>
            Agent ID: <code style={{ background: 'var(--bg-secondary, #161b22)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-secondary, #9ca3af)' }}>{agentId}</code>
          </p>
        )}
        <style>{`
          @keyframes voice-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(45,212,191,0.15); }
            50% { box-shadow: 0 0 0 20px rgba(45,212,191,0); }
          }
        `}</style>
      </div>

      {/* Embed Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '24px',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 6 }}>Chat Widget</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 16, lineHeight: 1.6 }}>
            Add a chat bubble to your website. Visitors type or talk to your AI.
          </p>
          <button onClick={() => copyCode(embedCode)} style={{
            width: '100%', padding: '10px',
            background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)',
            borderRadius: 8, color: 'var(--color-cyan, #14b8a6)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{copied ? '✓ Copied!' : 'Copy Embed Code'}</button>
        </div>

        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '24px',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 6 }}>
            Free Assessment
            <span style={{
              marginLeft: 8, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontSize: 10, fontWeight: 700,
            }}>LEAD GEN</span>
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 16, lineHeight: 1.6 }}>
            Visitors get a free AI assessment of their business. Every conversation = a new lead.
          </p>
          <button onClick={() => copyCode(assessmentEmbedCode)} style={{
            width: '100%', padding: '10px',
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 8, color: '#8b5cf6', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{copied ? '✓ Copied!' : 'Copy Assessment Code'}</button>
        </div>
      </div>

      {/* Preview */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 14, padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)' }}>Preview Embed Code</h3>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary, #161b22)', borderRadius: 6, padding: 2 }}>
            <button onClick={() => setTheme('dark')} style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', fontSize: 11, cursor: 'pointer',
              background: theme === 'dark' ? 'var(--border, #30363d)' : 'transparent',
              color: theme === 'dark' ? 'var(--color-cyan, #14b8a6)' : 'var(--text-muted, #6b7280)',
            }}>Dark</button>
            <button onClick={() => setTheme('light')} style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', fontSize: 11, cursor: 'pointer',
              background: theme === 'light' ? 'var(--border, #30363d)' : 'transparent',
              color: theme === 'light' ? 'var(--color-cyan, #14b8a6)' : 'var(--text-muted, #6b7280)',
            }}>Light</button>
          </div>
        </div>
        <pre style={{
          background: 'var(--bg-secondary, #161b22)', border: '1px solid #1c2b42',
          borderRadius: 8, padding: '16px', overflow: 'auto',
          fontSize: 12, color: 'var(--text-secondary, #9ca3af)', lineHeight: 1.7,
          fontFamily: 'JetBrains Mono, monospace',
        }}>{embedCode}</pre>
      </div>
    </div>
  )
}
