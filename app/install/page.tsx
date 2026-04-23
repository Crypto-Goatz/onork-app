'use client'

import { useState } from 'react'
import {
  Download, Copy, Check, ExternalLink, Terminal, Globe,
  Zap, CheckCircle, Loader2, Trash2, RefreshCw, AlertCircle
} from 'lucide-react'

const MCP_REMOTE_URL = 'https://0nmcp-remote.0nmcp.workers.dev/mcp'
const NPX_COMMAND = 'npx -y 0nmcp'
const CLAUDE_CONFIG = `{
  "mcpServers": {
    "0nMCP": {
      "command": "npx",
      "args": ["-y", "0nmcp"]
    }
  }
}`

type Tab = 'claude' | 'cursor' | 'cli' | 'remote'
type CopiedKey = 'url' | 'npx' | 'config' | null

interface TestResult {
  success?: boolean
  email?: string
  password?: string
  user_id?: string
  results?: string[]
  error?: string
  exists?: boolean
  profile?: Record<string, unknown>
}

export default function InstallPage() {
  const [tab, setTab] = useState<Tab>('claude')
  const [copied, setCopied] = useState<CopiedKey>(null)

  // Test account state
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleCopy(text: string, key: CopiedKey) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2500)
  }

  async function handleTestAction(action: 'create' | 'delete' | 'status') {
    if (action === 'delete' && !confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setTestLoading(true)
    setTestResult(null)
    setConfirmDelete(false)
    try {
      const res = await fetch('/api/test-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      setTestResult(data)
    } catch {
      setTestResult({ error: 'Network error' })
    }
    setTestLoading(false)
  }

  const TABS: { key: Tab; label: string; icon: typeof Download }[] = [
    { key: 'claude', label: 'Claude Desktop', icon: Zap },
    { key: 'cursor', label: 'Cursor', icon: Terminal },
    { key: 'cli', label: 'CLI', icon: Terminal },
    { key: 'remote', label: 'Remote', icon: Globe },
  ]

  return (
    <div className="min-h-screen bg-core-bg flex flex-col items-center justify-start px-4 py-16">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-core-green to-core-cyan flex items-center justify-center mx-auto mb-4">
            <span className="text-lg font-black text-core-bg">0n</span>
          </div>
          <h1 className="text-3xl font-bold text-core-text mb-2">Install 0nMCP</h1>
          <p className="text-sm text-core-text-muted">1,554 tools. 96 services. One install.</p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-core-card border border-core-border rounded-xl overflow-hidden mb-6">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors ${
                  tab === t.key ? 'bg-core-green/15 text-core-green' : 'text-core-text-muted hover:text-core-text'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ═══ Claude Desktop ═══ */}
        {tab === 'claude' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-core-card border border-core-border rounded-xl p-6">
              <h2 className="text-lg font-bold text-core-text mb-1">Fastest: Remote MCP</h2>
              <p className="text-xs text-core-text-muted mb-4">No install needed. Connect directly from Claude Desktop.</p>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-core-text-dim mb-1">Step 1: Open Claude Desktop Settings</div>
                <p className="text-xs text-core-text-muted">Claude Desktop → Settings → MCP Servers → Add Custom MCP</p>

                <div className="text-xs font-semibold text-core-text-dim mb-1 mt-4">Step 2: Paste this URL</div>
                <div className="flex gap-2">
                  <code className="flex-1 bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-xs text-core-cyan font-mono truncate">
                    {MCP_REMOTE_URL}
                  </code>
                  <button onClick={() => handleCopy(MCP_REMOTE_URL, 'url')}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-core-green text-core-bg font-bold text-xs rounded-lg hover:brightness-110 transition-all shrink-0">
                    {copied === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === 'url' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="text-xs font-semibold text-core-text-dim mb-1 mt-4">Step 3: Say Hello</div>
                <p className="text-xs text-core-text-muted">Open a new chat and say "Hello" — 0nMCP will respond with your connection status.</p>
              </div>
            </div>

            <div className="bg-core-card border border-core-border rounded-xl p-6">
              <h2 className="text-sm font-bold text-core-text mb-1">Alternative: Local Install</h2>
              <p className="text-xs text-core-text-muted mb-4">Add this to your Claude Desktop config file.</p>

              <div className="relative">
                <pre className="bg-core-bg border border-core-border rounded-lg p-4 text-xs text-core-text-dim font-mono overflow-x-auto">{CLAUDE_CONFIG}</pre>
                <button onClick={() => handleCopy(CLAUDE_CONFIG, 'config')}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 bg-core-card border border-core-border rounded-md text-[10px] font-semibold text-core-text-muted hover:text-core-text transition-colors">
                  {copied === 'config' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === 'config' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Cursor ═══ */}
        {tab === 'cursor' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-core-card border border-core-border rounded-xl p-6">
              <h2 className="text-lg font-bold text-core-text mb-1">Cursor Setup</h2>
              <p className="text-xs text-core-text-muted mb-4">Add 0nMCP to Cursor's MCP configuration.</p>

              <div className="text-xs font-semibold text-core-text-dim mb-2">In Cursor Settings → MCP, add:</div>
              <div className="relative">
                <pre className="bg-core-bg border border-core-border rounded-lg p-4 text-xs text-core-text-dim font-mono overflow-x-auto">{CLAUDE_CONFIG}</pre>
                <button onClick={() => handleCopy(CLAUDE_CONFIG, 'config')}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 bg-core-card border border-core-border rounded-md text-[10px] font-semibold text-core-text-muted hover:text-core-text transition-colors">
                  {copied === 'config' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CLI ═══ */}
        {tab === 'cli' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-core-card border border-core-border rounded-xl p-6">
              <h2 className="text-lg font-bold text-core-text mb-1">Run from Terminal</h2>
              <p className="text-xs text-core-text-muted mb-4">Start the MCP server directly.</p>

              <div className="flex gap-2">
                <code className="flex-1 bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-xs text-core-green font-mono">
                  {NPX_COMMAND}
                </code>
                <button onClick={() => handleCopy(NPX_COMMAND, 'npx')}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-core-green text-core-bg font-bold text-xs rounded-lg hover:brightness-110 transition-all shrink-0">
                  {copied === 'npx' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === 'npx' ? 'Copied' : 'Copy'}
                </button>
              </div>

              <p className="text-xs text-core-text-muted mt-3">Or install globally: <code className="text-core-cyan">npm i -g 0nmcp</code></p>
            </div>
          </div>
        )}

        {/* ═══ Remote ═══ */}
        {tab === 'remote' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-core-card border border-core-border rounded-xl p-6">
              <h2 className="text-lg font-bold text-core-text mb-1">Remote MCP Server</h2>
              <p className="text-xs text-core-text-muted mb-4">No install. Works from any MCP client that supports remote servers.</p>

              <div className="flex gap-2 mb-4">
                <code className="flex-1 bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-xs text-core-cyan font-mono truncate">
                  {MCP_REMOTE_URL}
                </code>
                <button onClick={() => handleCopy(MCP_REMOTE_URL, 'url')}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-core-green text-core-bg font-bold text-xs rounded-lg hover:brightness-110 transition-all shrink-0">
                  {copied === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === 'url' ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="text-xs text-core-text-muted space-y-1">
                <p>Hosted on Cloudflare Workers. No API keys needed for basic tools.</p>
                <p>Supports Streamable HTTP transport.</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Registry Badge ═══ */}
        <div className="flex items-center justify-center gap-3 mt-6 text-xs text-core-text-muted">
          <CheckCircle className="w-3.5 h-3.5 text-core-green" />
          <span>Published to the official MCP Registry — v4.5.0</span>
          <a href="https://www.npmjs.com/package/0nmcp" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-core-cyan hover:underline">
            npm <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* ═══ Test Account Panel ═══ */}
        <div className="mt-12 bg-core-card border border-core-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-core-amber">Test Account</h2>
              <p className="text-xs text-core-text-muted">mike@wpsxo.com — auto-provisioned test environment</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleTestAction('status')} disabled={testLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-core-card border border-core-border rounded-lg text-xs text-core-text-muted hover:text-core-text transition-colors disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${testLoading ? 'animate-spin' : ''}`} />
                Status
              </button>
              <button onClick={() => handleTestAction('delete')} disabled={testLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                  confirmDelete ? 'bg-core-red/20 border border-core-red/30 text-core-red' : 'bg-core-card border border-core-border text-core-text-muted hover:text-core-text'
                }`}>
                <Trash2 className="w-3 h-3" />
                {confirmDelete ? 'Confirm Delete' : 'Delete'}
              </button>
              <button onClick={() => handleTestAction('create')} disabled={testLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-core-green text-core-bg font-bold text-xs rounded-lg hover:brightness-110 transition-all disabled:opacity-50">
                {testLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Create Fresh
              </button>
            </div>
          </div>

          {testResult && (
            <div className="mt-3 space-y-2">
              {testResult.error && (
                <div className="flex items-center gap-2 text-xs text-core-red bg-core-red/10 border border-core-red/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {testResult.error}
                </div>
              )}

              {testResult.success && (
                <div className="bg-core-green/5 border border-core-green/20 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-core-green font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Account created
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-core-text-muted">Email: </span>
                      <span className="text-core-text font-mono">{testResult.email}</span>
                    </div>
                    <div>
                      <span className="text-core-text-muted">Password: </span>
                      <span className="text-core-text font-mono">{testResult.password}</span>
                    </div>
                  </div>
                  {testResult.results?.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-core-text-dim">
                      <CheckCircle className="w-3 h-3 text-core-green shrink-0" />
                      {r}
                    </div>
                  ))}
                </div>
              )}

              {testResult.exists !== undefined && !testResult.success && !testResult.error && (
                <div className={`rounded-lg p-3 text-xs ${testResult.exists ? 'bg-core-cyan/5 border border-core-cyan/20' : 'bg-core-border/20 border border-core-border'}`}>
                  <div className="font-semibold text-core-text mb-1">{testResult.exists ? 'Account exists' : 'No account found'}</div>
                  {testResult.profile && (
                    <pre className="text-[10px] text-core-text-muted font-mono mt-1 overflow-x-auto">{JSON.stringify(testResult.profile, null, 2)}</pre>
                  )}
                </div>
              )}

              {testResult.deleted && (
                <div className="flex items-center gap-2 text-xs text-core-amber bg-core-amber/10 border border-core-amber/20 rounded-lg px-3 py-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  Test account deleted
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
