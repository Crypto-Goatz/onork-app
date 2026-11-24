'use client'

/**
 * Tasks — every task in the CRM account, create one on a contact, tick it done.
 * The CRM keeps tasks ON contacts, so a new task always names who it is about.
 */
import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Circle, Loader2, Plus } from 'lucide-react'
import Workspace, { Btn, Card, ContactPicker, Field, Modal, Notice, errText, inputCls } from '../sdk/Workspace'
import { sdk, type CrmTask } from '@/lib/crm/sdk'

const tid = (t: CrmTask) => t._id || t.id || ''
const who = (t: CrmTask) => [t.contactDetails?.firstName, t.contactDetails?.lastName].filter(Boolean).join(' ') || (t.contactId ? 'Contact' : 'No contact (deleted)')

function due(iso?: string) {
  if (!iso) return { label: 'No due date', late: false }
  const d = new Date(iso)
  return { label: d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), late: d.getTime() < Date.now() }
}

function Body({ loc, openNew, setOpenNew }: { loc: string; openNew: boolean; setOpenNew: (v: boolean) => void }) {
  const [show, setShow] = useState<'open' | 'all'>('open')
  const [rows, setRows] = useState<CrmTask[] | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [form, setForm] = useState<{ title: string; when: string; body: string; contact: { id: string; label: string } | null } | null>(null)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setErr('')
    try {
      const d = await sdk.searchTasks(loc, show === 'open' ? { completed: false } : {})
      const list = (d.tasks || []).slice().sort((a, b) => Number(a.completed) - Number(b.completed) || (a.dueDate || '').localeCompare(b.dueDate || ''))
      setRows(list)
    } catch (e) { setErr(errText(e)); setRows([]) }
  }, [loc, show])
  useEffect(() => { setRows(null); load() }, [load])
  useEffect(() => {
    if (!openNew) return
    const t = new Date(Date.now() + 86_400_000); t.setHours(9, 0, 0, 0)
    const local = new Date(t.getTime() - t.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    setForm({ title: '', when: local, body: '', contact: null }); setMsg(''); setOpenNew(false)
  }, [openNew, setOpenNew])

  const toggle = async (t: CrmTask) => {
    setBusy(tid(t))
    try { await sdk.setTaskDone(loc, tid(t), !t.completed); await load() } catch (e) { setErr(errText(e)) }
    setBusy('')
  }

  const save = async () => {
    if (!form) return
    if (!form.title.trim()) { setMsg('Give the task a title.'); return }
    if (!form.contact) { setMsg('Pick the contact this task is about.'); return }
    setSaving(true); setMsg('')
    try {
      await sdk.createTask(form.contact.id, { title: form.title.trim(), dueDate: new Date(form.when).toISOString(), ...(form.body.trim() ? { body: form.body.trim() } : {}) })
      setForm(null); await load()
    } catch (e) { setMsg(errText(e)) }
    setSaving(false)
  }

  return (
    <>
      <div className="mb-4 flex gap-2">
        {(['open', 'all'] as const).map((k) => (
          <button key={k} onClick={() => setShow(k)}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium ${show === k ? 'border-[color:var(--oc-ink)] bg-[color:var(--oc-ink)] text-white' : 'border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)]'}`}>
            {k === 'open' ? 'Open' : 'All'}
          </button>
        ))}
      </div>
      {err && <div className="mb-4"><Notice tone="red">{err}</Notice></div>}
      <Card>
        {!rows ? (
          <div className="flex items-center gap-2 p-5 text-[13px] text-[color:var(--oc-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…</div>
        ) : rows.length === 0 ? (
          <div className="p-5 text-[13px] text-[color:var(--oc-muted)]">{show === 'open' ? 'Nothing open. Nice.' : 'No tasks yet.'}</div>
        ) : rows.map((t) => {
          const d = due(t.dueDate)
          return (
            <div key={tid(t)} className="flex items-start gap-3 border-b border-[color:var(--oc-border)] px-4 py-3 last:border-0">
              <button onClick={() => toggle(t)} disabled={busy === tid(t)} aria-label={t.completed ? 'Mark not done' : 'Mark done'} className="mt-0.5 shrink-0 text-[color:var(--oc-green-d)] disabled:opacity-50">
                {busy === tid(t) ? <Loader2 className="h-5 w-5 animate-spin" /> : t.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-[color:var(--oc-faint)]" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className={`text-[13.5px] font-medium ${t.completed ? 'text-[color:var(--oc-faint)] line-through' : 'text-[color:var(--oc-ink)]'}`}>{t.title}</div>
                {t.body && <div className="mt-0.5 line-clamp-2 text-[12.5px] text-[color:var(--oc-muted)]">{t.body}</div>}
                <div className="mt-1 text-[12px] text-[color:var(--oc-muted)]">
                  {who(t)} · <span className={d.late && !t.completed ? 'font-medium text-[color:var(--oc-red)]' : ''}>{d.late && !t.completed ? 'Overdue · ' : ''}{d.label}</span>
                </div>
              </div>
            </div>
          )
        })}
      </Card>

      {form && (
        <Modal title="New task" onClose={() => setForm(null)}>
          <div className="space-y-3">
            <Field label="Task"><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Call back about the quote" /></Field>
            <Field label="About"><ContactPicker value={form.contact} onChange={(c) => setForm({ ...form, contact: c })} /></Field>
            <Field label="Due"><input className={inputCls} type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} /></Field>
            <Field label="Notes (optional)"><textarea className={inputCls} rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          </div>
          {msg && <div className="mt-3"><Notice tone="red">{msg}</Notice></div>}
          <div className="mt-5 flex justify-end gap-2">
            <Btn kind="ghost" onClick={() => setForm(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Create task</Btn>
          </div>
        </Modal>
      )}
    </>
  )
}

export default function TasksSdk() {
  const [openNew, setOpenNew] = useState(false)
  return (
    <Workspace nav="tasks" title="Tasks" blurb="Every follow-up in your CRM. Add one to a contact, tick it off when it is done."
      actions={<Btn onClick={() => setOpenNew(true)}><Plus className="h-3.5 w-3.5" /> New task</Btn>}>
      {(loc) => <Body loc={loc} openNew={openNew} setOpenNew={setOpenNew} />}
    </Workspace>
  )
}
