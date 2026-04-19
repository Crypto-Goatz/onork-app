'use client'

import { useState } from 'react'
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
    const val = prompt(`Enter ${field === 'driveLink' ? 'Drive link' : field === 'slackChannel' ? 'Slack channel' : 'GitHub repo'}:`, (selected as any)[field] || '')
    if (val !== null) onUpdateClient({ ...selected, [field]: val })
  }

  // Detail view
  if (selected) {
    const clientProjects = projects.filter(p => p.clientId === selected.id)
    const clientTasks = tasks.filter(t => t.clientId === selected.id)

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#f0f4f8', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', color: '#7ed957', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            &larr; Back
          </button>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#7ed957', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d1117', fontSize: 22, fontWeight: 800 }}>
            {selected.name.charAt(0)}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{selected.name}</h2>
            <span style={{ fontSize: 13, color: '#8b95a5' }}>{selected.industry || 'General'} {selected.description ? ` -- ${selected.description}` : ''}</span>
          </div>
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, flex: 1 }}>
          {/* Left: Integrations + Credentials */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Integration links */}
            <div>
              <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#7ed957', marginBottom: 12 }}>Integrations</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Drive', field: 'driveLink' as const, icon: '\u{1F4C1}' },
                  { label: 'Slack', field: 'slackChannel' as const, icon: '\u{1F4AC}' },
                  { label: 'GitHub', field: 'githubRepo' as const, icon: '\u{1F4BB}' },
                ].map(item => (
                  <button
                    key={item.field}
                    onClick={() => handleUpdateLink(item.field)}
                    style={{
                      padding: '14px 12px', background: '#161b22', border: '1px solid #1e293b', borderRadius: 10,
                      color: '#f0f4f8', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#7ed957')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}
                  >
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: (selected as any)[item.field] ? '#7ed957' : '#3d4654', marginTop: 2 }}>
                      {(selected as any)[item.field] ? 'Connected' : 'Not set'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Credentials */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#7ed957', margin: 0 }}>Credentials Vault</h3>
                <button onClick={() => setShowCredModal(true)} style={{ background: '#7ed957', color: '#0d1117', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
              </div>
              <div style={{ background: '#161b22', border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' }}>
                {selected.credentials.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#3d4654', fontSize: 13, fontStyle: 'italic' }}>No credentials stored.</div>
                ) : (
                  selected.credentials.map(cred => (
                    <div key={cred.id} style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4f8' }}>{cred.service}</div>
                        <div style={{ fontSize: 11, color: '#8b95a5', marginTop: 2 }}>User: <span style={{ fontFamily: 'monospace', color: '#a0aec0' }}>{cred.username}</span></div>
                        {cred.password && (
                          <div style={{ fontSize: 11, color: '#8b95a5', marginTop: 2 }}>
                            Pass: <span style={{ fontFamily: 'monospace', color: '#a0aec0' }}>{showPasswords[cred.id] ? cred.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}</span>
                            <button
                              onClick={() => setShowPasswords(p => ({ ...p, [cred.id]: !p[cred.id] }))}
                              style={{ background: 'none', border: 'none', color: '#7ed957', cursor: 'pointer', fontSize: 10, marginLeft: 8 }}
                            >
                              {showPasswords[cred.id] ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleDeleteCred(cred.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>x</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Projects */}
            <div>
              <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#7ed957', marginBottom: 12 }}>Projects</h3>
              {clientProjects.length === 0 ? (
                <div style={{ color: '#3d4654', fontSize: 13, fontStyle: 'italic' }}>No projects yet.</div>
              ) : clientProjects.map(p => (
                <div key={p.id} style={{ background: '#161b22', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 6, background: p.status === 'active' ? 'rgba(126,217,87,0.15)' : 'rgba(139,149,165,0.15)', color: p.status === 'active' ? '#7ed957' : '#8b95a5' }}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Tasks */}
          <div style={{ background: '#161b22', border: '1px solid #1e293b', borderRadius: 12, padding: 16, overflow: 'auto' }}>
            <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#7ed957', marginBottom: 12 }}>Tasks ({clientTasks.length})</h3>
            {clientTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#3d4654', fontSize: 13 }}>No tasks for this client.</div>
            ) : clientTasks.map(t => (
              <div key={t.id} style={{ padding: '10px 12px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#7ed957' }} />
                <span style={{ flex: 1, fontSize: 13, color: t.status === 'done' ? '#3d4654' : '#f0f4f8', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
                <span style={{ fontSize: 10, color: '#8b95a5', textTransform: 'uppercase' }}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add Credential Modal */}
        {showCredModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: '#161b22', border: '1px solid #1e293b', borderRadius: 14, padding: 24, width: 360 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Add Credential</h3>
                <button onClick={() => setShowCredModal(false)} style={{ background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 18 }}>x</button>
              </div>
              {[
                { label: 'Service', val: credService, set: setCredService, placeholder: 'e.g. Stripe' },
                { label: 'Username', val: credUser, set: setCredUser, placeholder: 'Username or email' },
                { label: 'Password', val: credPass, set: setCredPass, placeholder: 'Password or API key' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8b95a5', marginBottom: 4 }}>{f.label}</label>
                  <input
                    value={f.val}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, color: '#f0f4f8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button onClick={() => setShowCredModal(false)} style={{ padding: '8px 16px', background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#8b95a5', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                <button onClick={handleAddCred} disabled={!credService.trim()} style={{ padding: '8px 16px', background: credService.trim() ? '#7ed957' : '#1e293b', color: '#0d1117', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: credService.trim() ? 'pointer' : 'not-allowed' }}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // List view
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#f0f4f8' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Clients</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7ed957', opacity: 0.8 }}>Manage your relationships and assets.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ width: 36, height: 36, borderRadius: 8, background: '#7ed957', color: '#0d1117', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >+</button>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 24px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          style={{ width: '100%', padding: '10px 14px', background: '#161b22', border: '1px solid #1e293b', borderRadius: 10, color: '#f0f4f8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Client Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, alignContent: 'start' }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: '#3d4654' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>&#128188;</div>
            <p>No clients yet. Add one to get started.</p>
          </div>
        ) : filtered.map(client => (
          <div
            key={client.id}
            onClick={() => setSelectedId(client.id)}
            style={{
              background: '#161b22', border: '1px solid #1e293b', borderRadius: 12, padding: 18, cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7ed957'; e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(126,217,87,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7ed957', fontSize: 18, fontWeight: 800 }}>
                {client.name.charAt(0)}
              </div>
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{client.name}</h3>
            <p style={{ margin: '4px 0 12px', fontSize: 12, color: '#8b95a5' }}>{client.industry || 'General Industry'}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, color: '#8b95a5' }}>
                {projects.filter(p => p.clientId === client.id).length} Projects
              </span>
              <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, color: '#8b95a5' }}>
                {client.credentials.length} Creds
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* New Client Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#161b22', border: '1px solid #1e293b', borderRadius: 14, padding: 24, width: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Add New Client</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 18 }}>x</button>
            </div>
            {[
              { label: 'Client Name', val: newName, set: setNewName, placeholder: 'e.g. Acme Corp' },
              { label: 'Industry', val: newIndustry, set: setNewIndustry, placeholder: 'e.g. Technology' },
              { label: 'Description', val: newDesc, set: setNewDesc, placeholder: 'Brief description (optional)' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8b95a5', marginBottom: 4 }}>{f.label}</label>
                <input
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, color: '#f0f4f8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#8b95a5', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              <button onClick={handleCreate} disabled={!newName.trim()} style={{ padding: '8px 16px', background: newName.trim() ? '#7ed957' : '#1e293b', color: '#0d1117', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: newName.trim() ? 'pointer' : 'not-allowed' }}>Create Client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
