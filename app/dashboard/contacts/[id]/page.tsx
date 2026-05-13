'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Phone, Mail, MessageSquare, PenLine, ClipboardCheck, ChevronLeft, AlertCircle, Loader2 } from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

interface ContactRecord {
  id: string
  firstName?: string
  lastName?: string
  contactName?: string
  email?: string
  phone?: string
  companyName?: string
  tags?: string[]
  source?: string
  dateAdded?: string
  lastActivity?: string
}

interface NoteRecord { id: string; body: string; dateAdded: string }
interface TaskRecord { id: string; title: string; dueDate: string; completed: boolean }

type TabKey = 'activity' | 'notes' | 'deals' | 'tasks' | 'files'

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>()
  const contactId = params?.id ?? ''

  const [contact, setContact] = useState<ContactRecord | null>(null)
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('activity')
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const load = useCallback(async () => {
    if (!contactId) return
    setLoading(true)
    setError(null)
    try {
      const [c, n, t] = await Promise.allSettled([
        crm.contacts.get(contactId),
        crm.contacts.getNotes(contactId),
        crm.contacts.getTasks(contactId),
      ])
      if (c.status === 'fulfilled' && c.value?.contact) {
        setContact(c.value.contact as ContactRecord)
      } else if (c.status === 'rejected') {
        setError(c.reason instanceof Error ? c.reason.message : 'Contact not found')
      }
      if (n.status === 'fulfilled' && Array.isArray(n.value?.notes)) {
        setNotes(n.value.notes)
      }
      if (t.status === 'fulfilled' && Array.isArray(t.value?.tasks)) {
        setTasks(t.value.tasks)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact')
    } finally {
      setLoading(false)
    }
  }, [contactId])

  useEffect(() => { load() }, [load])

  async function addNote() {
    const body = noteText.trim()
    if (!body || !contactId) return
    setSavingNote(true)
    try {
      await crm.contacts.addNote(contactId, body)
      setNoteText('')
      const res = await crm.contacts.getNotes(contactId)
      if (Array.isArray(res?.notes)) setNotes(res.notes)
    } catch {
      // surfaced via the UI staying as-is; could add toast here
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="jp-contact-detail flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-core-text-muted" size={20} />
      </div>
    )
  }

  if (error || !contact) {
    return (
      <div className="jp-contact-detail">
        <Link href="/dashboard/crm" className="inline-flex items-center gap-1 text-core-text-muted hover:text-core-text text-sm mb-4 no-underline">
          <ChevronLeft size={14} /> Back to Contacts
        </Link>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle size={32} className="text-core-text-muted mb-3" />
          <div className="text-core-text font-semibold mb-1">Contact not found</div>
          <div className="text-core-text-muted text-sm max-w-md">
            {error ?? `No contact with ID ${contactId} in your CRM location.`}
          </div>
        </div>
      </div>
    )
  }

  const firstName = contact.firstName ?? contact.contactName?.split(' ')[0] ?? ''
  const lastName = contact.lastName ?? contact.contactName?.split(' ').slice(1).join(' ') ?? ''
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?'

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'activity', label: 'Activity' },
    { key: 'notes', label: 'Notes', count: notes.length },
    { key: 'deals', label: 'Deals' },
    { key: 'tasks', label: 'Tasks', count: tasks.length },
    { key: 'files', label: 'Files' },
  ]

  return (
    <div className="jp-contact-detail">
      <Link href="/dashboard/crm" className="inline-flex items-center gap-1 text-core-text-muted hover:text-core-text text-sm mb-4 no-underline">
        <ChevronLeft size={14} /> Back to Contacts
      </Link>

      <div className="jp-contact-header">
        <div className="jp-contact-header-left">
          <div className="jp-contact-avatar-lg">{initials}</div>
          <div className="jp-contact-header-info">
            <h1 className="jp-contact-name">{firstName} {lastName}</h1>
            {contact.companyName ? (
              <p className="jp-contact-role">{contact.companyName}</p>
            ) : null}
            <div className="jp-contact-meta">
              {contact.email ? <span className="jp-contact-meta-item"><Mail size={12} /> {contact.email}</span> : null}
              {contact.phone ? <span className="jp-contact-meta-item"><Phone size={12} /> {contact.phone}</span> : null}
            </div>
            {contact.tags && contact.tags.length > 0 ? (
              <div className="jp-contact-tags">
                {contact.tags.map((tag) => (
                  <span key={tag} className="jp-contact-tag">{tag}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="jp-contact-tabs">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={activeTab === key ? 'jp-contact-tab active' : 'jp-contact-tab'}
          >
            {label}
            {typeof count === 'number' ? <span className="jp-contact-tab-count">{count}</span> : null}
          </button>
        ))}
      </div>

      <div className="jp-contact-tab-content">
        {activeTab === 'activity' && (
          <EmptyState
            icon={<MessageSquare size={20} />}
            title="No activity yet"
            body="Activity timeline syncs from your CRM. Send a message, log a call, or update a deal to see entries here."
          />
        )}

        {activeTab === 'notes' && (
          <>
            <div className="jp-contact-note-input">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note about this contact…"
                className="jp-contact-note-textarea"
              />
              <button
                onClick={addNote}
                disabled={!noteText.trim() || savingNote}
                className="jp-contact-note-save"
              >
                {savingNote ? 'Saving…' : 'Save note'}
              </button>
            </div>
            {notes.length === 0 ? (
              <EmptyState icon={<PenLine size={20} />} title="No notes yet" body="Notes you add will appear here." />
            ) : (
              <div className="jp-contact-notes">
                {notes.map((n) => (
                  <div key={n.id} className="jp-contact-note">
                    <div className="jp-contact-note-body">{n.body}</div>
                    <div className="jp-contact-note-meta">{new Date(n.dateAdded).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'deals' && (
          <EmptyState
            icon={<ClipboardCheck size={20} />}
            title="No deals on this contact"
            body="Deals attached to this contact in your CRM pipelines will show up here."
          />
        )}

        {activeTab === 'tasks' && (
          tasks.length === 0 ? (
            <EmptyState icon={<ClipboardCheck size={20} />} title="No tasks" body="Open tasks for this contact will appear here." />
          ) : (
            <div className="jp-contact-tasks">
              {tasks.map((t) => (
                <div key={t.id} className="jp-contact-task">
                  <span className={t.completed ? 'jp-contact-task-done' : 'jp-contact-task-pending'}>
                    {t.title}
                  </span>
                  {t.dueDate ? <span className="jp-contact-task-due">Due {new Date(t.dueDate).toLocaleDateString()}</span> : null}
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'files' && (
          <EmptyState icon={<PenLine size={20} />} title="No files" body="File attachments tied to this contact will show here." />
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <div className="text-core-text-muted mb-3">{icon}</div>
      <div className="text-core-text font-semibold mb-1">{title}</div>
      <div className="text-core-text-muted text-sm max-w-md">{body}</div>
    </div>
  )
}
