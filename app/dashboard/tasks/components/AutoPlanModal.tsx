'use client'

import { useState } from 'react'
import { Sparkles, X, Info } from 'lucide-react'

interface AutoPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (text: string) => void
  isProcessing: boolean
}

export default function AutoPlanModal({ isOpen, onClose, onSubmit, isProcessing }: AutoPlanModalProps) {
  const [text, setText] = useState('')

  if (!isOpen) return null

  const canSubmit = text.trim() && !isProcessing

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-core-surface border border-core-border rounded-[14px] w-full max-w-[620px] flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-[18px] border-b border-core-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-core-green to-blue-500 flex items-center justify-center text-white shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="m-0 text-base font-extrabold text-core-text">Auto-Plan Brain Dump</h3>
              <p className="m-0 text-[11px] text-core-text-muted">Paste a list, a rough plan, or random thoughts. AI will sort it out.</p>
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
        <div className="p-5 flex-1 flex flex-col">
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={isProcessing}
            placeholder={'Example:\n- Redesign the website for Acme Corp\n- Need to get credentials from Bob\n- Create a new project called "Marketing 2025"\n- Follow up with Jane about the logo'}
            className="flex-1 min-h-[180px] w-full p-[14px] bg-core-bg border border-core-border rounded-[10px] text-core-text text-[13px] leading-relaxed resize-none outline-none font-inherit box-border disabled:opacity-50"
          />
          <div className="mt-3 bg-blue-500/10 px-[14px] py-[10px] rounded-lg flex gap-2 items-start">
            <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="m-0 text-[11px] text-blue-400 leading-relaxed">
              AI will analyze this text to automatically create Clients, Projects, and Tasks. It may take a moment to generate the structure.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-[14px] border-t border-core-border flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-[18px] py-2 bg-transparent border border-core-border rounded-lg text-core-text-dim cursor-pointer text-xs font-semibold hover:text-core-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(text)}
            disabled={!canSubmit}
            className={[
              'px-5 py-2 border-none rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
              canSubmit
                ? 'bg-gradient-to-br from-core-green to-blue-500 text-white cursor-pointer'
                : 'bg-core-card text-core-text-muted cursor-not-allowed',
            ].join(' ')}
          >
            {isProcessing ? 'Processing...' : 'Generate Plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
