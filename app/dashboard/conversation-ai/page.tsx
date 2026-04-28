'use client'

import { useEffect, useState } from 'react'
import { Bot, Save, Shield, Wand2, Zap, Activity, AlertCircle, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface JaxxConfig {
  enabled: boolean
  allowed_actions: string[]
  automation_can_generate: boolean
  automation_can_test: boolean
  automation_can_activate: boolean
  automation_can_run: boolean
  auto_execute: boolean
  business_hours_only: boolean
  business_hours_start: string
  business_hours_end: string
  excluded_tags: string[]
  max_actions_per_conversation: number
  daily_message_cap: number
  per_contact_hourly_cap: number
  system_prompt_override: string | null
}

interface LogRow {
  id: string
  conversation_id: string
  contact_id: string | null
  surface: string
  trust_score: number
  iky_triggered: boolean
  iky_outcome: string | null
  inbound_message: string
  ai_response_redacted: string
  tool_calls: unknown[]
  required_confirmation: boolean
  latency_ms: number
  status: string
  responded_at: string
}

export default function ConversationAIPage() {
  const [config, setConfig] = useState<JaxxConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [activeTab, setActiveTab] = useState<'settings' | 'logs'>('settings')

  async function loadConfig() {
    setLoading(true)
    try {
      const res = await fetch('/api/conversation-ai/config')
      if (!res.ok) {
        toast.error('Failed to load config')
        return
      }
      setConfig(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function loadLogs() {
    const res = await fetch('/api/conversation-ai/logs?limit=50')
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs ?? [])
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    if (activeTab === 'logs') loadLogs()
  }, [activeTab])

  async function save() {
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch('/api/conversation-ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        toast.error('Save failed')
        return
      }
      toast.success('Settings saved')
    } finally {
      setSaving(false)
    }
  }

  function toggleAction(action: 'knowledge' | 'automation') {
    if (!config) return
    const has = config.allowed_actions.includes(action)
    setConfig({
      ...config,
      allowed_actions: has
        ? config.allowed_actions.filter((a) => a !== action)
        : [...config.allowed_actions, action],
    })
  }

  if (loading || !config) {
    return <div className="p-6 text-white/60">Loading…</div>
  }

  return (
    <div className="px-6 py-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-[#7ed957]" />
            Jaxx — Conversation AI
          </h1>
          <p className="text-sm text-white/55 mt-1">
            Your AI operator. Answers questions by default. Executes automations when you give it permission.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-white/10">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-[#7ed957] text-white'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-[#7ed957] text-white'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          Recent activity
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="space-y-4">
          {/* Master switch */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#7ed957]" />
                  Jaxx is {config.enabled ? 'on' : 'off'}
                </div>
                <p className="text-sm text-white/55 mt-1">
                  When off, Jaxx ignores all inbound messages.
                </p>
              </div>
              <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
            </div>
          </Card>

          {/* Action surface */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-blue-400" />
              <div className="font-semibold">What Jaxx can do</div>
            </div>
            <p className="text-sm text-white/55 mb-4">
              Knowledge answers are always on. Automation is opt-in per category — Jaxx can never act outside what you allow here.
            </p>

            <div className="space-y-3">
              <Row
                label="Answer questions"
                desc="Help, troubleshooting, navigation, explanations. Read-only."
                checked={config.allowed_actions.includes('knowledge')}
                onChange={() => toggleAction('knowledge')}
              />

              <div className="border-t border-white/10 pt-3 mt-3">
                <Row
                  label="Build automations"
                  desc="Master switch — when on, the four automation actions below become available."
                  checked={config.allowed_actions.includes('automation')}
                  onChange={() => toggleAction('automation')}
                />

                {config.allowed_actions.includes('automation') && (
                  <div className="mt-3 ml-4 space-y-2 border-l-2 border-white/10 pl-4">
                    <Row
                      label="Generate workflows from natural language"
                      desc="Non-mutating. Returns a draft .0n workflow."
                      checked={config.automation_can_generate}
                      onChange={(v) => setConfig({ ...config, automation_can_generate: v })}
                    />
                    <Row
                      label="Test workflows (dry run)"
                      desc="Non-mutating. Returns the step plan with resolved variables."
                      checked={config.automation_can_test}
                      onChange={(v) => setConfig({ ...config, automation_can_test: v })}
                    />
                    <Row
                      label="Save + activate workflows"
                      desc="Mutating. Always asks for confirmation first unless auto-execute is on."
                      checked={config.automation_can_activate}
                      onChange={(v) => setConfig({ ...config, automation_can_activate: v })}
                    />
                    <Row
                      label="Run / disable saved workflows"
                      desc="Mutating. Always asks for confirmation first unless auto-execute is on."
                      checked={config.automation_can_run}
                      onChange={(v) => setConfig({ ...config, automation_can_run: v })}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Auto-execute */}
          <Card className="p-5">
            <Row
              label="Auto-execute (skip the 'yes' confirmation)"
              desc="Power-user mode. Jaxx will run mutating actions without asking. Off by default — recommended."
              checked={config.auto_execute}
              onChange={(v) => setConfig({ ...config, auto_execute: v })}
              warn={config.auto_execute}
            />
          </Card>

          {/* Limits */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-yellow-400" />
              <div className="font-semibold">Limits</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Daily message cap (per location)</Label>
                <Input
                  type="number"
                  value={config.daily_message_cap}
                  onChange={(e) =>
                    setConfig({ ...config, daily_message_cap: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Hourly cap (per contact)</Label>
                <Input
                  type="number"
                  value={config.per_contact_hourly_cap}
                  onChange={(e) =>
                    setConfig({ ...config, per_contact_hourly_cap: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Max actions per conversation</Label>
                <Input
                  type="number"
                  value={config.max_actions_per_conversation}
                  onChange={(e) =>
                    setConfig({ ...config, max_actions_per_conversation: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </Card>

          {/* Business hours */}
          <Card className="p-5">
            <Row
              label="Only respond during business hours"
              desc="Outside this window, Jaxx silently ignores inbound messages."
              checked={config.business_hours_only}
              onChange={(v) => setConfig({ ...config, business_hours_only: v })}
            />
            {config.business_hours_only && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <Label>Start (HH:MM)</Label>
                  <Input
                    value={config.business_hours_start}
                    onChange={(e) => setConfig({ ...config, business_hours_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End (HH:MM)</Label>
                  <Input
                    value={config.business_hours_end}
                    onChange={(e) => setConfig({ ...config, business_hours_end: e.target.value })}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Custom prompt */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="h-4 w-4 text-purple-400" />
              <div className="font-semibold">Custom instructions (optional)</div>
            </div>
            <p className="text-sm text-white/55 mb-3">
              Append your own voice / playbook. Disclosure rules and IKY behavior stay enforced regardless.
            </p>
            <textarea
              value={config.system_prompt_override ?? ''}
              onChange={(e) => setConfig({ ...config, system_prompt_override: e.target.value || null })}
              placeholder="e.g. 'You're the AI for Acme Corp. Always mention our 30-day money-back guarantee.'"
              className="w-full min-h-[120px] bg-white/[0.02] border border-white/10 rounded-md p-3 text-sm font-mono"
            />
          </Card>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-2">
          {logs.length === 0 && (
            <div className="text-sm text-white/40 py-8 text-center">No interactions yet.</div>
          )}
          {logs.map((log) => (
            <Card key={log.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-white/40">{new Date(log.responded_at).toLocaleString()}</span>
                  <StatusBadge status={log.status} />
                  {log.iky_triggered && (
                    <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px] uppercase font-semibold">
                      IKY {log.iky_outcome}
                    </span>
                  )}
                  <span className="text-white/40">trust {log.trust_score}</span>
                  <span className="text-white/40">{log.latency_ms}ms</span>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="text-white/70">
                  <span className="text-white/40 mr-2">user:</span>
                  {log.inbound_message}
                </div>
                <div className="text-white">
                  <span className="text-white/40 mr-2">jaxx:</span>
                  {log.ai_response_redacted}
                </div>
                {log.tool_calls && Array.isArray(log.tool_calls) && log.tool_calls.length > 0 && (
                  <div className="text-xs text-blue-300/70 mt-2">
                    tool calls: {log.tool_calls.map((t) => (t as { function?: { name: string } })?.function?.name ?? 'unknown').join(', ')}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  desc,
  checked,
  onChange,
  warn,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
  warn?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className={`font-medium text-sm flex items-center gap-2 ${warn ? 'text-yellow-300' : ''}`}>
          {warn && <AlertCircle className="h-3.5 w-3.5" />}
          {label}
        </div>
        <p className="text-xs text-white/55 mt-0.5">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ok: 'bg-green-500/20 text-green-300',
    rate_limited: 'bg-orange-500/20 text-orange-300',
    iky_locked: 'bg-red-500/20 text-red-300',
    disclosure_blocked: 'bg-red-500/20 text-red-300',
    error: 'bg-red-500/20 text-red-300',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${styles[status] ?? 'bg-white/10 text-white/60'}`}>
      {status}
    </span>
  )
}
