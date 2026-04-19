'use client'

import { useState, useRef } from 'react'

interface OptimizationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (image: { data: string; mimeType: string }) => void
  isProcessing: boolean
}

export default function OptimizationModal({ isOpen, onClose, onSubmit, isProcessing }: OptimizationModalProps) {
  const [image, setImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImage({ data: result.split(',')[1], mimeType: file.type, preview: result })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #1e293b', borderRadius: 14,
        width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>{'\u26A1'}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f0f4f8' }}>Optimize Performance</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#8b95a5' }}>Upload a report screenshot for AI analysis.</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 18 }}>x</button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {!image ? (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]) }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#7ed957' : '#1e293b'}`, borderRadius: 12, padding: '40px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', textAlign: 'center', background: isDragging ? 'rgba(126,217,87,0.05)' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{'\uD83D\uDCC2'}</div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#f0f4f8' }}>Click to upload screenshot</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#3d4654' }}>or drag and drop here</p>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ display: 'none' }} />
            </div>
          ) : (
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #1e293b' }}>
              <img src={image.preview} alt="Preview" style={{ width: '100%', height: 220, objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
              <button
                onClick={() => setImage(null)}
                style={{
                  position: 'absolute', top: 8, right: 8, padding: '4px 10px', background: 'rgba(0,0,0,0.7)',
                  color: '#ef4444', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
              >Change</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#8b95a5', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
          <button
            onClick={() => image && onSubmit(image)}
            disabled={!image || isProcessing}
            style={{
              padding: '8px 18px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: !image || isProcessing ? 'not-allowed' : 'pointer',
              background: !image || isProcessing ? '#1e293b' : '#6366f1', color: !image || isProcessing ? '#3d4654' : '#fff',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze & Optimize'}
          </button>
        </div>
      </div>
    </div>
  )
}
