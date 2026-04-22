'use client'

import { useState, useCallback } from 'react'
import { Upload, ArrowRight, Download } from 'lucide-react'

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

  const stepKeys = ['upload', 'mapping', 'preview'] as const

  return (
    <div>
      <div className="jp-page-header">
        <h1 className="jp-page-title">Import Contacts</h1>
        <p className="jp-page-subtitle">Upload a CSV file to bulk import contacts into 0nCore</p>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2 mb-8">
        {['Upload', 'Map Columns', 'Preview & Import'].map((label, i) => {
          const isActive = stepKeys.indexOf(step) >= i
          const isConnectorActive = isActive && stepKeys.indexOf(step) > i
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-core-green text-black' : 'bg-core-border text-core-text-muted'}`}>
                {i + 1}
              </div>
              <span className={`text-[0.8125rem] font-medium ${isActive ? 'text-core-text' : 'text-core-text-muted'}`}>
                {label}
              </span>
              {i < 2 && (
                <div className={`w-10 h-0.5 ml-2 ${isConnectorActive ? 'bg-core-green' : 'bg-core-border'}`} />
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
            <Upload size={48} strokeWidth={1.25} />
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
            <span className="text-[0.8125rem] text-core-text-dim">5 columns detected</span>
          </div>
          <div className="jp-card-body">
            <div className="flex flex-col gap-4">
              {mappings.map((m, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex-1 px-3.5 py-2.5 bg-core-bg border border-core-border rounded-[var(--jp-radius-sm)] text-sm text-core-text font-mono">
                    {m.csvColumn}
                  </div>
                  <ArrowRight size={20} strokeWidth={2} className="text-core-green shrink-0" />
                  <select
                    value={m.mapTo}
                    onChange={(e) => updateMapping(i, e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-core-bg border border-core-border rounded-[var(--jp-radius-sm)] text-sm text-core-text outline-none cursor-pointer"
                  >
                    {fieldOptions.map(opt => (
                      <option key={opt} value={opt} className="bg-core-card">{opt}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="jp-card-footer flex justify-end gap-3">
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
            <span className="text-sm text-core-green font-semibold">
              {mockPreviewData.length} contacts ready
            </span>
          </div>
          <div className="overflow-x-auto">
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
                    <td className="font-medium">{row.Name}</td>
                    <td>{row['Email Address']}</td>
                    <td>{row.Phone}</td>
                    <td>{row.Company}</td>
                    <td>
                      <div className="flex gap-1">
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
          <div className="jp-card-footer flex justify-between items-center">
            <button className="jp-btn jp-btn-outline" onClick={() => setStep('mapping')}>Back to Mapping</button>
            <button className="jp-btn jp-btn-primary px-6 py-2.5">
              <Download size={16} strokeWidth={2} />
              Import {mockPreviewData.length} Contacts
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
