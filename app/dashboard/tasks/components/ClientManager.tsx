'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, X, Trash2, Eye, EyeOff, Briefcase, HardDrive, MessageSquare, Github } from 'lucide-react'
import type { Client, Credential, Project, Task } from '../types'

const uid = () => Math.random().toString(36).substr(2, 9)

interface ClientManagerProps {
  clients: Client[]
  projects: Project[]
  tasks: Task[]
  onAddClient: (client: Client) => void
  onUpdateClient: (client: Client) => void
  onDeleteClient: (id: string) => void
  onAddProject: (project: Project) => void
}

const INTEGRATION_META = [
  { label: 'Drive', field: 'driveLink' as const, Icon: HardDrive },
  { label: 'Slack', field: 'slackChannel' as const, Icon: MessageSquare },
  { label: 'GitHub', field: 'githubRepo' as const, Icon: Github },
]

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-core-red',
  medium: 'bg-core-amber',
  low: 'bg-core-green',
}

export default function ClientManager({
  clients, projects, tasks, onAddClient, onUpdateClient, onDeleteClient, onAddProject,
}: ClientManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newIndustry, setNewIndustry] = useState('')
  const [newDesc, setNewDesc] = useState('')

  // Credential add state
  const [showCredModal, setShowCredModal] = useState(false)
  const [credService, setCredService] = useState('')
  const [credUser, setCredUser] = useState('')
  const [credPass, setCredPass] = useState('')
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  const selected = clients.find(c => c.id === selectedId)
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.industry || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = () => {
    if (!newName.trim()) return
    onAddClient({
      id: uid(),
      name: newName.trim(),
      industry: newIndustry.trim() || undefined,
      description: newDesc.trim() || undefined,
      credentials: [],
    })
    setNewName('')
    setNewIndustry('')
    setNewDesc('')
    setShowModal(false)
  }

  const handleAddCred = () => {
    if (!selected || !credService.trim()) return
    const cred: Credential = { id: uid(), service: credService, username: credUser, password: credPass }
    onUpdateClient({ ...selected, credentials: [...selected.credentials, cred] })
    setCredService('')
    setCredUser('')
    setCredPass('')
    setShowCredModal(false)
  }

  const handleDeleteCred = (credId: string) => {
    if (!selected) return
    onUpdateClient({ ...selected, credentials: selected.credentials.filter(c => c.id !== credId) })
  }

  const handleUpdateLink = (field: 'driveLink' | 'slackChannel' | 'githubRepo') => {
    if (!selected) return
    const label = field === 'driveLink' ? 'Drive link' : field === 'slackChannel' ? 'Slack channel' : 'GitHub repo'
    const val = prompt(`Enter ${label}:`, (selected as any)[field] || '')
    if (val !== null) onUpdateClient({ ...selected, [field]: val })
  }

  // Detail view
  if (selected) {
    const clientProjects = projects.filter(p => p.clientId === selected.id)
    const clientTasks = tasks.filter(t => t.clientId === selected.id)

    return (
      <div className="h-full flex flex-col bg-core-bg text-core-text overflow-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-core-border flex items-center gap-4">
          <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 bg-transparent border-0 text-core-green cursor-pointer text-sm font-semibold hover:opacity-80 transition-opacity">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="w-12 h-12 rounded-xl bg-core-green flex items-center justify-center text-core-bg text-[22px] font-extrabold shrink-0">
            {selected.name.charAt(0)}
          </div>
          <div>
            <h2 className="m-0 text-[22px] font-extrabold">{selected.name}</h2>
            <span className="text-[13px] text-core-text-dim">
              {selected.industry || 'General'}{selected.description ? ` — ${selected.description}` : ''}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 gap-6 flex-1">
          {/* Left: Integrations + Credentials */}
          <div className="flex flex-col gap-5">
            {/* Integration links */}
            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-core-green mb-3">Integrations</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {INTEGRATION_META.map(({ label, field, Icon }) => (
                  <button
                    key={field}
                    onClick={() => handleUpdateLink(field)}
                    className="p-3.5 bg-core-card border border-core-border rounded-[10px] text-core-text cursor-pointer text-left transition-colors hover:border-core-green"
                  >
                    <Icon size={20} className="text-core-text-dim" />
                    <div className="text-[13px] font-semibold mt-2">{label}</div>
                    <div className={`text-[10px] mt-0.5 ${(selected as any)[field] ? 'text-core-green' : 'text-core-text-muted'}`}>
                      {(selected as any)[field] ? 'Connected' : 'Not set'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Credentials */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-core-green m-0">Credentials Vault</h3>
                <button onClick={() => setShowCredModal(true)} className="bg-core-green text-core-bg border-0 rounded-[6px] px-2.5 py-1 text-[11px] font-bold cursor-pointer flex items-center gap-1">
                  <Plus size={11} /> Add
                </button>
              </div>
              <div className="bg-core-card border border-core-border rounded-[10px] overflow-hidden">
                {selected.credentials.length === 0 ? (
                  <div className="p-5 text-center text-core-text-muted text-[13px] italic">No credentials stored.</div>
                ) : (
                  selected.credentials.map(cred => (
                    <div key={cred.id} className="px-4 py-3 border-b border-core-border flex justify-between items-center">
                      <div>
                        <div className="text-[13px] font-bold text-core-text">{cred.service}</div>
                        <div className="text-[11px] text-core-text-dim mt-0.5">
                          User: <span className="font-mono text-core-text">{cred.username}</span>
                        </div>
                        {cred.password && (
                          <div className="text-[11px] text-core-text-dim mt-0.5 flex items-center gap-1">
                            Pass: <span className="font-mono text-core-text">
                              {showPasswords[cred.id] ? cred.password : '••••••••'}
                            </span>
                            <button
                              onClick={() => setShowPasswords(p => ({ ...p, [cred.id]: !p[cred.id] }))}
                              className="bg-transparent border-0 text-core-green cursor-pointer flex items-center ml-1"
                            >
                              {showPasswords[cred.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleDeleteCred(cred.id)} className="bg-transparent border-0 text-core-red cursor-pointer p-1 hover:opacity-80 transition-opacity">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Projects */}
            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-core-green mb-3">Projects</h3>
              {clientProjects.length === 0 ? (
                <div className="text-core-text-muted text-[13px] italic">No projects yet.</div>
              ) : clientProjects.map(p => (
                <div key={p.id} className="bg-core-card border border-core-border rounded-lg px-3.5 py-2.5 mb-2 flex justify-between items-center">
                  <span className="font-semibold text-[13px]">{p.title}</span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-[6px] ${
                    p.status === 'active' ? 'bg-core-green/15 text-core-green' : 'bg-core-text-dim/15 text-core-text-dim'
                  }`}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Tasks */}
          <div className="bg-core-card border border-core-border rounded-xl p-4 overflow-auto">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-core-green mb-3">Tasks ({clientTasks.length})</h3>
            {clientTasks.length === 0 ? (
              <div className="text-center py-10 text-core-text-muted text-[13px]">No tasks for this client.</div>
            ) : clientTasks.map(t => (
              <div key={t.id} className="px-3 py-2.5 border-b border-core-border flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                <span className={`flex-1 text-[13px] ${t.status === 'done' ? 'text-core-text-muted line-through' : 'text-core-text'}`}>{t.title}</span>
                <span className="text-[10px] text-core-text-dim uppercase">{t.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add Credential Modal */}
        {showCredModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
            <div className="bg-core-card border border-core-border rounded-2xl p-6 w-[360px]">
              <div className="flex justify-between mb-4">
                <h3 className="m-0 text-base font-extrabold">Add Credential</h3>
                <button onClick={() => setShowCredModal(false)} className="bg-transparent border-0 text-core-text-dim cursor-pointer hover:text-core-text">
                  <X size={20} />
                </button>
              </div>
              {[
                { label: 'Service', val: credService, set: setCredService, placeholder: 'e.g. Stripe' },
                { label: 'Username', val: credUser, set: setCredUser, placeholder: 'Username or email' },
                { label: 'Password', val: credPass, set: setCredPass, placeholder: 'Password or API key' },
              ].map(f => (
                <div key={f.label} className="mb-3.5">
                  <label className="block text-[10px] font-extrabold uppercase tracking-[1.2px] text-core-text-dim mb-1">{f.label}</label>
                  <input
                    value={f.val}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 bg-core-bg border border-core-border rounded-lg text-core-text text-[13px] outline-none box-border"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowCredModal(false)} className="px-4 py-2 bg-transparent border border-core-border rounded-lg text-core-text-dim cursor-pointer text-xs">Cancel</button>
                <button
                  onClick={handleAddCred}
                  disabled={!credService.trim()}
                  className={`px-4 py-2 border-0 rounded-lg text-xs font-bold transition-colors ${
                    credService.trim() ? 'bg-core-green text-core-bg cursor-pointer' : 'bg-core-border text-core-text-muted cursor-not-allowed'
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // List view
  return (
    <div className="h-full flex flex-col bg-core-bg text-core-text">
      {/* Header */}
      <div className="px-6 py-5 border-b border-core-border flex justify-between items-center">
        <div>
          <h2 className="m-0 text-[22px] font-extrabold">Clients</h2>
          <p className="m-0 mt-1 text-[13px] text-core-green opacity-80">Manage your relationships and assets.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-9 h-9 rounded-lg bg-core-green text-core-bg border-0 cursor-pointer flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full px-3.5 py-2.5 bg-core-card border border-core-border rounded-[10px] text-core-text text-[13px] outline-none box-border"
        />
      </div>

      {/* Client Grid */}
      <div className="flex-1 overflow-auto px-6 pb-6 grid gap-3.5 content-start"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
      >
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 text-core-text-muted flex flex-col items-center gap-3">
            <Briefcase size={40} className="opacity-30" />
            <p className="m-0 text-sm">No clients yet. Add one to get started.</p>
          </div>
        ) : filtered.map(client => (
          <div
            key={client.id}
            onClick={() => setSelectedId(client.id)}
            className="bg-core-card border border-core-border rounded-xl p-[18px] cursor-pointer transition-all hover:border-core-green hover:scale-[1.02]"
          >
            <div className="flex justify-between mb-3.5">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-core-green/15 flex items-center justify-center text-core-green text-lg font-extrabold">
                {client.name.charAt(0)}
              </div>
            </div>
            <h3 className="m-0 text-base font-bold">{client.name}</h3>
            <p className="m-0 mt-1 mb-3 text-xs text-core-text-dim">{client.industry || 'General Industry'}</p>
            <div className="flex gap-2">
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-[6px] text-core-text-dim">
                {projects.filter(p => p.clientId === client.id).length} Projects
              </span>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-[6px] text-core-text-dim">
                {client.credentials.length} Creds
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* New Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
          <div className="bg-core-card border border-core-border rounded-2xl p-6 w-[380px]">
            <div className="flex justify-between mb-4">
              <h3 className="m-0 text-base font-extrabold">Add New Client</h3>
              <button onClick={() => setShowModal(false)} className="bg-transparent border-0 text-core-text-dim cursor-pointer hover:text-core-text">
                <X size={20} />
              </button>
            </div>
            {[
              { label: 'Client Name', val: newName, set: setNewName, placeholder: 'e.g. Acme Corp' },
              { label: 'Industry', val: newIndustry, set: setNewIndustry, placeholder: 'e.g. Technology' },
              { label: 'Description', val: newDesc, set: setNewDesc, placeholder: 'Brief description (optional)' },
            ].map(f => (
              <div key={f.label} className="mb-3.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-[1.2px] text-core-text-dim mb-1">{f.label}</label>
                <input
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 bg-core-bg border border-core-border rounded-lg text-core-text text-[13px] outline-none box-border"
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-transparent border border-core-border rounded-lg text-core-text-dim cursor-pointer text-xs">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className={`px-4 py-2 border-0 rounded-lg text-xs font-bold transition-colors ${
                  newName.trim() ? 'bg-core-green text-core-bg cursor-pointer' : 'bg-core-border text-core-text-muted cursor-not-allowed'
                }`}
              >
                Create Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
