'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  FileSpreadsheet, Loader2, AlertTriangle, RefreshCw, ClipboardList,
  FileText, BarChart3, ExternalLink,
} from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

interface FormItem {
  id: string
  name: string
  type: string
}

interface SubmissionCount {
  formId: string
  count: number
}

export default function FormsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formList, setFormList] = useState<FormItem[]>([])
  const [subCounts, setSubCounts] = useState<Record<string, number>>({})
  const [expandedForm, setExpandedForm] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Array<{ id: string; contactId: string; createdAt: string; data: Record<string, unknown> }>>([])
  const [loadingSubs, setLoadingSubs] = useState(false)

  const loadForms = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await crm.forms.list({ limit: 100 })
      setFormList(data.forms || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadForms() }, [loadForms])

  const loadSubmissions = async (formId: string) => {
    if (expandedForm === formId) {
      setExpandedForm(null)
      return
    }
    setExpandedForm(formId)
    setLoadingSubs(true)
    try {
      const data = await crm.forms.submissions(formId, { limit: 20 })
      setSubmissions(data.submissions || [])
      setSubCounts(prev => ({ ...prev, [formId]: data.submissions?.length || 0 }))
    } catch {
      setSubmissions([])
    }
    setLoadingSubs(false)
  }

  const typeIcon = (type: string) => {
    const t = type?.toLowerCase()
    if (t === 'form' || t === 'form_builder') return <FileSpreadsheet className="w-4 h-4 text-[#7ed957]" />
    if (t === 'survey') return <ClipboardList className="w-4 h-4 text-[#00d4ff]" />
    return <FileText className="w-4 h-4 text-white/40" />
  }

  const typeBadge = (type: string) => {
    const t = type?.toLowerCase()
    if (t === 'form' || t === 'form_builder') return 'bg-[#7ed957]/10 text-[#7ed957]'
    if (t === 'survey') return 'bg-[#00d4ff]/10 text-[#00d4ff]'
    return 'bg-white/[0.06] text-white/40'
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#7ed957]" />
            Forms
          </h1>
          <p className="text-xs text-white/40 mt-1">
            {formList.length} form{formList.length !== 1 ? 's' : ''} and surveys
          </p>
        </div>
        <button
          onClick={() => { loadForms(); toast.success('Forms refreshed') }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-transparent text-white/50 text-xs font-medium cursor-pointer hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#7ed957]" />
        </div>
      )}

      {/* Forms Table */}
      {!loading && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          {formList.length === 0 ? (
            <div className="text-center py-16">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-white/10 mb-3" />
              <p className="text-white/40 text-sm">No forms found</p>
              <p className="text-white/20 text-xs mt-1">Forms and surveys from your CRM will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Form</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Submissions</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">ID</th>
                </tr>
              </thead>
              <tbody>
                {formList.map(form => (
                  <>
                    <tr key={form.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {typeIcon(form.type)}
                          <span className="text-sm font-semibold text-white">{form.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${typeBadge(form.type)}`}>
                          {form.type?.replace('_', ' ').charAt(0).toUpperCase() + form.type?.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => loadSubmissions(form.id)}
                          className="flex items-center gap-1 text-xs text-[#00d4ff] hover:text-[#00d4ff]/80 font-medium cursor-pointer bg-transparent border-none transition-colors"
                        >
                          <BarChart3 className="w-3 h-3" />
                          {subCounts[form.id] !== undefined ? `${subCounts[form.id]} submissions` : 'View submissions'}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-mono text-white/20">{form.id}</span>
                      </td>
                    </tr>
                    {/* Expanded submissions */}
                    {expandedForm === form.id && (
                      <tr key={`${form.id}-subs`}>
                        <td colSpan={4} className="px-4 py-3 bg-white/[0.01]">
                          {loadingSubs ? (
                            <div className="flex items-center gap-2 py-3 justify-center">
                              <Loader2 className="w-4 h-4 animate-spin text-[#7ed957]" />
                              <span className="text-xs text-white/40">Loading submissions...</span>
                            </div>
                          ) : submissions.length === 0 ? (
                            <p className="text-xs text-white/30 text-center py-3">No submissions yet</p>
                          ) : (
                            <div className="space-y-1.5">
                              {submissions.map(sub => (
                                <div key={sub.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-mono text-white/30">Contact: {sub.contactId?.slice(0, 12)}...</span>
                                  </div>
                                  <span className="text-[10px] text-white/20 shrink-0">
                                    {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '--'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
