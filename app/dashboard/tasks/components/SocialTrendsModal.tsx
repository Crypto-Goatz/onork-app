'use client'

import { useState } from 'react'
import { TrendingUp, X, Plus, Info, Copy, Check } from 'lucide-react'

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

  const canGenerate = selectedTopics.length > 0 && !isProcessing

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-core-surface border border-core-border rounded-[14px] w-full max-w-[660px] flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-[18px] border-b border-core-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="m-0 text-base font-extrabold text-core-text">Social Viral Engine</h3>
              <p className="m-0 text-[11px] text-core-text-muted">Identify trends and generate algorithm-optimized posts.</p>
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
        <div className="flex-1 overflow-auto">
          {!generatedContent ? (
            <div className="p-5">
              <label className="block text-[10px] font-extrabold uppercase tracking-[1.2px] text-core-text-dim mb-[10px]">
                Select Trending Topics
              </label>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {DEFAULT_TOPICS.map(topic => {
                  const active = selectedTopics.includes(topic)
                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      className={[
                        'px-[14px] py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all duration-150',
                        active
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-core-border bg-transparent text-core-text-dim hover:border-blue-500/50',
                      ].join(' ')}
                    >
                      {topic}
                    </button>
                  )
                })}
              </div>

              <form onSubmit={addCustom} className="flex gap-2 mb-5">
                <input
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  placeholder="Add custom topic..."
                  className="flex-1 px-3 py-2 bg-core-bg border border-core-border rounded-lg text-core-text text-[13px] outline-none focus:border-blue-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!customTopic.trim()}
                  className="px-[14px] py-2 bg-white/5 text-core-text-dim border-none rounded-lg text-sm font-semibold cursor-pointer hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
                >
                  <Plus size={14} />
                </button>
              </form>

              <div className="bg-blue-500/10 px-4 py-3 rounded-[10px] border border-blue-500/20">
                <h4 className="m-0 mb-1 text-[13px] font-bold text-blue-400 flex items-center gap-1.5">
                  <Info size={13} />
                  How it works
                </h4>
                <p className="m-0 text-[11px] text-blue-400/80 leading-relaxed">
                  AI will scan for the latest viral conversations on your selected topics. It will then generate distinct post drafts optimized for maximum organic reach.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-core-bg">
              <div className="bg-core-surface p-5 rounded-[10px] border border-core-border whitespace-pre-wrap text-[13px] leading-[1.7] text-core-text">
                {generatedContent}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-[14px] border-t border-core-border flex justify-between items-center">
          {generatedContent ? (
            <>
              <button
                onClick={() => onSubmit([])}
                className="bg-transparent border-none text-core-text-dim cursor-pointer text-xs underline hover:text-core-text transition-colors"
              >
                Start Over
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-[14px] py-2 bg-white/5 border border-core-border rounded-lg text-core-text text-xs font-semibold cursor-pointer hover:bg-white/10 transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check size={13} className="text-core-green" /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy All'}
                </button>
                <button
                  onClick={onClose}
                  className="px-[14px] py-2 bg-blue-500 text-white border-none rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-600 transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-[11px] text-core-text-muted">{selectedTopics.length} topics selected</span>
              <button
                onClick={() => onSubmit(selectedTopics)}
                disabled={!canGenerate}
                className={[
                  'px-5 py-2 border-none rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                  canGenerate
                    ? 'bg-gradient-to-br from-blue-500 to-core-purple text-white cursor-pointer hover:opacity-90'
                    : 'bg-core-card text-core-text-muted cursor-not-allowed',
                ].join(' ')}
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
