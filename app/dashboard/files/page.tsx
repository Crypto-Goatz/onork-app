'use client'

import { useState } from 'react'

type FileTab = 'all' | 'workflows' | 'vault' | 'exports' | 'brains'
type ViewMode = 'grid' | 'list'

interface FileItem {
  id: string
  name: string
  type: 'workflow' | 'vault' | 'export' | 'brain'
  ext: string
  size: string
  modified: string
  encrypted?: boolean
}

const mockFiles: FileItem[] = [
  { id: '1', name: 'crm-onboarding.0n', type: 'workflow', ext: '.0n', size: '2.4 KB', modified: 'Mar 22, 2026' },
  { id: '2', name: 'stripe-setup.0n', type: 'workflow', ext: '.0n', size: '1.8 KB', modified: 'Mar 21, 2026' },
  { id: '3', name: 'vault-credentials.0nv', type: 'vault', ext: '.0nv', size: '4.1 KB', modified: 'Mar 20, 2026', encrypted: true },
  { id: '4', name: '0nai-crm-v1.jsonl', type: 'export', ext: '.jsonl', size: '45 KB', modified: 'Mar 18, 2026' },
  { id: '5', name: 'mcpfed-brain.brain', type: 'brain', ext: '.brain', size: '128 KB', modified: 'Mar 15, 2026' },
  { id: '6', name: 'lead-nurture.0n', type: 'workflow', ext: '.0n', size: '3.2 KB', modified: 'Mar 14, 2026' },
  { id: '7', name: 'api-keys-backup.0nv', type: 'vault', ext: '.0nv', size: '2.7 KB', modified: 'Mar 12, 2026', encrypted: true },
  { id: '8', name: 'analytics-export.jsonl', type: 'export', ext: '.jsonl', size: '89 KB', modified: 'Mar 10, 2026' },
]

const typeColors: Record<string, string> = {
  '.0n': 'var(--jp-green)',
  '.0nv': 'var(--jp-purple)',
  '.jsonl': 'var(--jp-cyan)',
  '.brain': 'var(--jp-amber)',
}

const typeBg: Record<string, string> = {
  '.0n': 'var(--jp-green-glow)',
  '.0nv': 'rgba(167, 139, 250, 0.12)',
  '.jsonl': 'rgba(0, 212, 255, 0.12)',
  '.brain': 'rgba(251, 191, 36, 0.12)',
}

const typeIcons: Record<string, React.ReactNode> = {
  workflow: (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  vault: (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  export: (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  brain: (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
}

const tabs: { key: FileTab; label: string }[] = [
  { key: 'all', label: 'All Files' },
  { key: 'workflows', label: 'Workflows (.0n)' },
  { key: 'vault', label: 'Vault' },
  { key: 'exports', label: 'Exports' },
  { key: 'brains', label: 'Brains (.brain)' },
]

export default function FilesPage() {
  const [activeTab, setActiveTab] = useState<FileTab>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFiles = mockFiles
    .filter((f) => {
      if (activeTab === 'all') return true
      if (activeTab === 'workflows') return f.type === 'workflow'
      if (activeTab === 'vault') return f.type === 'vault'
      if (activeTab === 'exports') return f.type === 'export'
      if (activeTab === 'brains') return f.type === 'brain'
      return true
    })
    .filter((f) =>
      !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

  return (
    <div>
      <div className="jp-page-header">
        <h1 className="jp-page-title">File Manager</h1>
        <p className="jp-page-subtitle">Manage your .0n workflows, vault files, exports, and AI brains</p>
      </div>

      {/* Top Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="jp-search" style={{ flex: 1, minWidth: 200, maxWidth: 360 }}>
          <span className="jp-search-icon">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            className="jp-search-input"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--jp-border)', borderRadius: 'var(--jp-radius-sm)', overflow: 'hidden' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '8px 12px',
              background: viewMode === 'grid' ? 'var(--jp-green-glow)' : 'transparent',
              border: 'none',
              color: viewMode === 'grid' ? 'var(--jp-green)' : 'var(--jp-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '8px 12px',
              background: viewMode === 'list' ? 'var(--jp-green-glow)' : 'transparent',
              border: 'none',
              borderLeft: '1px solid var(--jp-border)',
              color: viewMode === 'list' ? 'var(--jp-green)' : 'var(--jp-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>

        <button style={{
          padding: '9px 20px',
          background: 'var(--jp-green)',
          color: '#000',
          border: 'none',
          borderRadius: 'var(--jp-radius-sm)',
          fontSize: '0.8125rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 2,
        marginBottom: 20,
        borderBottom: '1px solid var(--jp-border)',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--jp-green)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: activeTab === tab.key ? 600 : 500,
              cursor: 'pointer',
              transition: 'all var(--jp-transition)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {filteredFiles.map((file) => (
            <div key={file.id} className="jp-card" style={{ cursor: 'pointer' }}>
              <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--jp-radius)',
                  background: typeBg[file.ext],
                  color: typeColors[file.ext],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {typeIcons[file.type]}
                </div>
                <div>
                  <div style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--jp-text)',
                    marginBottom: 4,
                    wordBreak: 'break-all',
                  }}>
                    {file.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: typeBg[file.ext],
                      color: typeColors[file.ext],
                    }}>
                      {file.ext}
                    </span>
                    {file.encrypted && (
                      <svg width="12" height="12" fill="none" stroke="var(--jp-purple)" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>
                  {file.size} &middot; {file.modified}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="jp-card">
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 80px 120px 80px',
            gap: 12,
            padding: '12px 20px',
            borderBottom: '1px solid var(--jp-border)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--jp-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <span>Name</span>
            <span>Type</span>
            <span>Size</span>
            <span>Modified</span>
            <span>Actions</span>
          </div>
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 80px 120px 80px',
                gap: 12,
                padding: '14px 20px',
                borderBottom: '1px solid var(--jp-border)',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background var(--jp-transition)',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--jp-bg-card-hover)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ color: typeColors[file.ext], display: 'flex', flexShrink: 0 }}>
                  {typeIcons[file.type]}
                </span>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--jp-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {file.name}
                </span>
                {file.encrypted && (
                  <svg width="12" height="12" fill="none" stroke="var(--jp-purple)" viewBox="0 0 24 24" strokeWidth={2} style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 6,
                background: typeBg[file.ext],
                color: typeColors[file.ext],
                display: 'inline-block',
                width: 'fit-content',
              }}>
                {file.ext}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>{file.size}</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-muted)' }}>{file.modified}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="jp-header-btn" title="Download" style={{ width: 30, height: 30 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button className="jp-header-btn" title="More" style={{ width: 30, height: 30 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredFiles.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 60,
          color: 'var(--jp-text-muted)',
        }}>
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1} style={{ margin: '0 auto 12px', display: 'block' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <div style={{ fontSize: '0.875rem' }}>No files found</div>
        </div>
      )}
    </div>
  )
}
