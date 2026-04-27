'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Database,
  Cpu,
  CreditCard,
  Webhook,
  UserPlus,
  BarChart3,
  Linkedin,
  Lock,
  Globe,
  ShieldCheck,
  Play,
} from 'lucide-react'

interface TestResult {
  name: string
  status: 'idle' | 'running' | 'pass' | 'fail'
  message: string
  latency: number
}

interface TestDef {
  name: string
  icon: React.ReactNode
  run: () => Promise<{ ok: boolean; message: string }>
}

const TESTS: TestDef[] = [
  {
    name: 'Supabase',
    icon: <Database className="w-5 h-5" />,
    run: async () => {
      const res = await fetch('/api/health/supabase')
      const json = await res.json()
      return { ok: json.ok, message: json.ok ? `Connected (${json.latency_ms}ms)` : json.error }
    },
  },
  {
    name: 'CRM Proxy',
    icon: <Activity className="w-5 h-5" />,
    run: async () => {
      const res = await fetch('/api/health/crm')
      const json = await res.json()
      return { ok: json.ok, message: json.ok ? `Connected (${json.latency_ms}ms)` : json.error }
    },
  },
  {
    name: 'Groq',
    icon: <Cpu className="w-5 h-5" />,
    run: async () => {
      const res = await fetch('/api/health/groq')
      const json = await res.json()
      return { ok: json.ok, message: json.ok ? `${json.models} models (${json.latency_ms}ms)` : json.error }
    },
  },
  {
    name: 'Stripe',
    icon: <CreditCard className="w-5 h-5" />,
    run: async () => {
      const res = await fetch('/api/admin/stripe-status')
      if (res.status === 401 || res.status === 403) return { ok: false, message: 'Admin auth failed' }
      const json = await res.json()
      const ok = json.balance && json.products?.length > 0
      return { ok, message: ok ? `${json.products.length} products, balance loaded` : 'No products found' }
    },
  },
  {
    name: 'Webhook Endpoint',
    icon: <Webhook className="w-5 h-5" />,
    run: async () => {
      const res = await fetch('/api/webhooks/stripe', { method: 'POST', body: '{}' })
      // Should return 400 (missing signature) — not 500
      return { ok: res.status === 400, message: res.status === 400 ? 'Webhook endpoint active (rejects unsigned)' : `Unexpected status: ${res.status}` }
    },
  },
  {
    name: 'Signup Flow',
    icon: <UserPlus className="w-5 h-5" />,
    run: async () => {
      const res = await fetch('/api/auth/signup', { method: 'OPTIONS' })
      // Just check endpoint exists (not 404)
      const ok = res.status !== 404
      return { ok, message: ok ? 'Signup endpoint reachable' : 'Signup endpoint not found' }
    },
  },
  {
    name: 'Market Intel',
    icon: <BarChart3 className="w-5 h-5" />,
    run: async () => {
      try {
        const res = await fetch('/api/market-intel/health')
        if (res.status === 404) {
          // Try alternative path
          const res2 = await fetch('/dashboard/market-intel')
          return { ok: res2.status !== 500, message: res2.status !== 500 ? 'Market Intel page reachable' : 'Market Intel error' }
        }
        const json = await res.json()
        return { ok: json.ok !== false, message: json.ok ? 'Market Intel healthy' : json.error || 'Check config' }
      } catch {
        return { ok: false, message: 'Market Intel unreachable' }
      }
    },
  },
  {
    name: 'LinkedIn Bot',
    icon: <Linkedin className="w-5 h-5" />,
    run: async () => {
      try {
        const res = await fetch('/dashboard/linkedin-bot')
        return { ok: res.status !== 500, message: res.status !== 500 ? 'LinkedIn Bot page reachable' : 'LinkedIn Bot error' }
      } catch {
        return { ok: false, message: 'LinkedIn Bot unreachable' }
      }
    },
  },
  {
    name: 'SSL Certificate',
    icon: <Lock className="w-5 h-5" />,
    run: async () => {
      const isHttps = window.location.protocol === 'https:'
      return { ok: isHttps || window.location.hostname === 'localhost', message: isHttps ? 'HTTPS active' : 'HTTP (localhost OK)' }
    },
  },
  {
    name: 'OG Tags',
    icon: <Globe className="w-5 h-5" />,
    run: async () => {
      const ogTitle = document.querySelector('meta[property="og:title"]')
      const ogDesc = document.querySelector('meta[property="og:description"]')
      const hasTags = !!(ogTitle || ogDesc)
      return { ok: hasTags, message: hasTags ? 'OG tags present' : 'No OG tags found (check layout.tsx)' }
    },
  },
]

export default function LaunchTestPage() {
  const [results, setResults] = useState<TestResult[]>(
    TESTS.map((t) => ({ name: t.name, status: 'idle', message: '', latency: 0 })),
  )
  const [running, setRunning] = useState(false)
  const [isAdmin, setIsAdmin] = useState(true)

  const runAllTests = useCallback(async () => {
    setRunning(true)
    // Reset all to running
    setResults(TESTS.map((t) => ({ name: t.name, status: 'running', message: 'Testing...', latency: 0 })))

    for (let i = 0; i < TESTS.length; i++) {
      const test = TESTS[i]
      const start = Date.now()
      try {
        const result = await test.run()
        const latency = Date.now() - start
        setResults((prev) => {
          const next = [...prev]
          next[i] = { name: test.name, status: result.ok ? 'pass' : 'fail', message: result.message, latency }
          return next
        })
      } catch (err) {
        setResults((prev) => {
          const next = [...prev]
          next[i] = { name: test.name, status: 'fail', message: 'Exception thrown', latency: Date.now() - start }
          return next
        })
      }
    }
    setRunning(false)
  }, [])

  // Check admin access and auto-run
  useEffect(() => {
    fetch('/api/admin/stripe-status').then((res) => {
      if (res.status === 401 || res.status === 403) {
        setIsAdmin(false)
      } else {
        runAllTests()
      }
    })
  }, [runAllTests])

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-white font-bold text-lg mb-1">Access Denied</p>
          <p className="text-zinc-400 text-sm">Admin access required for launch tests</p>
        </div>
      </div>
    )
  }

  const passCount = results.filter((r) => r.status === 'pass').length
  const failCount = results.filter((r) => r.status === 'fail').length
  const total = TESTS.length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-[#7ed957]" />
            Pre-Launch Test Suite
          </h1>
          <p className="text-zinc-400 text-sm mt-1">May 1st production readiness checks</p>
        </div>
        <button
          onClick={runAllTests}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7ed957] text-black text-sm font-bold hover:bg-[#7ed957]/90 transition-colors disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Running...' : 'Run All Tests'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
          <p className="text-3xl font-bold text-white">{total}</p>
          <p className="text-xs text-zinc-400 mt-1">Total Tests</p>
        </div>
        <div className="rounded-2xl border border-[#7ed957]/20 bg-[#7ed957]/5 p-4 text-center">
          <p className="text-3xl font-bold text-[#7ed957]">{passCount}</p>
          <p className="text-xs text-zinc-400 mt-1">Passing</p>
        </div>
        <div className={`rounded-2xl border p-4 text-center ${failCount > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
          <p className={`text-3xl font-bold ${failCount > 0 ? 'text-red-400' : 'text-zinc-500'}`}>{failCount}</p>
          <p className="text-xs text-zinc-400 mt-1">Failing</p>
        </div>
      </div>

      {/* Test Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {results.map((result, i) => {
          const test = TESTS[i]
          const statusColor =
            result.status === 'pass'
              ? 'border-[#7ed957]/20 bg-[#7ed957]/5'
              : result.status === 'fail'
                ? 'border-red-500/20 bg-red-500/5'
                : result.status === 'running'
                  ? 'border-yellow-400/20 bg-yellow-400/5'
                  : 'border-white/[0.06] bg-white/[0.02]'

          const iconColor =
            result.status === 'pass'
              ? 'text-[#7ed957]'
              : result.status === 'fail'
                ? 'text-red-400'
                : result.status === 'running'
                  ? 'text-yellow-400'
                  : 'text-zinc-500'

          return (
            <div key={result.name} className={`rounded-2xl border p-5 transition-all ${statusColor}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={iconColor}>{test.icon}</div>
                  <span className="text-white font-bold text-sm">{result.name}</span>
                </div>
                {result.status === 'running' && <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />}
                {result.status === 'pass' && <CheckCircle className="w-5 h-5 text-[#7ed957]" />}
                {result.status === 'fail' && <XCircle className="w-5 h-5 text-red-400" />}
              </div>
              <p className="text-xs text-zinc-400">{result.message || 'Waiting...'}</p>
              {result.latency > 0 && (
                <p className="text-xs text-zinc-600 mt-1">{result.latency}ms</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
