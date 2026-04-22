'use client'

import { useState, useRef } from 'react'
import { Zap, X, FolderOpen } from 'lucide-react'

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

  const canSubmit = image && !isProcessing

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-core-surface border border-core-border rounded-[14px] w-full max-w-[480px] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-[18px] border-b border-core-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] rounded-lg bg-core-purple flex items-center justify-center text-white shrink-0">
              <Zap size={16} />
            </div>
            <div>
              <h3 className="m-0 text-base font-extrabold text-core-text">Optimize Performance</h3>
              <p className="m-0 text-[11px] text-core-text-muted">Upload a report screenshot for AI analysis.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-core-text-dim cursor-pointer p-1 hover:text-core-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {!image ? (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]) }}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'border-2 border-dashed rounded-xl px-5 py-10 flex flex-col items-center justify-center cursor-pointer text-center transition-all duration-200',
                isDragging
                  ? 'border-core-green bg-core-green/5'
                  : 'border-core-border bg-transparent hover:border-core-border/70',
              ].join(' ')}
            >
              <FolderOpen size={28} className="text-core-text-muted mb-2" />
              <p className="m-0 text-[13px] font-semibold text-core-text">Click to upload screenshot</p>
              <p className="m-0 mt-1 text-[11px] text-core-text-muted">or drag and drop here</p>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative rounded-[10px] overflow-hidden border border-core-border">
              <img
                src={image.preview}
                alt="Preview"
                className="w-full h-[220px] object-cover object-top block"
              />
              <button
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 px-[10px] py-1 bg-black/70 text-core-red border-none rounded-md text-[11px] font-bold cursor-pointer hover:bg-black/90 transition-colors"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-[14px] border-t border-core-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-transparent border border-core-border rounded-lg text-core-text-dim cursor-pointer text-xs hover:text-core-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => image && onSubmit(image)}
            disabled={!canSubmit}
            className={[
              'px-[18px] py-2 border-none rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
              canSubmit
                ? 'bg-core-purple text-white cursor-pointer hover:opacity-90'
                : 'bg-core-card text-core-text-muted cursor-not-allowed',
            ].join(' ')}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze & Optimize'}
          </button>
        </div>
      </div>
    </div>
  )
}
