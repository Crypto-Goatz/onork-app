'use client'

import { useEffect, useState } from 'react'

interface Workflow {
  name: string
  path: string
  type?: string
  version?: string
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [running, setRunning] = useState<string | null>(null)
  const [result, setResult] = useState<{ name: string; status: string; message: string } | null>(null)

  useEffect(() => {
    fetchWorkflows()
  }, [])

  async function fetchWorkflows() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/workflows')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch workflows')
      setWorkflows(data.workflows || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }

  async function runWorkflow(name: string) {
    setRunning(name)
    setResult(null)
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: name }),
      })
      const data = await res.json()
      setResult({
        name,
        status: data.status || (res.ok ? 'completed' : 'failed'),
        message: data.message || (res.ok ? 'Workflow completed successfully' : 'Workflow failed'),
      })
    } catch {
      setResult({ name, status: 'failed', message: 'Failed to connect to 0nMCP' })
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-core-text">Workflows</h1>
          <p className="text-sm text-core-text-dim mt-1">
            Manage and run .0n SWITCH files. {workflows.length > 0 && `${workflows.length} available`}
          </p>
        </div>
        <button className="bg-core-green text-core-bg font-medium text-sm px-4 py-2 rounded-lg hover:brightness-110 transition-all">
          Create Workflow
        </button>
      </div>

      {/* Result Banner */}
      {result && (
        <div
          className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${
            result.status === 'completed'
              ? 'bg-core-green/10 border border-core-green/20 text-core-green'
              : 'bg-red-500/10 border border-red-500/20 text-core-red'
          }`}
        >
          <span>
            <strong>{result.name}</strong>: {result.message}
          </span>
          <button onClick={() => setResult(null)} className="hover:opacity-70">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-core-card border border-core-border rounded-xl p-8 text-center">
          <div className="text-core-red text-sm mb-3">{error}</div>
          <button onClick={fetchWorkflows} className="text-sm text-core-green hover:underline">
            Try again
          </button>
        </div>
      ) : workflows.length === 0 ? (
        <div className="bg-core-card border border-core-border rounded-xl p-12 text-center">
          <svg className="w-12 h-12 text-core-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-core-text-dim text-sm mb-2">No workflows deployed yet.</p>
          <p className="text-core-text-muted text-xs">Create .0n SWITCH files or connect to a running 0nMCP server.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.path}
              className="bg-core-card border border-core-border rounded-xl p-5 hover:border-core-border-hi transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-core-text">{wf.name}</h3>
                  {wf.type && (
                    <span className="text-xs text-core-text-muted">{wf.type}</span>
                  )}
                </div>
                {wf.version && (
                  <span className="text-xs text-core-cyan bg-core-cyan/10 px-2 py-0.5 rounded">
                    v{wf.version}
                  </span>
                )}
              </div>

              <div className="text-xs text-core-text-muted font-mono truncate mb-4">
                {wf.path}
              </div>

              <button
                onClick={() => runWorkflow(wf.name)}
                disabled={running === wf.name}
                className="w-full text-sm font-medium py-2 rounded-lg bg-core-green/10 text-core-green border border-core-green/20 hover:bg-core-green/20 transition-all disabled:opacity-50"
              >
                {running === wf.name ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border border-core-green border-t-transparent rounded-full animate-spin" />
                    Running...
                  </span>
                ) : (
                  'Run'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
