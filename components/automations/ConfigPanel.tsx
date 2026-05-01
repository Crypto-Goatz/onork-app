'use client'

import { useState } from 'react'
import { X, Trash2, Clock } from 'lucide-react'
import { getCapability } from './capabilities'
import type { CapabilityNodeType } from './CapabilityNode'
import {
  type DelayUnit,
  UNIT_SECONDS,
  UNIT_LABELS,
  fitDelay,
  fmtDelay,
  readDelaySeconds,
} from '@/lib/automations/delay'

interface ConfigPanelProps {
  node: CapabilityNodeType;
  onUpdate: (nodeId: string, config: Record<string, string>) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

export default function ConfigPanel({ node, onUpdate, onClose, onDelete }: ConfigPanelProps) {
  const cap = getCapability(node.data.capabilityId)
  const config = node.data.config || {}
  const isTrigger = cap?.category === 'triggers'
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const initialDelay = readDelaySeconds(config)
  const initialFit = fitDelay(initialDelay)
  const [delayValue, setDelayValue] = useState<number>(initialFit.value)
  const [delayUnit, setDelayUnit] = useState<DelayUnit>(initialFit.unit)

  function handleChange(key: string, value: string) {
    onUpdate(node.id, { ...config, [key]: value })
  }

  function handleDelayChange(nextValue: number, nextUnit: DelayUnit) {
    const safeValue = Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0
    setDelayValue(safeValue)
    setDelayUnit(nextUnit)
    const totalSeconds = Math.round(safeValue * UNIT_SECONDS[nextUnit])
    onUpdate(node.id, { ...config, delay_seconds: String(totalSeconds) })
  }

  return (
    <div className="w-[300px] bg-core-surface border-l border-[#1c2b42] flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-[#1c2b42] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">{node.data.icon}</span>
          <span className="text-sm font-bold text-core-text">Configure</span>
        </div>
        <button
          onClick={onClose}
          className="text-core-text-muted hover:text-core-text transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Name + Description */}
        <div className="mb-5">
          <div className="text-base font-bold text-core-text mb-1">{node.data.name}</div>
          <div className="text-[13px] text-core-text-muted leading-relaxed">{node.data.description}</div>
        </div>

        {/* What this does */}
        <div className="mb-6">
          <div
            className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2.5"
            style={{ color: node.data.color }}
          >
            What happens
          </div>
          {node.data.steps.map((step, i) => (
            <div key={i} className="flex gap-2.5 items-start py-1.5">
              <span
                className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[10px] font-extrabold shrink-0"
                style={{
                  background: `${node.data.color}20`,
                  color: node.data.color,
                }}
              >
                {i + 1}
              </span>
              <span className="text-[13px] text-core-text-dim leading-snug">{step}</span>
            </div>
          ))}
        </div>

        {/* Wait before this step — actions only */}
        {!isTrigger && (
          <div className="mb-6">
            <div className="text-[11px] text-core-cyan font-bold uppercase tracking-[0.06em] mb-3 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Wait before this step
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={delayValue}
                onChange={(e) => handleDelayChange(Number(e.target.value), delayUnit)}
                onFocus={() => setFocusedField('delay_value')}
                onBlur={() => setFocusedField(null)}
                className="w-[80px] px-3 py-[9px] bg-core-card border border-[#1c2b42] rounded-lg text-core-text text-[13px] outline-none transition-colors duration-150"
                style={{ borderColor: focusedField === 'delay_value' ? '#14b8a6' : '' }}
              />
              <select
                value={delayUnit}
                onChange={(e) => handleDelayChange(delayValue, e.target.value as DelayUnit)}
                className="flex-1 px-3 py-[9px] bg-core-card border border-[#1c2b42] rounded-lg text-core-text text-[13px] outline-none"
              >
                {(['s', 'm', 'h', 'd'] as DelayUnit[]).map((u) => (
                  <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                ))}
              </select>
            </div>
            <div className="mt-1.5 text-[11px] text-core-text-muted">
              {fmtDelay(Number(config.delay_seconds || 0))}
            </div>
          </div>
        )}

        {/* Config fields */}
        {cap?.configFields && cap.configFields.length > 0 && (
          <div>
            <div className="text-[11px] text-core-cyan font-bold uppercase tracking-[0.06em] mb-3">
              Settings
            </div>
            {cap.configFields.map(field => (
              <div key={field.key} className="mb-3.5">
                <label className="block text-xs text-core-text-dim mb-1 font-semibold">
                  {field.label}{' '}
                  {field.required && <span className="text-core-red">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={config[field.key] || field.default || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    className="w-full px-3 py-[9px] bg-core-card border border-[#1c2b42] rounded-lg text-core-text text-[13px] outline-none"
                  >
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    value={config[field.key] || field.default || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-[9px] bg-core-card border border-[#1c2b42] rounded-lg text-core-text text-[13px] outline-none transition-colors duration-150"
                    style={{ borderColor: focusedField === field.key ? '#14b8a6' : '' }}
                    onFocus={() => setFocusedField(field.key)}
                    onBlur={() => setFocusedField(null)}
                  />
                ) : (
                  <input
                    type="text"
                    value={config[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-[9px] bg-core-card border border-[#1c2b42] rounded-lg text-core-text text-[13px] outline-none transition-colors duration-150"
                    style={{ borderColor: focusedField === field.key ? '#14b8a6' : '' }}
                    onFocus={() => setFocusedField(field.key)}
                    onBlur={() => setFocusedField(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#1c2b42] flex gap-2">
        <button
          onClick={() => onDelete(node.id)}
          className="flex items-center gap-1.5 px-4 py-[9px] bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[13px] cursor-pointer hover:bg-red-500/20 transition-colors duration-150"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  )
}
