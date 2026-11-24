'use client'

/** Contacts — list, search (name / email / phone), create, edit. Writes straight to the CRM. */
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Search } from 'lucide-react'
import Workspace, { Btn, Card, Field, Modal, Notice, contactName, errText, inputCls } from '../sdk/Workspace'
import { sdk, type Contact } from '@/lib/crm/sdk'

type Draft = { firstName: string; lastName: string; email: string; phone: string; companyName: string }
const EMPTY: Draft = { firstName: '', lastName: '', email: '', phone: '', companyName: '' }

function Body({ openNew, setOpenNew }: { openNew: boolean; setOpenNew: (v: boolean) => void }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Contact[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [err, setErr] = useState('')
  const [edit, setEdit] = useState<{ id: string | null; draft: Draft } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async (query: string, p: number) => {
    setErr('')
    try {
      const d = await sdk.searchContacts(query, p, 25)
      setRows(d.contacts || [])
      setTotal(d.total || 0)
    } catch (e) { setErr(errText(e)); setRows([]) }
  }, [])

  useEffect(() => { const t = setTimeout(() => { setPage(1); load(q, 1) }, 300); return () => clearTimeout(t) }, [q, load])
  useEffect(() => { if (openNew) { setEdit({ id: null, draft: EMPTY }); setOpenNew(false) } }, [openNew, setOpenNew])

  const save = async () => {
    if (!edit) return
    const d = edit.draft
    if (!d.firstName.trim() && !d.email.trim() && !d.phone.trim()) { setMsg('Give at least a name, an email or a phone number.'); return }
    setSaving(true); setMsg('')
    const body: Partial<Contact> = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)) as Partial<Contact>
    try {
      if (edit.id) await sdk.updateContact(edit.id, body)
      else await sdk.createContact(body)
      setEdit(null)
      await load(q, page)
    } catch (e) { setMsg(errText(e)) }
    setSaving(false)
  }

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setEdit((x) => x && { ...x, draft: { ...x.draft, [k]: e.target.value } })
  const pages = Math.max(1, Math.ceil(total / 25))

  return (
    <>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--oc-faint)]" />
        <input className={`${inputCls} pl-9`} placeholder="Search by name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {err && <div className="mb-4"><Notice tone="red">{err}</Notice></div>}
      <Card className="overflow-hidden">
        {!rows ? (
          <div className="flex items-center gap-2 p-5 text-[13px] text-[color:var(--oc-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading contacts…</div>
        ) : rows.length === 0 ? (
          <div className="p-5 text-[13px] text-[color:var(--oc-muted)]">{q ? 'No contact matches that.' : 'No contacts yet.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[color:var(--oc-border)] text-[11.5px] uppercase tracking-wide text-[color:var(--oc-faint)]">
                <tr><th className="px-4 py-2.5 font-medium">Name</th><th className="px-4 py-2.5 font-medium">Email</th><th className="px-4 py-2.5 font-medium">Phone</th><th className="hidden px-4 py-2.5 font-medium md:table-cell">Added</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-[color:var(--oc-border)] last:border-0 hover:bg-[color:var(--oc-elevated)]">
                    <td className="px-4 py-2.5 font-medium text-[color:var(--oc-ink)]">{contactName(c)}</td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 text-[color:var(--oc-text)]">{c.email || '—'}</td>
                    <td className="px-4 py-2.5 text-[color:var(--oc-text)]">{c.phone || '—'}</td>
                    <td className="hidden px-4 py-2.5 text-[color:var(--oc-muted)] md:table-cell">{c.dateAdded ? new Date(c.dateAdded).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button className="text-[12.5px] font-medium text-[color:var(--oc-green-d)] hover:underline"
                        onClick={() => setEdit({ id: c.id, draft: { firstName: c.firstName || '', lastName: c.lastName || '', email: c.email || '', phone: c.phone || '', companyName: c.companyName || '' } })}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {rows && total > 25 && (
        <div className="mt-3 flex items-center justify-between text-[12.5px] text-[color:var(--oc-muted)]">
          <span>{total.toLocaleString()} contacts · page {page} of {pages}</span>
          <div className="flex gap-2">
            <Btn kind="ghost" disabled={page <= 1} onClick={() => { setPage(page - 1); load(q, page - 1) }}>Previous</Btn>
            <Btn kind="ghost" disabled={page >= pages} onClick={() => { setPage(page + 1); load(q, page + 1) }}>Next</Btn>
          </div>
        </div>
      )}

      {edit && (
        <Modal title={edit.id ? 'Edit contact' : 'New contact'} onClose={() => setEdit(null)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input className={inputCls} value={edit.draft.firstName} onChange={set('firstName')} /></Field>
            <Field label="Last name"><input className={inputCls} value={edit.draft.lastName} onChange={set('lastName')} /></Field>
            <div className="col-span-2"><Field label="Email"><input className={inputCls} type="email" value={edit.draft.email} onChange={set('email')} /></Field></div>
            <Field label="Phone"><input className={inputCls} value={edit.draft.phone} onChange={set('phone')} /></Field>
            <Field label="Company"><input className={inputCls} value={edit.draft.companyName} onChange={set('companyName')} /></Field>
          </div>
          {msg && <div className="mt-3"><Notice tone="red">{msg}</Notice></div>}
          <div className="mt-5 flex justify-end gap-2">
            <Btn kind="ghost" onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{edit.id ? 'Save' : 'Create contact'}</Btn>
          </div>
        </Modal>
      )}
    </>
  )
}

export default function ContactsSdk() {
  const [openNew, setOpenNew] = useState(false)
  return (
    <Workspace nav="contacts" title="Contacts" blurb="Everyone in your CRM. Search, add and edit — it saves straight to the CRM."
      actions={<Btn onClick={() => setOpenNew(true)}><Plus className="h-3.5 w-3.5" /> New contact</Btn>}>
      {() => <Body openNew={openNew} setOpenNew={setOpenNew} />}
    </Workspace>
  )
}
