'use client'

import { useState, type DragEvent } from 'react'
import { ChevronRight } from 'lucide-react'
import { CATEGORIES, CAPABILITIES, getCapabilitiesByCategory } from './capabilities'
import { LUCIDE_ICONS } from './CapabilityNode'

interface PaletteProps {
  size?: 'expand' | 'compact';
}

export default function CapabilityPalette({ size = 'expand' }: PaletteProps) {
  const [search, setSearch] = useState('')
  const [expandedCat, setExpandedCat] = useState<string | null>('triggers')
  const [focusedInput, setFocusedInput] = useState(false)
  const isCompact = size === 'compact'

  const filtered = search
    ? CAPABILITIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())
      )
    : null

  function onDragStart(e: DragEvent, capabilityId: string) {
    const cap = CAPABILITIES.find(c => c.id === capabilityId)
    if (!cap) return
    e.dataTransfer.setData('application/0n-capability', JSON.stringify(cap))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className="bg-core-surface border-l border-[#1c2b42] flex flex-col h-full shrink-0"
      style={{ width: isCompact ? 200 : 280 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1c2b42]">
        <div className={`text-sm font-bold text-core-text ${isCompact ? '' : 'mb-2.5'}`}>
          Menu
        </div>
        {!isCompact && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search capabilities..."
            className="w-full px-3 py-[9px] bg-core-card border rounded-lg text-core-text text-[13px] outline-none transition-colors duration-150"
            style={{
              borderColor: focusedInput ? '#14b8a6' : '#1c2b42',
            }}
            onFocus={() => setFocusedInput(true)}
            onBlur={() => setFocusedInput(false)}
          />
        )}
      </div>

      {/* Categories + Items */}
      <div className="flex-1 overflow-y-auto py-2">
        {search && filtered ? (
          // Search results
          <div className="px-3">
            <div className="text-[11px] text-core-text-muted px-1 pb-2 pt-1">
              {filtered.length} results
            </div>
            {filtered.map(cap => (
              <CapItem
                key={cap.id}
                cap={cap}
                onDragStart={onDragStart}
                showDescription
              />
            ))}
          </div>
        ) : (
          // Category accordion
          CATEGORIES.map(cat => {
            const items = getCapabilitiesByCategory(cat.id)
            const isOpen = expandedCat === cat.id

            return (
              <div key={cat.id}>
                <button
                  onClick={() => setExpandedCat(isOpen ? null : cat.id)}
                  className="w-full px-4 py-2.5 bg-transparent border-none flex items-center gap-2.5 cursor-pointer"
                >
                  {(() => { const CatIcon = LUCIDE_ICONS[cat.icon]; return CatIcon ? <CatIcon className="w-4 h-4 shrink-0" style={{ color: cat.color }} /> : <span className="text-base shrink-0">{cat.icon}</span> })()}
                  <span
                    className="text-[13px] font-semibold flex-1 text-left"
                    style={{ color: isOpen ? cat.color : '#9ca3af' }}
                  >
                    {cat.name}
                  </span>
                  <span className="text-[11px] text-core-text-muted">{items.length}</span>
                  <ChevronRight
                    className="w-3 h-3 text-core-text-muted transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}
                  />
                </button>

                {isOpen && (
                  <div className="px-3 pb-2">
                    {items.map(cap => (
                      <CapItem
                        key={cap.id}
                        cap={cap}
                        onDragStart={onDragStart}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Drag hint */}
      <div className="px-4 py-3 border-t border-[#1c2b42] text-[11px] text-core-text-muted text-center">
        Drag onto canvas
      </div>
    </div>
  )
}

interface CapItemProps {
  cap: typeof CAPABILITIES[number];
  onDragStart: (e: DragEvent, id: string) => void;
  showDescription?: boolean;
  compact?: boolean;
}

function CapItem({ cap, onDragStart, showDescription, compact }: CapItemProps) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, cap.id)}
      className={`bg-core-card border border-transparent rounded-[10px] cursor-grab transition-all duration-150 flex gap-2.5 ${
        showDescription ? 'p-3 mb-1.5 items-start' : 'p-2.5 mb-1 items-center'
      }`}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = showDescription ? cap.color : `${cap.color}40`
        e.currentTarget.style.background = '#1a2740'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'transparent'
        e.currentTarget.style.background = ''
      }}
    >
      {(() => { const CapIcon = LUCIDE_ICONS[cap.icon]; return CapIcon ? <CapIcon className={`shrink-0 ${showDescription ? 'w-5 h-5 mt-0.5' : 'w-4 h-4'}`} style={{ color: cap.color }} /> : <span className={`shrink-0 ${showDescription ? 'text-lg mt-0.5' : 'text-base'}`}>{cap.icon}</span> })()}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-core-text mb-0.5">{cap.name}</div>
        {showDescription && (
          <div className="text-[11px] text-core-text-muted leading-snug">{cap.description}</div>
        )}
        {compact && (
          <div className="text-[11px] text-core-text-muted truncate">{cap.description}</div>
        )}
      </div>
    </div>
  )
}
