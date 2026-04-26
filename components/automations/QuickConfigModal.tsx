'use client'

import { useState } from 'react'
import { X, Sparkles, Loader2, Check } from 'lucide-react'
import { getCapability } from './capabilities'
import type { CapabilityNodeType } from './CapabilityNode'

interface QuickConfigModalProps {
  node: CapabilityNodeType
  onSave: (nodeId: string, config: Record<string, string>) => void
  onSkip: () => void
  onAIFill?: (nodeId: string, capabilityId: string) => Promise<Record<string, string> | null>
}

// Friendly question overrides per capability
const FRIENDLY_QUESTIONS: Record<string, Record<string, string>> = {
  wp_create_post: { post_type: 'What type of content?', status: 'Publish immediately or save as draft?' },
  wp_install_plugin: { slug: 'What plugin do you want to install?', activate: 'Activate it right away?' },
  send_email: { subject: 'What should the subject line be?', body: 'What do you want to say?', from: 'Send from which email?', ai_generate: 'Want AI to write the email body?' },
  send_email_template: { template_id: 'Which email template should we use?' },
  start_email_campaign: { template: 'Which campaign template?', delay: 'How long between emails?' },
  send_sms: { message: 'What message do you want to send?' },
  sheets_read: { spreadsheet_id: 'Which spreadsheet? (paste the ID from the URL)', range: 'What range to read?' },
  sheets_append: { spreadsheet_id: 'Which spreadsheet?', range: 'Where should we add rows?' },
  sheets_write: { spreadsheet_id: 'Which spreadsheet?', range: 'What cells to write to?' },
  sheets_log_lead: { spreadsheet_id: 'Which sheet logs your leads?' },
  sheets_export_report: { spreadsheet_id: 'Where should the report go?', report_type: 'What kind of report?' },
  wp_seo_update: {},
  wp_bulk_content: {},
  ai_score_lead: {},
  ai_generate_content: { prompt: 'What should the AI write about?' },
  book_appointment: { calendar: 'Which calendar?', duration: 'How long is the appointment?' },
  trigger_new_lead: {},
  trigger_form_submit: {},
}

export default function QuickConfigModal({ node, onSave, onSkip, onAIFill }: QuickConfigModalProps) {
  const cap = getCapability(node.data.capabilityId)
  const fields = cap?.configFields || []
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    fields.forEach(f => { if (f.default) initial[f.key] = f.default })
    return { ...initial, ...(node.data.config || {}) }
  })
  const [aiLoading, setAiLoading] = useState(false)

  // If no config fields, auto-skip
  if (fields.length === 0) {
    // Use setTimeout to avoid calling during render
    setTimeout(() => onSkip(), 0)
    return null
  }

  const friendlyQuestions = FRIENDLY_QUESTIONS[node.data.capabilityId] || {}

  function handleChange(key: string, value: string) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  async function handleAIFill() {
    if (!onAIFill) return
    setAiLoading(true)
    const suggested = await onAIFill(node.id, node.data.capabilityId)
    if (suggested) {
      setConfig(prev => ({ ...prev, ...suggested }))
    }
    setAiLoading(false)
  }

  function handleSave() {
    onSave(node.id, config)
  }

  const allRequiredFilled = fields
    .filter(f => f.required)
    .every(f => config[f.key]?.trim())

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-md bg-[#0d1117] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)] animate-[scaleIn_0.2s_ease-out]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#7ed957]" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-white">{node.data.name}</h3>
              <p className="text-[11px] text-white/30">Configure this step</p>
            </div>
          </div>
          <button onClick={onSkip} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all bg-transparent border-none cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {fields.map(field => {
            const question = friendlyQuestions[field.key] || field.label
            return (
              <div key={field.key}>
                <label className="block text-[12px] text-white/60 mb-1.5 font-medium">
                  {question}
                  {field.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={config[field.key] || field.default || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] outline-none focus:border-[#7ed957]/30 appearance-none cursor-pointer [&>option]:bg-[#0d1117] [&>option]:text-white"
                  >
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'toggle' ? (
                  <button
                    onClick={() => handleChange(field.key, config[field.key] === 'true' ? 'false' : 'true')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-[13px] cursor-pointer transition-all ${
                      config[field.key] === 'true'
                        ? 'bg-[#7ed957]/10 border-[#7ed957]/30 text-[#7ed957]'
                        : 'bg-white/[0.02] border-white/[0.06] text-white/40'
                    }`}
                  >
                    <Check className={`w-4 h-4 ${config[field.key] === 'true' ? 'opacity-100' : 'opacity-20'}`} />
                    {config[field.key] === 'true' ? 'Yes' : 'No'}
                  </button>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={config[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    autoFocus={fields.indexOf(field) === 0}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] placeholder:text-white/15 outline-none focus:border-[#7ed957]/30 transition-colors"
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
          {onAIFill && (
            <button onClick={handleAIFill} disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-[12px] font-medium cursor-pointer hover:bg-[#00d4ff]/20 transition-colors disabled:opacity-50">
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Ask Jaxx
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onSkip}
              className="px-4 py-2 rounded-lg border border-white/[0.06] text-white/40 text-[12px] bg-transparent hover:text-white/60 cursor-pointer transition-colors">
              Skip
            </button>
            <button onClick={handleSave} disabled={!allRequiredFilled}
              className="px-4 py-2 rounded-lg bg-[#7ed957] text-[#020810] text-[12px] font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-30">
              Done
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  )
}
