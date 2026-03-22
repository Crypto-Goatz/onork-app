'use client'

import { useState, useCallback } from 'react'

interface ColumnMapping {
  csvColumn: string
  mapTo: string
}

const fieldOptions = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Tags', 'Source', 'Skip']

const mockPreviewData = [
  { 'Name': 'John Smith', 'Email Address': 'john@example.com', 'Phone': '+1-555-0101', 'Company': 'TechFlow', 'Tags': 'lead,warm' },
  { 'Name': 'Emily Davis', 'Email Address': 'emily@startup.io', 'Phone': '+1-555-0102', 'Company': 'Startup Inc', 'Tags': 'vip' },
  { 'Name': 'Marcus Lee', 'Email Address': 'marcus@enterprise.co', 'Phone': '+1-555-0103', 'Company': 'Enterprise Co', 'Tags': 'enterprise' },
  { 'Name': 'Priya Patel', 'Email Address': 'priya@agency.net', 'Phone': '+1-555-0104', 'Company': 'Digital Agency', 'Tags': 'agency,active' },
  { 'Name': 'Alex Rivera', 'Email Address': 'alex@corp.com', 'Phone': '+1-555-0105', 'Company': 'Rivera Corp', 'Tags': 'prospect' },
]

export default function ImportContactsPage() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([
    { csvColumn: 'Name', mapTo: 'First Name' },
    { csvColumn: 'Email Address', mapTo: 'Email' },
    { csvColumn: 'Phone', mapTo: 'Phone' },
    { csvColumn: 'Company', mapTo: 'Company' },
    { csvColumn: 'Tags', mapTo: 'Tags' },
  ])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setFileName('contacts-export.csv')
    setStep('mapping')
  }, [])

  const handleFileSelect = () => {
    setFileName('contacts-export.csv')
    setStep('mapping')
  }

  const updateMapping = (index: number, value: string) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, mapTo: value } : m))
  }

  return (
    <div>
      <div className="jp-page-header">
        <h1 className="jp-page-title">Import Contacts</h1>
        <p className="jp-page-subtitle">Upload a CSV file to bulk import contacts into 0nCore</p>
      </div>

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {['Upload', 'Map Columns', 'Preview & Import'].map((label, i) => {
          const stepKeys = ['upload', 'mapping', 'preview'] as const
          const isActive = stepKeys.indexOf(step) >= i
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: isActive ? 'var(--jp-green)' : 'var(--jp-border-hi)',
                color: isActive ? '#000' : 'var(--jp-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}>
                {i + 1}
              </div>
              <span style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: isActive ? 'var(--jp-text)' : 'var(--jp-text-muted)',
              }}>
                {label}
              </span>
              {i < 2 && (
                <div style={{
                  width: 40,
                  height: 2,
                  background: isActive && stepKeys.indexOf(step) > i ? 'var(--jp-green)' : 'var(--jp-border)',
                  marginLeft: 8,
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          className={`jp-import-dropzone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileSelect}
        >
          <div className="jp-import-dropzone-icon">
            <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="jp-import-dropzone-title">
            {isDragOver ? 'Drop your CSV file here' : 'Drag & drop a CSV file here'}
          </div>
          <div className="jp-import-dropzone-text">
            or click to browse files
          </div>
          <div className="jp-import-dropzone-hint">
            Supports .csv files up to 10MB
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && (
        <div className="jp-card">
          <div className="jp-card-header">
            <h4>Map Columns — {fileName}</h4>
            <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>5 columns detected</span>
          </div>
          <div className="jp-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mappings.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: 'var(--jp-bg-input)',
                    border: '1px solid var(--jp-border)',
                    borderRadius: 'var(--jp-radius-sm)',
                    fontSize: '0.875rem',
                    color: 'var(--jp-text)',
                    fontFamily: 'monospace',
                  }}>
                    {m.csvColumn}
                  </div>
                  <svg width="20" height="20" fill="none" stroke="var(--jp-green)" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <select
                    value={m.mapTo}
                    onChange={(e) => updateMapping(i, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      background: 'var(--jp-bg-input)',
                      border: '1px solid var(--jp-border)',
                      borderRadius: 'var(--jp-radius-sm)',
                      fontSize: '0.875rem',
                      color: 'var(--jp-text)',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {fieldOptions.map(opt => (
                      <option key={opt} value={opt} style={{ background: 'var(--jp-bg-card)' }}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="jp-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="jp-btn jp-btn-outline" onClick={() => setStep('upload')}>Back</button>
            <button className="jp-btn jp-btn-primary" onClick={() => setStep('preview')}>Preview Import</button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="jp-card">
          <div className="jp-card-header">
            <h4>Import Preview</h4>
            <span style={{ fontSize: '0.875rem', color: 'var(--jp-green)', fontWeight: 600 }}>
              {mockPreviewData.length} contacts ready
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="jp-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Company</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {mockPreviewData.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{row.Name}</td>
                    <td>{row['Email Address']}</td>
                    <td>{row.Phone}</td>
                    <td>{row.Company}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {row.Tags.split(',').map(tag => (
                          <span key={tag} className="jp-contact-tag">{tag.trim()}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="jp-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="jp-btn jp-btn-outline" onClick={() => setStep('mapping')}>Back to Mapping</button>
            <button className="jp-btn jp-btn-primary" style={{ padding: '10px 24px' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import {mockPreviewData.length} Contacts
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
