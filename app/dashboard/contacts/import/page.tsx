'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, ArrowRight, Download, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react'

interface ColumnMapping {
  csvColumn: string
  mapTo: string
}

interface ImportError {
  row: number
  name: string
  error: string
}

const fieldOptions = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Tags', 'Source', 'Skip']

// Guess the target field from a CSV header name.
function guessMapping(header: string): string {
  const h = header.toLowerCase().trim()
  if (h.includes('first')) return 'First Name'
  if (h.includes('last') || h.includes('surname')) return 'Last Name'
  if (h.includes('email') || h === 'e-mail') return 'Email'
  if (h.includes('phone') || h.includes('mobile') || h.includes('cell')) return 'Phone'
  if (h.includes('company') || h.includes('organization') || h.includes('organisation') || h.includes('business')) return 'Company'
  if (h.includes('tag')) return 'Tags'
  if (h.includes('source') || h.includes('origin')) return 'Source'
  if (h === 'name' || h.includes('full name') || h.includes('contact')) return 'First Name'
  return 'Skip'
}

// Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes, embedded newlines.
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const records: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { row.push(field); field = '' }
      else if (ch === '\r') { /* ignore, handle on \n */ }
      else if (ch === '\n') { row.push(field); records.push(row); row = []; field = '' }
      else field += ch
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); records.push(row) }

  const nonEmpty = records.filter(r => r.some(c => c.trim() !== ''))
  if (nonEmpty.length === 0) return { headers: [], rows: [] }

  const headers = nonEmpty[0].map(h => h.trim())
  const rows = nonEmpty.slice(1).map(r => {
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim() })
    return obj
  })
  return { headers, rows }
}

interface BuiltContact {
  firstName: string
  lastName: string
  email: string
  phone: string
  companyName: string
  tags: string[]
  source: string
}

function buildContact(row: Record<string, string>, mappings: ColumnMapping[]): BuiltContact {
  const c: BuiltContact = { firstName: '', lastName: '', email: '', phone: '', companyName: '', tags: [], source: '' }
  for (const m of mappings) {
    const val = (row[m.csvColumn] ?? '').trim()
    if (!val) continue
    switch (m.mapTo) {
      case 'First Name': c.firstName = c.firstName ? `${c.firstName} ${val}` : val; break
      case 'Last Name': c.lastName = val; break
      case 'Email': c.email = val; break
      case 'Phone': c.phone = val; break
      case 'Company': c.companyName = val; break
      case 'Tags': c.tags = val.split(/[,;|]/).map(t => t.trim()).filter(Boolean); break
      case 'Source': c.source = val; break
    }
  }
  return c
}

export default function ImportContactsPage() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [parseError, setParseError] = useState('')
  const [pasteText, setPasteText] = useState('')

  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importDone, setImportDone] = useState(false)
  const [successCount, setSuccessCount] = useState(0)
  const [importErrors, setImportErrors] = useState<ImportError[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadCSVText = useCallback((text: string, name: string) => {
    setParseError('')
    const { headers: hdrs, rows: parsed } = parseCSV(text)
    if (hdrs.length === 0 || parsed.length === 0) {
      setParseError('Could not parse any rows from this CSV. Make sure it has a header row and at least one data row.')
      return
    }
    setFileName(name)
    setHeaders(hdrs)
    setRows(parsed)
    setMappings(hdrs.map(h => ({ csvColumn: h, mapTo: guessMapping(h) })))
    setStep('mapping')
  }, [])

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setParseError('Please select a .csv file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => loadCSVText(String(reader.result || ''), file.name)
    reader.onerror = () => setParseError('Failed to read the file.')
    reader.readAsText(file)
  }, [loadCSVText])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }, [])
  const handleDragLeave = useCallback(() => setIsDragOver(false), [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const updateMapping = (index: number, value: string) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, mapTo: value } : m))
  }

  const previewContacts = rows.map(r => buildContact(r, mappings))

  async function runImport() {
    setImporting(true)
    setImportDone(false)
    setImportProgress(0)
    setSuccessCount(0)
    setImportErrors([])

    let success = 0
    const errors: ImportError[] = []

    for (let i = 0; i < previewContacts.length; i++) {
      const c = previewContacts[i]
      const displayName = `${c.firstName} ${c.lastName}`.trim() || c.email || c.phone || `Row ${i + 1}`
      setImportProgress(i + 1)
      try {
        const res = await fetch('/api/crm/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email || undefined,
            phone: c.phone || undefined,
            companyName: c.companyName || undefined,
            tags: c.tags.length ? c.tags : undefined,
            source: c.source || 'CSV Import',
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || data.details || `HTTP ${res.status}`)
        success++
      } catch (err) {
        errors.push({ row: i + 1, name: displayName, error: err instanceof Error ? err.message : 'Request failed' })
      }
    }

    setSuccessCount(success)
    setImportErrors(errors)
    setImporting(false)
    setImportDone(true)
  }

  function resetAll() {
    setStep('upload')
    setFileName(null)
    setHeaders([])
    setRows([])
    setMappings([])
    setParseError('')
    setPasteText('')
    setImporting(false)
    setImportProgress(0)
    setImportDone(false)
    setSuccessCount(0)
    setImportErrors([])
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
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />
          <div
            className={`jp-import-dropzone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
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
              Supports .csv files — parsed in your browser
            </div>
          </div>

          {parseError && (
            <div className="mt-4 flex items-center gap-2 rounded-[var(--jp-radius-sm)] border border-core-red/40 bg-core-red/10 px-4 py-3 text-sm text-core-red">
              <AlertCircle size={16} className="shrink-0" />
              {parseError}
            </div>
          )}

          {/* Paste option */}
          <div className="jp-card mt-6">
            <div className="jp-card-header">
              <h4>Or paste CSV text</h4>
            </div>
            <div className="jp-card-body">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'First Name,Last Name,Email,Phone,Company,Tags\nJohn,Smith,john@example.com,+15550101,TechFlow,"lead,warm"'}
                rows={6}
                className="w-full px-3.5 py-2.5 bg-core-bg border border-core-border rounded-[var(--jp-radius-sm)] text-sm text-core-text font-mono outline-none resize-y"
              />
            </div>
            <div className="jp-card-footer flex justify-end">
              <button
                className="jp-btn jp-btn-primary"
                disabled={!pasteText.trim()}
                onClick={() => loadCSVText(pasteText, 'pasted-data.csv')}
              >
                Parse Pasted CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && (
        <div className="jp-card">
          <div className="jp-card-header">
            <h4 className="flex items-center gap-2"><FileText size={16} /> Map Columns — {fileName}</h4>
            <span className="text-[0.8125rem] text-core-text-dim">{headers.length} columns · {rows.length} rows detected</span>
          </div>
          <div className="jp-card-body">
            <div className="flex flex-col gap-4">
              {mappings.map((m, i) => (
                <div key={`${m.csvColumn}-${i}`} className="flex items-center gap-4">
                  <div className="flex-1 px-3.5 py-2.5 bg-core-bg border border-core-border rounded-[var(--jp-radius-sm)] text-sm text-core-text font-mono truncate">
                    {m.csvColumn || <span className="text-core-text-muted">(empty header)</span>}
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
            <button className="jp-btn jp-btn-outline" onClick={resetAll}>Back</button>
            <button className="jp-btn jp-btn-primary" onClick={() => setStep('preview')}>Preview Import</button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Import */}
      {step === 'preview' && (
        <div className="jp-card">
          <div className="jp-card-header">
            <h4>Import Preview</h4>
            {!importDone && (
              <span className="text-sm text-core-green font-semibold">
                {previewContacts.length} contacts ready
              </span>
            )}
          </div>

          {/* Results banner after import */}
          {importDone && (
            <div className="jp-card-body border-b border-core-border">
              <div className="flex items-center gap-2 text-sm font-semibold text-core-green mb-2">
                <CheckCircle2 size={18} />
                Imported {successCount} of {previewContacts.length} contacts
              </div>
              {importErrors.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-core-red mb-2">
                    <AlertCircle size={16} />
                    {importErrors.length} failed
                  </div>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {importErrors.map((e) => (
                      <div key={e.row} className="text-xs text-core-text-muted font-mono bg-core-bg border border-core-border rounded-[var(--jp-radius-xs)] px-2.5 py-1.5">
                        Row {e.row} ({e.name}): {e.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                {previewContacts.slice(0, 100).map((c, i) => (
                  <tr key={i}>
                    <td className="font-medium">{`${c.firstName} ${c.lastName}`.trim() || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.companyName || '—'}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((tag, ti) => (
                          <span key={ti} className="jp-contact-tag">{tag}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewContacts.length > 100 && (
              <div className="px-4 py-2 text-xs text-core-text-muted">
                Showing first 100 of {previewContacts.length} parsed rows. All {previewContacts.length} will be imported.
              </div>
            )}
          </div>

          <div className="jp-card-footer flex justify-between items-center">
            {importDone ? (
              <>
                <button className="jp-btn jp-btn-outline" onClick={resetAll}>Import Another File</button>
                <span className="text-sm text-core-text-muted">Done</span>
              </>
            ) : (
              <>
                <button className="jp-btn jp-btn-outline" onClick={() => setStep('mapping')} disabled={importing}>
                  Back to Mapping
                </button>
                <button className="jp-btn jp-btn-primary px-6 py-2.5" onClick={runImport} disabled={importing || previewContacts.length === 0}>
                  {importing ? (
                    <>
                      <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                      Importing {importProgress}/{previewContacts.length}…
                    </>
                  ) : (
                    <>
                      <Download size={16} strokeWidth={2} />
                      Import {previewContacts.length} Contacts
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
