'use client'

import { useState } from 'react'

interface AutoPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (text: string) => void
  isProcessing: boolean
}

export default function AutoPlanModal({ isOpen, onClose, onSubmit, isProcessing }: AutoPlanModalProps) {
  const [text, setText] = useState('')

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #1e293b', borderRadius: 14,
        width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #7ed957, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>{'\u2728'}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f0f4f8' }}>Auto-Plan Brain Dump</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#8b95a5' }}>Paste a list, a rough plan, or random thoughts. AI will sort it out.</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 18 }}>x</button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={isProcessing}
            placeholder={'Example:\n- Redesign the website for Acme Corp\n- Need to get credentials from Bob\n- Create a new project called "Marketing 2025"\n- Follow up with Jane about the logo'}
            style={{
              flex: 1, minHeight: 180, width: '100%', padding: 14, background: '#0d1117',
              border: '1px solid #1e293b', borderRadius: 10, color: '#f0f4f8', fontSize: 13,
              lineHeight: 1.6, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 12, background: 'rgba(59,130,246,0.1)', padding: '10px 14px', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#3b82f6', fontSize: 14, marginTop: 1 }}>{'\u2139'}</span>
            <p style={{ margin: 0, fontSize: 11, color: '#3b82f6', lineHeight: 1.5 }}>
              AI will analyze this text to automatically create Clients, Projects, and Tasks. It may take a moment to generate the structure.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{ padding: '8px 18px', background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#8b95a5', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >Cancel</button>
          <button
            onClick={() => onSubmit(text)}
            disabled={!text.trim() || isProcessing}
            style={{
              padding: '8px 20px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: !text.trim() || isProcessing ? 'not-allowed' : 'pointer',
              background: !text.trim() || isProcessing ? '#1e293b' : 'linear-gradient(135deg, #7ed957, #3b82f6)',
              color: !text.trim() || isProcessing ? '#3d4654' : '#fff',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isProcessing ? 'Processing...' : 'Generate Plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
