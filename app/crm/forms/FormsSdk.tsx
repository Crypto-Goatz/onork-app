'use client'

/**
 * Forms — the account's forms and who filled them in.
 *
 * CREATE IS A LINK, SAID PLAINLY. The CRM's API can list forms and read their
 * submissions but has no endpoint that creates or edits a form (checked
 * 2026-11-24). So "New form" opens the CRM's own form builder for this account
 * in a new tab rather than pretending to build one here.
 */
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Loader2 } from 'lucide-react'
import Workspace, { Card, Notice, errText } from '../sdk/Workspace'
import { sdk } from '@/lib/crm/sdk'

const CRM_APP = 'https://app.rocketclients.com'
type Sub = { id: string; contactId: string; name?: string; email?: string; createdAt: string; others?: Record<string, unknown> }

function Submissions({ formId }: { formId: string }) {
  const [rows, setRows] = useState<Sub[] | null>(null)
  const [total, setTotal] = useState(0)
  const [err, setErr] = useState('')
  useEffect(() => {
    sdk.formSubmissions(formId, 20).then((d) => { setRows(d.submissions || []); setTotal(d.meta?.total ?? (d.submissions || []).length) }).catch((e) => { setErr(errText(e)); setRows([]) })
  }, [formId])
  if (err) return <div className="px-4 pb-4"><Notice tone="red">{err}</Notice></div>
  if (!rows) return <div className="flex items-center gap-2 px-4 pb-4 text-[13px] text-[color:var(--oc-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading submissions…</div>
  if (rows.length === 0) return <div className="px-4 pb-4 text-[13px] text-[color:var(--oc-muted)]">No one has filled this form in yet.</div>
  return (
    <div className="px-4 pb-4">
      <div className="mb-2 text-[12px] text-[color:var(--oc-muted)]">{total.toLocaleString()} submission{total === 1 ? '' : 's'}{total > rows.length ? ` · newest ${rows.length} shown` : ''}</div>
      <div className="overflow-x-auto rounded-xl border border-[color:var(--oc-border)]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[color:var(--oc-elevated)] text-[11.5px] uppercase tracking-wide text-[color:var(--oc-faint)]">
            <tr><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Email</th><th className="px-3 py-2 font-medium">When</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-[color:var(--oc-border)]">
                <td className="px-3 py-2 text-[color:var(--oc-ink)]">{s.name || String(s.others?.full_name ?? '') || '—'}</td>
                <td className="px-3 py-2 text-[color:var(--oc-text)]">{s.email || String(s.others?.email ?? '') || '—'}</td>
                <td className="px-3 py-2 text-[color:var(--oc-muted)]">{new Date(s.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Body() {
  const [forms, setForms] = useState<Array<{ id: string; name: string }> | null>(null)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState('')
  useEffect(() => { sdk.forms().then((d) => setForms(d.forms || [])).catch((e) => { setErr(errText(e)); setForms([]) }) }, [])

  if (err) return <Notice tone="red">{err}</Notice>
  return (
    <Card>
      {!forms ? (
        <div className="flex items-center gap-2 p-5 text-[13px] text-[color:var(--oc-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading forms…</div>
      ) : forms.length === 0 ? (
        <div className="p-5 text-[13px] text-[color:var(--oc-muted)]">No forms yet. Use New form to make one in the CRM; it appears here as soon as it is saved.</div>
      ) : forms.map((f) => (
        <div key={f.id} className="border-b border-[color:var(--oc-border)] last:border-0">
          <button onClick={() => setOpen(open === f.id ? '' : f.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-[color:var(--oc-elevated)]">
            {open === f.id ? <ChevronDown className="h-4 w-4 text-[color:var(--oc-muted)]" /> : <ChevronRight className="h-4 w-4 text-[color:var(--oc-muted)]" />}
            <span className="flex-1 text-[13.5px] font-medium text-[color:var(--oc-ink)]">{f.name}</span>
            <span className="text-[12px] text-[color:var(--oc-muted)]">Submissions</span>
          </button>
          {open === f.id && <Submissions formId={f.id} />}
        </div>
      ))}
    </Card>
  )
}

export default function FormsSdk() {
  return (
    <Workspace nav="forms" title="Forms" blurb="Your CRM forms and everyone who filled them in. New forms are built in the CRM's form builder."
      actions={(loc) => (
        <a href={`${CRM_APP}/v2/location/${loc}/form-builder/main`} target="_blank" rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[color:var(--oc-ink)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90">
          New form <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}>
      {() => <Body />}
    </Workspace>
  )
}
