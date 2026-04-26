'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Globe, Loader2, AlertTriangle, RefreshCw, CheckCircle,
  PauseCircle, FileEdit, Zap,
} from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

interface Workflow {
  id: string
  name: string
  status: string
  version: number
}

export default function WorkflowsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workflowList, setWorkflowList] = useState<Workflow[]>([])

  const loadWorkflows = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await crm.workflows.list()
      setWorkflowList(data.workflows || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadWorkflows() }, [loadWorkflows])

  const statusBadge = (status: string) => {
    const s = status?.toLowerCase()
    if (s === 'active' || s === 'published') return 'bg-[#7ed957]/10 text-[#7ed957]'
    if (s === 'draft') return 'bg-yellow-500/10 text-yellow-400'
    if (s === 'inactive' || s === 'disabled') return 'bg-white/[0.06] text-white/30'
    return 'bg-white/[0.06] text-white/40'
  }

  const statusIcon = (status: string) => {
    const s = status?.toLowerCase()
    if (s === 'active' || s === 'published') return <CheckCircle className="w-3 h-3" />
    if (s === 'draft') return <FileEdit className="w-3 h-3" />
    if (s === 'inactive' || s === 'disabled') return <PauseCircle className="w-3 h-3" />
    return <Zap className="w-3 h-3" />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#7ed957]" />
            Workflows
          </h1>
          <p className="text-xs text-white/40 mt-1">
            {workflowList.length} workflow{workflowList.length !== 1 ? 's' : ''} in your CRM
          </p>
        </div>
        <button
          onClick={() => { loadWorkflows(); toast.success('Workflows refreshed') }}
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

      {/* Workflow Table */}
      {!loading && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          {workflowList.length === 0 ? (
            <div className="text-center py-16">
              <Globe className="w-10 h-10 mx-auto text-white/10 mb-3" />
              <p className="text-white/40 text-sm">No workflows found</p>
              <p className="text-white/20 text-xs mt-1">Workflows created in your CRM will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Workflow</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Version</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">ID</th>
                </tr>
              </thead>
              <tbody>
                {workflowList.map(wf => (
                  <tr key={wf.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center shrink-0">
                          <Zap className="w-3.5 h-3.5 text-[#00d4ff]" />
                        </div>
                        <span className="text-sm font-semibold text-white">{wf.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusBadge(wf.status)}`}>
                        {statusIcon(wf.status)}
                        {wf.status?.charAt(0).toUpperCase() + wf.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40 font-mono">
                      v{wf.version || 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono text-white/20">{wf.id}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
