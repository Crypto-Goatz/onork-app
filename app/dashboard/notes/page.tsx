'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Sparkles, Loader2, Send, Trash2, ExternalLink, Brain, FileText, GitBranch,
  Network, Workflow, MessageSquare, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface Note {
  id: string
  title: string
  body: string
  artifact_type: 'note' | 'flowchart' | 'mindmap' | 'diagram' | 'doc'
  artifact_url: string | null
  tags: string[]
  brain_decision: { tool: string; reasoning: string; confidence: number } | null
  feedback: string | null
  created_at: string
}

interface BrainView {
  brief: { display_name: string; version: number; tools: Array<{ name: string; description: string }> } | null
  brain: {
    content: { confidence_scores?: Record<string, number>; recent_titles?: string[]; learned_patterns?: Array<{ pattern: string; confidence: number }>; preferences?: Record<string, unknown> }
    outcomes_count: number
    successes_count: number
    success_rate: number
    last_updated_at: string
  }
  recent: Array<{
    action: string
    decision: { tool: string; reasoning: string; confidence: number } | null
    success: boolean
    user_feedback: string | null
    created_at: string
  }>
}

export default function NotesPage() {
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [brainView, setBrainView] = useState<BrainView | null>(null)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [lastOutcomeId, setLastOutcomeId] = useState<string | null>(null)
  const [tab, setTab] = useState<'chat' | 'brain'>('chat')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void loadNotes()
    void loadBrain()
  }, [])

  async function loadNotes() {
    try {
      const res = await fetch('/api/notes/list')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'load failed')
      setNotes(json.notes ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed to load notes')
    }
  }

  async function loadBrain() {
    try {
      const res = await fetch('/api/notes/brain')
      const json = await res.json()
      if (!res.ok) return
      setBrainView(json)
    } catch {
      // brain panel is optional — silent fail
    }
  }

  async function think() {
    if (!input.trim()) return
    setThinking(true)
    try {
      const res = await fetch('/api/notes/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'thinking failed')

      setLastOutcomeId(json.outcome_id ?? null)

      if (json.decision?.tool === 'ask_clarification') {
        setPendingQuestion(json.output?.question ?? 'Can you tell me more?')
        toast.info('Brain wants more info')
        return
      }

      if (json.output?.needs_connection) {
        toast.error(json.output.message, {
          action: { label: 'Connect', onClick: () => { window.location.href = json.output.connect_url } },
        })
        return
      }

      if (json.success) {
        const conf = json.decision?.confidence ?? 0
        toast.success(`${describeTool(json.decision.tool)} (${conf}% confident)`, {
          description: json.decision.reasoning,
        })
        setInput('')
        setPendingQuestion(null)
        await Promise.all([loadNotes(), loadBrain()])
      } else {
        toast.error(json.output?.error ?? 'Action failed')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'request failed')
    } finally {
      setThinking(false)
    }
  }

  async function sendFeedback(_outcomeId: string, feedback: 'accepted' | 'rejected' | 'edited') {
    try {
      await fetch('/api/notes/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'noop', feedback, previous_outcome_id: _outcomeId }),
      })
      await loadBrain()
      toast.success(`Feedback: ${feedback}`)
    } catch {
      // silent
    }
  }

  async function deleteNote(id: string) {
    if (!confirm('Delete this note?')) return
    try {
      const res = await fetch(`/api/notes/list?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      setNotes((n) => n.filter((x) => x.id !== id))
      toast.success('Deleted')
    } catch {
      toast.error('failed to delete')
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !thinking) {
      e.preventDefault()
      void think()
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="h-6 w-6 text-[var(--accent)]" />
          Notes
          <Badge variant="outline" className="ml-1 text-xs">
            AI-First · Self-Learning
          </Badge>
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Drop in any thought. The brain decides whether it becomes a flowchart, mind map, doc, or just a tagged note — and gets better at it the more you use it.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="chat"><MessageSquare className="mr-2 h-4 w-4" /> Chat</TabsTrigger>
          <TabsTrigger value="brain"><Brain className="mr-2 h-4 w-4" /> Brain</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6 space-y-6">
          <Card className="p-4">
            {pendingQuestion && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                <p className="text-yellow-200/90"><strong>Brain asks:</strong> {pendingQuestion}</p>
              </div>
            )}
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Drop your thought, meeting notes, idea, or process here. The brain figures out what to do with it."
              rows={4}
              className="resize-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-white/40">⌘+Enter to send</p>
              <Button onClick={() => think()} disabled={thinking || !input.trim()} size="sm">
                {thinking ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Thinking…</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Send</>
                )}
              </Button>
            </div>
          </Card>

          {notes.length === 0 ? (
            <Card className="p-12 text-center text-sm text-white/60">
              Nothing yet. Drop a thought above and the brain will pick where to put it.
            </Card>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <NoteCard key={n.id} note={n} onDelete={() => deleteNote(n.id)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="brain" className="mt-6">
          <BrainPanel view={brainView} onFeedback={sendFeedback} lastOutcomeId={lastOutcomeId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function describeTool(tool: string): string {
  const map: Record<string, string> = {
    'whimsical.create_from_text': 'Created a flowchart',
    'whimsical.create_from_mermaid': 'Rendered a diagram',
    'whimsical.create_doc': 'Wrote a doc',
    store_note: 'Saved as note',
    ask_clarification: 'Need more info',
  }
  return map[tool] ?? tool
}

function ArtifactIcon({ type }: { type: string }) {
  if (type === 'flowchart') return <Workflow className="h-4 w-4" />
  if (type === 'mindmap') return <Network className="h-4 w-4" />
  if (type === 'diagram') return <GitBranch className="h-4 w-4" />
  if (type === 'doc') return <FileText className="h-4 w-4" />
  return <FileText className="h-4 w-4" />
}

function NoteCard({ note, onDelete }: { note: Note; onDelete: () => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]"><ArtifactIcon type={note.artifact_type} /></span>
            <h3 className="truncate font-medium">{note.title}</h3>
            <Badge variant="outline" className="text-[10px] uppercase">{note.artifact_type}</Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-white/60">{note.body}</p>
          {note.brain_decision && (
            <p className="mt-2 text-xs italic text-white/40">
              Brain: {note.brain_decision.reasoning} · {note.brain_decision.confidence}% confident
            </p>
          )}
          {note.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {note.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {note.artifact_url && (
            <a href={note.artifact_url} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" title="Open in Whimsical">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function BrainPanel({
  view,
  onFeedback,
  lastOutcomeId,
}: {
  view: BrainView | null
  onFeedback: (outcomeId: string, feedback: 'accepted' | 'rejected' | 'edited') => void
  lastOutcomeId: string | null
}) {
  if (!view) return <Card className="p-8 text-center text-sm text-white/60">Loading brain…</Card>

  const { brain, brief, recent } = view
  const confidence = (brain.content.confidence_scores ?? {}) as Record<string, number>
  const toolStats = Object.entries(confidence)
    .filter(([k]) => !k.endsWith('_count'))
    .map(([tool, score]) => ({
      tool,
      score,
      count: confidence[`${tool}_count`] ?? 0,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Outcomes" value={brain.outcomes_count} />
          <Stat label="Success rate" value={`${brain.success_rate}%`} accent />
          <Stat label="Brief version" value={brief?.version ?? '—'} />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Brain className="h-4 w-4 text-[var(--accent)]" />
          Tool confidence
        </h3>
        {toolStats.length === 0 ? (
          <p className="text-sm text-white/50">No tool history yet — pick a tool by sending an input.</p>
        ) : (
          <div className="space-y-2">
            {toolStats.map((t) => (
              <div key={t.tool} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-mono text-xs text-white/70">{t.tool}</span>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-[var(--accent)]" style={{ width: `${t.score}%` }} />
                  </div>
                  <span className="w-14 text-right text-xs text-white/60">{t.score}% · {t.count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          Recent decisions
        </h3>
        {recent.length === 0 ? (
          <p className="text-sm text-white/50">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.slice(0, 12).map((r, i) => {
              const isLast = i === 0 && lastOutcomeId
              return (
                <div key={i} className="flex items-start justify-between gap-3 rounded border border-white/5 bg-white/[0.02] p-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={r.success ? 'text-[var(--accent)]' : 'text-red-400'}>
                        {r.success ? '✓' : '✗'}
                      </span>
                      <span className="font-mono text-white/70">{r.decision?.tool ?? r.action}</span>
                      {r.user_feedback && (
                        <Badge variant="outline" className="text-[10px]">{r.user_feedback}</Badge>
                      )}
                    </div>
                    {r.decision?.reasoning && (
                      <p className="mt-1 text-white/50">{r.decision.reasoning}</p>
                    )}
                    {isLast && !r.user_feedback && lastOutcomeId && (
                      <div className="mt-2 flex gap-1.5">
                        <button
                          onClick={() => onFeedback(lastOutcomeId, 'accepted')}
                          className="rounded border border-[var(--accent)]/30 px-2 py-0.5 text-[10px] text-[var(--accent)] hover:bg-[var(--accent)]/10"
                        >
                          Good call
                        </button>
                        <button
                          onClick={() => onFeedback(lastOutcomeId, 'rejected')}
                          className="rounded border border-red-400/30 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-400/10"
                        >
                          Wrong tool
                        </button>
                        <button
                          onClick={() => onFeedback(lastOutcomeId, 'edited')}
                          className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-white/60 hover:bg-white/5"
                        >
                          I edited it
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-white/30">
                    {new Date(r.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ? 'text-[var(--accent)]' : ''}`}>{value}</div>
    </div>
  )
}
