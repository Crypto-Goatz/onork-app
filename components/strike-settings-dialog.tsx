'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  CheckSquare,
  StickyNote,
  Clock,
  Zap,
  Palette,
  Bell,
  Layout,
  Settings,
} from 'lucide-react'

export type StrikeSection = 'tasks' | 'notes' | 'clock' | 'focus'

interface StrikeConfig {
  sections: StrikeSection[]
  focusDuration: number
  taskSort: 'newest' | 'priority' | 'alpha'
  compactMode: boolean
  soundEnabled: boolean
  autoClearDone: boolean
  accentColor: string
}

const DEFAULT_CONFIG: StrikeConfig = {
  sections: ['tasks', 'notes'],
  focusDuration: 25,
  taskSort: 'newest',
  compactMode: false,
  soundEnabled: true,
  autoClearDone: false,
  accentColor: '#7ed957',
}

type SettingsPage = 'sections' | 'appearance' | 'behavior' | 'about'

const NAV_ITEMS: { id: SettingsPage; label: string; icon: React.ReactNode }[] = [
  { id: 'sections', label: 'Sections', icon: <Layout className="size-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="size-4" /> },
  { id: 'behavior', label: 'Behavior', icon: <Settings className="size-4" /> },
  { id: 'about', label: 'About', icon: <Zap className="size-4" /> },
]

const SECTION_META: { key: StrikeSection; label: string; description: string; icon: React.ReactNode }[] = [
  { key: 'tasks', label: 'Tasks', description: 'Track and manage your to-dos with priority levels', icon: <CheckSquare className="size-5" /> },
  { key: 'notes', label: 'Quick Notes', description: 'Capture ideas and snippets instantly', icon: <StickyNote className="size-5" /> },
  { key: 'clock', label: 'Clock', description: 'Live digital clock display', icon: <Clock className="size-5" /> },
  { key: 'focus', label: 'Focus Timer', description: 'Pomodoro-style countdown timer', icon: <Zap className="size-5" /> },
]

const ACCENT_PRESETS = [
  { color: '#7ed957', label: '0n Green' },
  { color: '#00d4ff', label: 'Cyan' },
  { color: '#a78bfa', label: 'Purple' },
  { color: '#f59e0b', label: 'Amber' },
  { color: '#ef4444', label: 'Red' },
  { color: '#ec4899', label: 'Pink' },
  { color: '#06b6d4', label: 'Teal' },
  { color: '#f97316', label: 'Orange' },
]

interface StrikeSettingsDialogProps {
  config: StrikeConfig
  onConfigChange: (config: StrikeConfig) => void
  trigger?: React.ReactNode
}

export function StrikeSettingsDialog({ config, onConfigChange, trigger }: StrikeSettingsDialogProps) {
  const [page, setPage] = useState<SettingsPage>('sections')
  const [draft, setDraft] = useState<StrikeConfig>(config)
  const [open, setOpen] = useState(false)

  function updateDraft(patch: Partial<StrikeConfig>) {
    setDraft(prev => ({ ...prev, ...patch }))
  }

  function toggleSection(key: StrikeSection) {
    const next = draft.sections.includes(key)
      ? draft.sections.filter(s => s !== key)
      : [...draft.sections, key]
    updateDraft({ sections: next })
  }

  function handleSave() {
    onConfigChange(draft)
    setOpen(false)
  }

  function handleOpen(o: boolean) {
    if (o) setDraft(config)
    setOpen(o)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={trigger as React.ReactElement || (
        <button className="bg-transparent border-none text-core-text-muted cursor-pointer p-1 rounded flex items-center hover:text-core-text transition-colors">
          <Settings className="size-4" />
        </button>
      )} />
      <DialogContent
        className="!max-w-2xl !p-0 overflow-hidden"
        showCloseButton={false}
      >
        <div className="flex h-[480px]">
          {/* ─── Sidebar Nav ─── */}
          <div className="w-[180px] shrink-0 border-r border-border bg-muted/30 p-3 flex flex-col gap-1">
            <DialogHeader className="px-2 pb-3">
              <DialogTitle className="text-sm font-bold tracking-tight">
                Strike Menu
              </DialogTitle>
              <DialogDescription className="text-[11px] leading-tight">
                Configure your command center
              </DialogDescription>
            </DialogHeader>

            <nav className="flex flex-col gap-0.5">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors text-left ${
                    page === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-auto px-2 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <div
                  className="size-2 rounded-full bg-primary"
                  style={{ ['--glow-color' as string]: draft.accentColor, boxShadow: '0 0 8px var(--glow-color)' }}
                />
                <span className="text-[10px] text-muted-foreground font-mono">
                  {draft.sections.length} active
                </span>
              </div>
            </div>
          </div>

          {/* ─── Content Panel ─── */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-5">
              {/* ═══ SECTIONS PAGE ═══ */}
              {page === 'sections' && (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold mb-1">Sections</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Choose what appears in your Strike Menu. Drag to reorder (coming soon).
                  </p>
                  <div className="space-y-2">
                    {SECTION_META.map(section => {
                      const active = draft.sections.includes(section.key)
                      return (
                        <div
                          key={section.key}
                          className={`flex items-center gap-3 rounded-xl border p-3.5 transition-all cursor-pointer ${
                            active
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border hover:border-border/80 hover:bg-muted/30'
                          }`}
                          onClick={() => toggleSection(section.key)}
                        >
                          <div className={`flex items-center justify-center size-9 rounded-lg transition-colors ${
                            active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {section.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold">{section.label}</div>
                            <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                              {section.description}
                            </div>
                          </div>
                          <Switch
                            checked={active}
                            onCheckedChange={() => toggleSection(section.key)}
                            size="sm"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ═══ APPEARANCE PAGE ═══ */}
              {page === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Appearance</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Customize the look and feel of your Strike Menu.
                    </p>
                  </div>

                  {/* Accent Color */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Accent Color
                    </Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {ACCENT_PRESETS.map(preset => (
                        <button
                          key={preset.color}
                          onClick={() => updateDraft({ accentColor: preset.color })}
                          className={`flex items-center gap-2 rounded-lg border p-2 transition-all text-left ${
                            draft.accentColor === preset.color
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-border/80'
                          }`}
                        >
                          <div
                            className={cn(
                              'size-4 rounded-full shrink-0',
                              draft.accentColor === preset.color && 'ring-2 ring-offset-1 ring-offset-core-card ring-white/20'
                            )}
                            style={{ background: preset.color }}
                          />
                          <span className="text-[11px] text-muted-foreground truncate">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Label htmlFor="custom-hex" className="text-[11px] text-muted-foreground shrink-0">
                        Custom
                      </Label>
                      <Input
                        id="custom-hex"
                        value={draft.accentColor}
                        onChange={e => updateDraft({ accentColor: e.target.value })}
                        className="font-mono text-xs h-7 w-28"
                        placeholder="#hex"
                      />
                      <div
                        className="size-5 rounded-md border border-border shrink-0"
                        style={{ background: draft.accentColor }}
                      />
                      {/* background is a dynamic user-selected hex — set via inline style intentionally */}
                    </div>
                  </div>

                  {/* Compact Mode */}
                  <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
                    <div>
                      <div className="text-[13px] font-semibold">Compact Mode</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Reduce padding and font sizes
                      </div>
                    </div>
                    <Switch
                      checked={draft.compactMode}
                      onCheckedChange={v => updateDraft({ compactMode: v as boolean })}
                      size="sm"
                    />
                  </div>
                </div>
              )}

              {/* ═══ BEHAVIOR PAGE ═══ */}
              {page === 'behavior' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Behavior</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Control how your Strike Menu works.
                    </p>
                  </div>

                  {/* Focus Duration */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Default Focus Duration
                    </Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[15, 25, 45, 60].map(m => (
                        <button
                          key={m}
                          onClick={() => updateDraft({ focusDuration: m })}
                          className={`rounded-lg border py-2 text-center text-sm font-semibold transition-all ${
                            draft.focusDuration === m
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Task Sort */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Task Sort Order
                    </Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {([
                        { key: 'newest', label: 'Newest' },
                        { key: 'priority', label: 'Priority' },
                        { key: 'alpha', label: 'A-Z' },
                      ] as const).map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => updateDraft({ taskSort: opt.key })}
                          className={`rounded-lg border py-2 text-center text-[13px] font-medium transition-all ${
                            draft.taskSort === opt.key
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle options */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
                      <div>
                        <div className="text-[13px] font-semibold flex items-center gap-2">
                          <Bell className="size-4 text-muted-foreground" />
                          Sound Effects
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 ml-6">
                          Play sound when focus timer completes
                        </div>
                      </div>
                      <Switch
                        checked={draft.soundEnabled}
                        onCheckedChange={v => updateDraft({ soundEnabled: v as boolean })}
                        size="sm"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
                      <div>
                        <div className="text-[13px] font-semibold flex items-center gap-2">
                          <CheckSquare className="size-4 text-muted-foreground" />
                          Auto-Clear Completed
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 ml-6">
                          Remove done tasks after 24 hours
                        </div>
                      </div>
                      <Switch
                        checked={draft.autoClearDone}
                        onCheckedChange={v => updateDraft({ autoClearDone: v as boolean })}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ ABOUT PAGE ═══ */}
              {page === 'about' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">About Strike Menu</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Your personal command center, always within reach.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Zap className="size-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">Strike Menu</div>
                        <div className="text-[11px] text-muted-foreground">v1.0.0 — 0nCore</div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground leading-relaxed">
                      Built to keep you in flow. Tasks, notes, timers, and more — all
                      accessible without leaving the board. Part of the 0nORK ecosystem.
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                        <div className="text-lg font-bold text-primary">{draft.sections.length}</div>
                        <div className="text-[10px] text-muted-foreground font-medium">Active Sections</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                        <div className="text-lg font-bold text-primary">4</div>
                        <div className="text-[10px] text-muted-foreground font-medium">Available</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setDraft(DEFAULT_CONFIG) }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Reset all settings to defaults
                  </button>
                </div>
              )}
            </div>

            {/* ─── Footer ─── */}
            <div className="border-t border-border px-5 py-3 flex items-center justify-end gap-2 bg-muted/20">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { DEFAULT_CONFIG }
export type { StrikeConfig }
