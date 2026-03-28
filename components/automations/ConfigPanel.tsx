'use client'

import { getCapability } from './capabilities'
import type { CapabilityNodeType } from './CapabilityNode'

interface ConfigPanelProps {
  node: CapabilityNodeType;
  onUpdate: (nodeId: string, config: Record<string, string>) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

export default function ConfigPanel({ node, onUpdate, onClose, onDelete }: ConfigPanelProps) {
  const cap = getCapability(node.data.capabilityId)
  const config = node.data.config || {}

  function handleChange(key: string, value: string) {
    onUpdate(node.id, { ...config, [key]: value })
  }

  return (
    <div style={{
      width: 300,
      background: '#0e1825',
      borderLeft: '1px solid #1c2b42',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #1c2b42',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{node.data.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e8ecf2', fontFamily: '-apple-system, sans-serif' }}>Configure</span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#556880', cursor: 'pointer', fontSize: 18,
        }}>×</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Name + Description */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e8ecf2', marginBottom: 4, fontFamily: '-apple-system, sans-serif' }}>{node.data.name}</div>
          <div style={{ fontSize: 13, color: '#556880', lineHeight: 1.5, fontFamily: '-apple-system, sans-serif' }}>{node.data.description}</div>
        </div>

        {/* What this does */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: node.data.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: '-apple-system, sans-serif' }}>
            What happens
          </div>
          {node.data.steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0',
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: 6,
                background: `${node.data.color}20`,
                color: node.data.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, flexShrink: 0,
                fontFamily: '-apple-system, sans-serif',
              }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: '#8b9ab5', lineHeight: 1.4, fontFamily: '-apple-system, sans-serif' }}>{step}</span>
            </div>
          ))}
        </div>

        {/* Config fields */}
        {cap?.configFields && cap.configFields.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: '#2dd4bf', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: '-apple-system, sans-serif' }}>
              Settings
            </div>
            {cap.configFields.map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#8b9ab5', marginBottom: 4, fontWeight: 600, fontFamily: '-apple-system, sans-serif' }}>
                  {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={config[field.key] || field.default || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px',
                      background: '#141e30', border: '1px solid #1c2b42', borderRadius: 8,
                      color: '#e8ecf2', fontSize: 13, outline: 'none',
                      fontFamily: '-apple-system, sans-serif',
                    }}
                  >
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    value={config[field.key] || field.default || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{
                      width: '100%', padding: '9px 12px',
                      background: '#141e30', border: '1px solid #1c2b42', borderRadius: 8,
                      color: '#e8ecf2', fontSize: 13, outline: 'none',
                      fontFamily: '-apple-system, sans-serif',
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={config[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{
                      width: '100%', padding: '9px 12px',
                      background: '#141e30', border: '1px solid #1c2b42', borderRadius: 8,
                      color: '#e8ecf2', fontSize: 13, outline: 'none',
                      fontFamily: '-apple-system, sans-serif',
                    }}
                    onFocus={e => e.target.style.borderColor = '#2dd4bf'}
                    onBlur={e => e.target.style.borderColor = '#1c2b42'}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #1c2b42',
        display: 'flex',
        gap: 8,
      }}>
        <button
          onClick={() => onDelete(node.id)}
          style={{
            padding: '9px 16px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8,
            color: '#f87171',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: '-apple-system, sans-serif',
          }}
        >Delete</button>
      </div>
    </div>
  )
}
