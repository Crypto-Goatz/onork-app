'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import * as crm from '@/lib/crm/sdk'
import type { Contact } from '@/lib/crm/sdk'
import {
  Users,
  Search,
  Plus,
  X,
  Mail,
  Phone,
  Building2,
  Tag,
  Trash2,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react'

const PAGE_SIZE = 20

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [skip, setSkip] = useState(0)

  // Detail panel
  const [selected, setSelected] = useState<Contact | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [notes, setNotes] = useState<Array<{ id: string; body: string; dateAdded: string }>>([])
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; dueDate: string; completed: boolean }>>([])

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    tags: '',
  })

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState(false)

  // New note
  const [noteBody, setNoteBody] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  // New tag
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchContacts = useCallback(
    async (searchQuery: string, offset: number, append = false) => {
      if (!append) setLoading(true)
      else setLoadingMore(true)
      try {
        const res = await crm.contacts.list({
          limit: PAGE_SIZE,
          skip: offset,
          query: searchQuery || undefined,
          sortBy: 'dateAdded',
          order: 'desc',
        })
        if (append) {
          setContacts((prev) => [...prev, ...res.contacts])
        } else {
          setContacts(res.contacts)
        }
        setTotal(res.total)
      } catch (err) {
        console.error('Failed to load contacts', err)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [],
  )

  useEffect(() => {
    fetchContacts('', 0)
  }, [fetchContacts])

  const handleSearch = (value: string) => {
    setQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSkip(0)
      fetchContacts(value, 0)
    }, 400)
  }

  const handleLoadMore = () => {
    const nextSkip = skip + PAGE_SIZE
    setSkip(nextSkip)
    fetchContacts(query, nextSkip, true)
  }

  const openDetail = async (contact: Contact) => {
    setSelected(contact)
    setDetailLoading(true)
    setNotes([])
    setTasks([])
    try {
      const [notesRes, tasksRes] = await Promise.all([
        crm.contacts.getNotes(contact.id),
        crm.contacts.getTasks(contact.id),
      ])
      setNotes(notesRes.notes || [])
      setTasks(tasksRes.tasks || [])
    } catch (err) {
      console.error('Failed to load contact details', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const tagList = createForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      await crm.contacts.create({
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        email: createForm.email || undefined,
        phone: createForm.phone || undefined,
        companyName: createForm.companyName || undefined,
        tags: tagList.length ? tagList : undefined,
      })
      setShowCreate(false)
      setCreateForm({ firstName: '', lastName: '', email: '', phone: '', companyName: '', tags: '' })
      setSkip(0)
      fetchContacts(query, 0)
    } catch (err) {
      console.error('Failed to create contact', err)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await crm.contacts.delete(deleteTarget.id)
      if (selected?.id === deleteTarget.id) setSelected(null)
      setDeleteTarget(null)
      setSkip(0)
      fetchContacts(query, 0)
    } catch (err) {
      console.error('Failed to delete contact', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleAddNote = async () => {
    if (!selected || !noteBody.trim()) return
    setAddingNote(true)
    try {
      await crm.contacts.addNote(selected.id, noteBody.trim())
      const res = await crm.contacts.getNotes(selected.id)
      setNotes(res.notes || [])
      setNoteBody('')
    } catch (err) {
      console.error('Failed to add note', err)
    } finally {
      setAddingNote(false)
    }
  }

  const handleAddTag = async () => {
    if (!selected || !newTag.trim()) return
    setAddingTag(true)
    try {
      await crm.contacts.addTags(selected.id, [newTag.trim()])
      const res = await crm.contacts.get(selected.id)
      setSelected(res.contact)
      setNewTag('')
    } catch (err) {
      console.error('Failed to add tag', err)
    } finally {
      setAddingTag(false)
    }
  }

  const contactName = (c: Contact) =>
    c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unnamed'

  const formatDate = (d?: string) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[#7ed957]" />
            <h1 className="text-[13px] font-semibold text-white tracking-wide uppercase">
              Contacts
            </h1>
            {!loading && (
              <span className="text-[11px] text-white/40 font-medium">
                {total.toLocaleString()} total
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSkip(0)
                fetchContacts(query, 0)
              }}
              className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/40 hover:bg-white/[0.06] hover:text-white/60 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#7ed957]/10 px-3 py-1.5 text-[11px] font-medium text-[#7ed957] hover:bg-[#7ed957]/20 transition-colors"
            >
              <Plus className="h-3 w-3" />
              New Contact
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search contacts by name, email, or phone..."
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 pl-9 pr-4 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-[#7ed957]/30 focus:bg-white/[0.04] transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-white/25" />
              <p className="mt-3 text-[11px] text-white/25">Loading contacts...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Users className="h-8 w-8 text-white/10" />
              <p className="mt-3 text-[13px] text-white/40">No contacts found</p>
              <p className="mt-1 text-[11px] text-white/25">
                {query ? 'Try a different search term' : 'Create your first contact to get started'}
              </p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1fr_0.8fr_0.8fr_0.8fr_0.6fr_36px] gap-3 border-b border-white/[0.06] pb-2 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">
                  Name
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">
                  Email
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">
                  Phone
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">
                  Company
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">
                  Tags
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">
                  Added
                </span>
                <span />
              </div>

              {/* Rows */}
              {contacts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => openDetail(c)}
                  className={`group grid grid-cols-[1fr_1fr_0.8fr_0.8fr_0.8fr_0.6fr_36px] gap-3 items-center rounded-lg px-2 py-2.5 cursor-pointer transition-colors ${
                    selected?.id === c.id
                      ? 'bg-[#7ed957]/[0.06]'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <span className="text-[13px] text-white truncate">{contactName(c)}</span>
                  <span className="text-[13px] text-white/40 truncate">{c.email || '-'}</span>
                  <span className="text-[13px] text-white/40 truncate">{c.phone || '-'}</span>
                  <span className="text-[13px] text-white/40 truncate">{c.companyName || '-'}</span>
                  <div className="flex items-center gap-1 overflow-hidden">
                    {(c.tags || []).slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="shrink-0 rounded bg-[#00d4ff]/10 px-1.5 py-0.5 text-[10px] text-[#00d4ff] truncate max-w-[80px]"
                      >
                        {tag}
                      </span>
                    ))}
                    {(c.tags?.length || 0) > 2 && (
                      <span className="text-[10px] text-white/25">
                        +{(c.tags?.length || 0) - 2}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/25">{formatDate(c.dateAdded)}</span>
                  <ChevronRight className="h-3 w-3 text-white/10 group-hover:text-white/25 transition-colors" />
                </div>
              ))}

              {/* Load more */}
              {contacts.length < total && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-[11px] text-white/40 hover:bg-white/[0.04] hover:text-white/60 disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                    {loadingMore ? 'Loading...' : `Load more (${total - contacts.length} remaining)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail slide-out panel */}
      {selected && (
        <div className="w-[380px] shrink-0 border-l border-white/[0.06] bg-white/[0.02] flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h2 className="text-[13px] font-semibold text-white truncate">
              {contactName(selected)}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDeleteTarget(selected)}
                className="rounded-lg p-1.5 text-white/25 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-white/25 hover:bg-white/[0.06] hover:text-white/60 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-5 py-4 space-y-5">
            {/* Contact info */}
            <div className="space-y-3">
              {selected.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-3.5 w-3.5 text-white/25 shrink-0" />
                  <span className="text-[13px] text-[#00d4ff] truncate">{selected.email}</span>
                </div>
              )}
              {selected.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="h-3.5 w-3.5 text-white/25 shrink-0" />
                  <span className="text-[13px] text-white/40">{selected.phone}</span>
                </div>
              )}
              {selected.companyName && (
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-3.5 w-3.5 text-white/25 shrink-0" />
                  <span className="text-[13px] text-white/40">{selected.companyName}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Users className="h-3.5 w-3.5 text-white/25 shrink-0" />
                <span className="text-[11px] text-white/25">
                  Source: {selected.source || 'Unknown'}
                </span>
              </div>
              <div className="text-[11px] text-white/25">
                Added {formatDate(selected.dateAdded)} | Updated {formatDate(selected.dateUpdated)}
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-3 w-3 text-white/25" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">
                  Tags
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(selected.tags || []).length === 0 && (
                  <span className="text-[11px] text-white/25">No tags</span>
                )}
                {(selected.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-[#00d4ff]/10 px-2 py-0.5 text-[10px] text-[#00d4ff]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag..."
                  className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-white placeholder:text-white/25 outline-none focus:border-[#00d4ff]/30 transition-colors"
                />
                <button
                  onClick={handleAddTag}
                  disabled={addingTag || !newTag.trim()}
                  className="rounded-lg bg-[#00d4ff]/10 px-2.5 py-1.5 text-[10px] font-medium text-[#00d4ff] hover:bg-[#00d4ff]/20 disabled:opacity-40 transition-colors"
                >
                  {addingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/25 block mb-2">
                Notes
              </span>
              {detailLoading ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="h-3 w-3 animate-spin text-white/25" />
                  <span className="text-[11px] text-white/25">Loading...</span>
                </div>
              ) : (
                <>
                  {notes.length === 0 && (
                    <p className="text-[11px] text-white/25 mb-2">No notes yet</p>
                  )}
                  <div className="space-y-2 mb-3 max-h-[200px] overflow-auto">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-2.5"
                      >
                        <p className="text-[12px] text-white/60 whitespace-pre-wrap leading-relaxed">
                          {note.body}
                        </p>
                        <p className="mt-1.5 text-[10px] text-white/25">
                          {formatDate(note.dateAdded)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-1.5">
                    <textarea
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder="Write a note..."
                      rows={2}
                      className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-white placeholder:text-white/25 outline-none resize-none focus:border-[#7ed957]/30 transition-colors"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={addingNote || !noteBody.trim()}
                      className="rounded-lg bg-[#7ed957]/10 px-2.5 py-1.5 text-[10px] font-medium text-[#7ed957] hover:bg-[#7ed957]/20 disabled:opacity-40 transition-colors"
                    >
                      {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Tasks */}
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/25 block mb-2">
                Tasks
              </span>
              {detailLoading ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="h-3 w-3 animate-spin text-white/25" />
                  <span className="text-[11px] text-white/25">Loading...</span>
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-[11px] text-white/25">No tasks</p>
              ) : (
                <div className="space-y-1.5">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] px-2.5 py-2"
                    >
                      <div
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          task.completed ? 'bg-[#7ed957]' : 'bg-white/10'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[12px] truncate ${
                            task.completed ? 'text-white/25 line-through' : 'text-white/60'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p className="text-[10px] text-white/25">{formatDate(task.dueDate)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom fields */}
            {selected.customFields && selected.customFields.length > 0 && (
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/25 block mb-2">
                  Custom Fields
                </span>
                <div className="space-y-1.5">
                  {selected.customFields.map((cf) => (
                    <div key={cf.id} className="flex items-center justify-between">
                      <span className="text-[11px] text-white/25">{cf.key}</span>
                      <span className="text-[11px] text-white/60 truncate max-w-[180px]">
                        {String(cf.field_value ?? cf.value ?? '-')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create contact modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white">New Contact</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1.5 text-white/25 hover:bg-white/[0.06] hover:text-white/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-white/25 block mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-[#7ed957]/30 transition-colors"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-white/25 block mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-[#7ed957]/30 transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-white/25 block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-[#7ed957]/30 transition-colors"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-white/25 block mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-[#7ed957]/30 transition-colors"
                  placeholder="+1 555 123 4567"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-white/25 block mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm((p) => ({ ...p, companyName: e.target.value }))}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-[#7ed957]/30 transition-colors"
                  placeholder="Acme Inc."
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-white/25 block mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={createForm.tags}
                  onChange={(e) => setCreateForm((p) => ({ ...p, tags: e.target.value }))}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-[#7ed957]/30 transition-colors"
                  placeholder="lead, vip"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-[11px] text-white/40 hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || (!createForm.firstName && !createForm.lastName)}
                className="flex items-center gap-1.5 rounded-lg bg-[#7ed957]/10 px-4 py-2 text-[11px] font-medium text-[#7ed957] hover:bg-[#7ed957]/20 disabled:opacity-40 transition-colors"
              >
                {creating && <Loader2 className="h-3 w-3 animate-spin" />}
                {creating ? 'Creating...' : 'Create Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <Trash2 className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Delete Contact</h3>
                <p className="text-[11px] text-white/40 mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-[13px] text-white/60 mb-5">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">{contactName(deleteTarget)}</span>?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-[11px] text-white/40 hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-4 py-2 text-[11px] font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
              >
                {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
