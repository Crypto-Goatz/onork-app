'use client'

import { useState } from 'react'
import { X, Settings, Bell, ShieldAlert, Tag } from 'lucide-react'

export interface WorkflowSettings {
  name: string
  description: string
  errorPolicy: 'stop' | 'continue' | 'retry'
  retryCount: number
  notifyOnError: boolean
  notifyOnSuccess: boolean
  notifySlackChannel: string
  notifyEmail: string
  tags: string[]
  enabled: boolean
}

export const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
  name: '',
  description: '',
  errorPolicy: 'stop',
  retryCount: 0,
  notifyOnError: false,
  notifyOnSuccess: false,
  notifySlackChannel: '',
  notifyEmail: '',
  tags: [],
  enabled: true,
}

interface WorkflowSettingsModalProps {
  settings: WorkflowSettings
  onSave: (next: WorkflowSettings) => void
  onClose: () => void
}

export default function WorkflowSettingsModal({ settings, onSave, onClose }: WorkflowSettingsModalProps) {
  const [draft, setDraft] = useState<WorkflowSettings>(settings)
  const [tagInput, setTagInput] = useState('')

  function update<K extends keyof WorkflowSettings>(key: K, value: WorkflowSettings[K]) {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  function addTag() {
    const t = tagInput.trim()
    if (!t || draft.tags.includes(t)) return
    setDraft(prev => ({ ...prev, tags: [...prev.tags, t] }))
    setTagInput('')
  }

  function removeTag(tag: string) {
    setDraft(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#0d1117] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#7ed957]" />
            <div>
              <h3 className="text-[14px] font-bold text-white">Workflow Settings</h3>
              <p className="text-[11px] text-white/40">Configure name, error handling, and notifications</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] bg-transparent border-none cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[65vh] overflow-y-auto space-y-5">
          {/* Identity */}
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-3">Identity</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Name</label>
                <input
                  value={draft.name}
                  onChange={e => update('name', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-[13px] outline-none focus:border-[#7ed957]/30"
                />
              </div>
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Description</label>
                <textarea
                  value={draft.description}
                  onChange={e => update('description', e.target.value)}
                  rows={2}
                  placeholder="What does this workflow do?"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-[13px] placeholder:text-white/15 outline-none focus:border-[#7ed957]/30 resize-none"
                />
              </div>
            </div>
          </section>

          {/* Error handling */}
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" /> Error Handling
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-white/60 mb-1">When a step fails</label>
                <select
                  value={draft.errorPolicy}
                  onChange={e => update('errorPolicy', e.target.value as WorkflowSettings['errorPolicy'])}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-[13px] outline-none focus:border-[#7ed957]/30 cursor-pointer [&>option]:bg-[#0d1117] [&>option]:text-white"
                >
                  <option value="stop">Stop the workflow</option>
                  <option value="continue">Continue to next step</option>
                  <option value="retry">Retry the failing step</option>
                </select>
              </div>
              {draft.errorPolicy === 'retry' && (
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Retry count</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={draft.retryCount}
                    onChange={e => update('retryCount', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-[13px] outline-none focus:border-[#7ed957]/30"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
              <Bell className="w-3 h-3" /> Notifications
            </h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.notifyOnError}
                  onChange={e => update('notifyOnError', e.target.checked)}
                  className="w-4 h-4 accent-[#7ed957]"
                />
                <span className="text-[12px] text-white/70">Notify on error</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.notifyOnSuccess}
                  onChange={e => update('notifyOnSuccess', e.target.checked)}
                  className="w-4 h-4 accent-[#7ed957]"
                />
                <span className="text-[12px] text-white/70">Notify on success</span>
              </label>
              {(draft.notifyOnError || draft.notifyOnSuccess) && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-white/50 mb-1">Email</label>
                    <input
                      type="email"
                      value={draft.notifyEmail}
                      onChange={e => update('notifyEmail', e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.06] text-white text-[11px] placeholder:text-white/15 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/50 mb-1">Slack channel</label>
                    <input
                      value={draft.notifySlackChannel}
                      onChange={e => update('notifySlackChannel', e.target.value)}
                      placeholder="#automations"
                      className="w-full px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.06] text-white text-[11px] placeholder:text-white/15 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Tags */}
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Tags
            </h4>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.tags.map(t => (
                <button
                  key={t}
                  onClick={() => removeTag(t)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#7ed957]/15 text-[#7ed957] border border-[#7ed957]/30 cursor-pointer hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/30 transition-colors"
                >
                  {t} ×
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag and press Enter"
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-[12px] placeholder:text-white/15 outline-none focus:border-[#7ed957]/30"
              />
              <button
                onClick={addTag}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] border-none text-white/70 text-[11px] cursor-pointer hover:bg-white/[0.1]"
              >
                Add
              </button>
            </div>
          </section>

          {/* Enabled */}
          <section className="pt-2 border-t border-white/[0.06]">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-[12px] font-semibold text-white/80">Workflow enabled</div>
                <div className="text-[10px] text-white/40">Disable to pause without deleting</div>
              </div>
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={e => update('enabled', e.target.checked)}
                className="w-5 h-5 accent-[#7ed957]"
              />
            </label>
          </section>
        </div>

        <div className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/[0.06] text-white/40 text-[12px] bg-transparent hover:text-white/70 cursor-pointer transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="px-4 py-2 rounded-lg bg-[#7ed957] text-[#020810] text-[12px] font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
