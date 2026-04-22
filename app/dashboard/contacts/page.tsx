'use client'

import { useEffect, useState } from 'react'
import { useLocation } from '@/lib/location-context'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { UserPlus, Search, Loader2, AlertCircle, CheckCircle2, User } from 'lucide-react'

interface Contact {
  id: string
  contactName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  tags: string[]
  dateAdded: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addSuccess, setAddSuccess] = useState('')
  const [addError, setAddError] = useState('')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', company: '', tags: '' })
  const { locationId, refreshKey } = useLocation()

  useEffect(() => { fetchContacts() }, [refreshKey])

  async function fetchContacts() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/contacts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setContacts(data.contacts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName && !form.email && !form.phone) return
    setAdding(true)
    setAddError('')
    setAddSuccess('')

    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          companyName: form.company || undefined,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : ['0ncore-contact'],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create contact')

      setAddSuccess(`${form.firstName} ${form.lastName} added successfully`)
      setForm({ firstName: '', lastName: '', email: '', phone: '', company: '', tags: '' })

      await fetchContacts()

      setTimeout(() => {
        setShowCreateModal(false)
        setAddSuccess('')
      }, 1500)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setAdding(false)
    }
  }

  const filtered = contacts.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.contactName || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
  })

  const inputClass = "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"

  return (
    <div className="mx-auto max-w-[1100px] px-2">

      {/* ═══ CREATE CONTACT MODAL ═══ */}
      <ResponsiveModal
        open={showCreateModal}
        onOpenChange={(open) => { if (!adding) setShowCreateModal(open) }}
        title="Create Contact"
        description="Add a new contact to your CRM."
        showCancel={false}
      >
        {addSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {addSuccess}
          </div>
        )}

        {addError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {addError}
          </div>
        )}

        <form onSubmit={handleAddContact} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                First Name
              </span>
              <input
                type="text"
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                placeholder="John"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Last Name
              </span>
              <input
                type="text"
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                placeholder="Doe"
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </span>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="john@company.com"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Phone
            </span>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+1 (412) 555-1234"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Company
            </span>
            <input
              type="text"
              value={form.company}
              onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              placeholder="Acme Inc."
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tags (comma separated)
            </span>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="lead, marketing, inbound"
              className={inputClass}
            />
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={adding || (!form.firstName && !form.email && !form.phone)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Contact
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              disabled={adding}
              className="rounded-lg border border-border px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {contacts.length > 0 ? `${contacts.length} contacts` : 'Manage your contacts'}
          </p>
        </div>
        <button
          onClick={() => { setAddError(''); setAddSuccess(''); setShowCreateModal(true) }}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="mb-3 text-sm text-red-400">{error}</p>
          <button onClick={fetchContacts} className="text-sm font-semibold text-primary hover:underline">
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-10 py-16 text-center">
          <User className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
          <p className="mb-4 text-sm text-muted-foreground">
            {search ? 'No contacts match your search.' : 'No contacts yet. Add your first one.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <UserPlus className="h-4 w-4" />
              Add Contact
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'Email', 'Phone', 'Tags', 'Added'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {(c.firstName?.[0] || c.contactName?.[0] || '?').toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.email || '\u2014'}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.phone || '\u2014'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags || []).slice(0, 2).map(tag => (
                        <span key={tag} className="rounded px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                          {tag}
                        </span>
                      ))}
                      {(c.tags || []).length > 2 && (
                        <span className="text-xs text-muted-foreground">+{c.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {c.dateAdded ? new Date(c.dateAdded).toLocaleDateString() : '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
