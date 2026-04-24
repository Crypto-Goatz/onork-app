'use client'

import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  content: string
  title?: string
  useCase?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  size?: 'sm' | 'md'
}

export function InfoTooltip({ content, title, useCase, position = 'top', size = 'sm' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`inline-flex items-center justify-center rounded-full text-white/20 hover:text-[#6EE05A]/60 transition-colors bg-transparent border-none cursor-help ${
          size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
        }`}
      >
        <HelpCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>

      {open && (
        <div className={`absolute z-[9999] ${positionClasses[position]} w-64 animate-in fade-in zoom-in-95 duration-150`}>
          <div className="bg-[#161b22] border border-white/[0.1] rounded-xl p-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
            {title && (
              <div className="text-[11px] font-bold text-[#6EE05A] uppercase tracking-wider mb-1.5">{title}</div>
            )}
            <p className="text-[12px] text-white/60 leading-relaxed">{content}</p>
            {useCase && (
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                <p className="text-[11px] text-white/35 leading-relaxed">
                  <span className="text-[#00d4ff] font-semibold">Example:</span> {useCase}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
