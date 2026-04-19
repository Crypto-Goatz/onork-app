'use client'

import { useState } from 'react'

const DEFAULT_TOPICS = ['AI', 'Marketing', 'SEO', 'MCP', 'Automation', 'Future of Work']

interface SocialTrendsModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (topics: string[]) => void
  isProcessing: boolean
  generatedContent?: string
}

export default function SocialTrendsModal({ isOpen, onClose, onSubmit, isProcessing, generatedContent }: SocialTrendsModalProps) {
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['AI', 'Marketing'])
  const [customTopic, setCustomTopic] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic])
  }

  const addCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (customTopic.trim() && !selectedTopics.includes(customTopic.trim())) {
      setSelectedTopics(prev => [...prev, customTopic.trim()])
      setCustomTopic('')
    }
  }

  const handleCopy = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #1e293b', borderRadius: 14,
        width: '100%', maxWidth: 660, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>{'\uD83D\uDCC8'}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f0f4f8' }}>Social Viral Engine</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#8b95a5' }}>Identify trends and generate algorithm-optimized posts.</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 18 }}>x</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {!generatedContent ? (
            <div style={{ padding: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8b95a5', marginBottom: 10 }}>Select Trending Topics</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {DEFAULT_TOPICS.map(topic => (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${selectedTopics.includes(topic) ? '#3b82f6' : '#1e293b'}`,
                      background: selectedTopics.includes(topic) ? '#3b82f6' : 'transparent',
                      color: selectedTopics.includes(topic) ? '#fff' : '#8b95a5',
                      transition: 'all 0.15s',
                    }}
                  >{topic}</button>
                ))}
              </div>

              <form onSubmit={addCustom} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <input
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  placeholder="Add custom topic..."
                  style={{ flex: 1, padding: '8px 12px', background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, color: '#f0f4f8', fontSize: 13, outline: 'none' }}
                />
                <button type="submit" disabled={!customTopic.trim()} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', color: '#8b95a5', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+</button>
              </form>

              <div style={{ background: 'rgba(59,130,246,0.1)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 6 }}>{'\uD83D\uDCC8'} How it works</h4>
                <p style={{ margin: 0, fontSize: 11, color: '#3b82f6', lineHeight: 1.5, opacity: 0.8 }}>
                  AI will scan for the latest viral conversations on your selected topics. It will then generate distinct post drafts optimized for maximum organic reach.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ padding: 20, background: '#0d1117' }}>
              <div style={{ background: '#161b22', padding: 20, borderRadius: 10, border: '1px solid #1e293b', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, color: '#f0f4f8' }}>
                {generatedContent}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {generatedContent ? (
            <>
              <button onClick={() => onSubmit([])} style={{ background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Start Over</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCopy} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid #1e293b', borderRadius: 8, color: '#f0f4f8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {copied ? 'Copied!' : 'Copy All'}
                </button>
                <button onClick={onClose} style={{ padding: '8px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Done</button>
              </div>
            </>
          ) : (
            <>
              <span style={{ fontSize: 11, color: '#3d4654' }}>{selectedTopics.length} topics selected</span>
              <button
                onClick={() => onSubmit(selectedTopics)}
                disabled={selectedTopics.length === 0 || isProcessing}
                style={{
                  padding: '8px 20px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: selectedTopics.length === 0 || isProcessing ? 'not-allowed' : 'pointer',
                  background: selectedTopics.length === 0 || isProcessing ? '#1e293b' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: selectedTopics.length === 0 || isProcessing ? '#3d4654' : '#fff',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {isProcessing ? 'Scanning & Writing...' : 'Scan Trends & Generate'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
