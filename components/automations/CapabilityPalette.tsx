'use client'

import { useState, type DragEvent } from 'react'
import { CATEGORIES, CAPABILITIES, getCapabilitiesByCategory } from './capabilities'

export default function CapabilityPalette() {
  const [search, setSearch] = useState('')
  const [expandedCat, setExpandedCat] = useState<string | null>('triggers')

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
    <div style={{
      width: 280,
      background: '#0e1825',
      borderRight: '1px solid #1c2b42',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1c2b42' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#e8ecf2', marginBottom: 10, fontFamily: '-apple-system, sans-serif' }}>
          Capabilities
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search capabilities..."
          style={{
            width: '100%',
            padding: '9px 12px',
            background: '#141e30',
            border: '1px solid #1c2b42',
            borderRadius: 8,
            color: '#e8ecf2',
            fontSize: 13,
            outline: 'none',
            fontFamily: '-apple-system, sans-serif',
          }}
          onFocus={e => e.target.style.borderColor = '#2dd4bf'}
          onBlur={e => e.target.style.borderColor = '#1c2b42'}
        />
      </div>

      {/* Categories + Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {search && filtered ? (
          // Search results
          <div style={{ padding: '0 12px' }}>
            <div style={{ fontSize: 11, color: '#556880', padding: '4px 4px 8px', fontFamily: '-apple-system, sans-serif' }}>
              {filtered.length} results
            </div>
            {filtered.map(cap => (
              <div
                key={cap.id}
                draggable
                onDragStart={e => onDragStart(e, cap.id)}
                style={{
                  padding: '10px 12px',
                  background: '#141e30',
                  border: '1px solid #1c2b42',
                  borderRadius: 10,
                  marginBottom: 6,
                  cursor: 'grab',
                  transition: 'all 0.15s',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = cap.color
                  e.currentTarget.style.background = '#1a2740'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#1c2b42'
                  e.currentTarget.style.background = '#141e30'
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{cap.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e8ecf2', marginBottom: 2, fontFamily: '-apple-system, sans-serif' }}>{cap.name}</div>
                  <div style={{ fontSize: 11, color: '#556880', lineHeight: 1.4, fontFamily: '-apple-system, sans-serif' }}>{cap.description}</div>
                </div>
              </div>
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
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    fontFamily: '-apple-system, sans-serif',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isOpen ? cat.color : '#8b9ab5', flex: 1, textAlign: 'left' }}>
                    {cat.name}
                  </span>
                  <span style={{ fontSize: 11, color: '#556880' }}>{items.length}</span>
                  <span style={{ color: '#556880', fontSize: 12, transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 12px 8px' }}>
                    {items.map(cap => (
                      <div
                        key={cap.id}
                        draggable
                        onDragStart={e => onDragStart(e, cap.id)}
                        style={{
                          padding: '10px 12px',
                          background: '#141e30',
                          border: '1px solid transparent',
                          borderRadius: 10,
                          marginBottom: 4,
                          cursor: 'grab',
                          transition: 'all 0.15s',
                          display: 'flex',
                          gap: 10,
                          alignItems: 'center',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = `${cap.color}40`
                          e.currentTarget.style.background = '#1a2740'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'transparent'
                          e.currentTarget.style.background = '#141e30'
                        }}
                      >
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{cap.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#e8ecf2', fontFamily: '-apple-system, sans-serif' }}>{cap.name}</div>
                          <div style={{ fontSize: 11, color: '#556880', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: '-apple-system, sans-serif' }}>{cap.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Drag hint */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #1c2b42',
        fontSize: 11,
        color: '#556880',
        textAlign: 'center',
        fontFamily: '-apple-system, sans-serif',
      }}>
        Drag capabilities onto the canvas →
      </div>
    </div>
  )
}
