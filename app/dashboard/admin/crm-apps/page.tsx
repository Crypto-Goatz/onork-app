'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Shield, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface AppEnvField {
  var: string
  set: boolean
  isValidPit?: boolean
  preview: string | null
}

interface CrmAppView {
  key: 'agency' | 'sub_location'
  name: string
  appId: string
  authClass: 'Company' | 'Location'
  redirectUri: string
  scopeCount: number
  env: {
    clientId: AppEnvField
    clientSecret: AppEnvField
    pit: AppEnvField
  }
}

interface RoutingRow {
  category: string
  routesTo: 'agency' | 'sub_location'
}

interface Response {
  apps: CrmAppView[]
  routing: RoutingRow[]
  rules: string[]
}

export default function CrmAppsAdminPage() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/crm-apps')
      .then(async (r) => {
        if (r.status === 403 || r.status === 401) {
          setErr('Admin access required')
          return
        }
        const d = await r.json()
        setData(d)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white/40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (err || !data) {
    return (
      <div className="px-6 py-10 max-w-3xl mx-auto text-center text-white/55">
        {err ?? 'Could not load CRM app status'}
      </div>
    )
  }

  return (
    <div className="px-6 py-5 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#7ed957]" />
          CRM Apps
          <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-white/55">
            Admin
          </span>
        </h1>
        <p className="text-sm text-white/55 mt-1">
          Live state of both CRM marketplace apps + the operation→app routing table.
          Scopes, env-var presence, and PIT validity all visible at a glance.
        </p>
      </div>

      {/* Both apps */}
      <div className="mb-8 grid gap-3 md:grid-cols-2">
        {data.apps.map((app) => (
          <Card key={app.key} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold">{app.name}</h2>
                <p className="font-mono text-[10px] text-white/40 truncate">{app.appId}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-white/70">
                  authClass: {app.authClass}
                </span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/55">
                  {app.scopeCount} scopes
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <EnvRow label="Client ID" field={app.env.clientId} />
              <EnvRow label="Client Secret" field={app.env.clientSecret} />
              <EnvRow label="PIT Token" field={app.env.pit} />
            </div>

            <div className="mt-3 text-[10px] text-white/40">
              Redirect: <code className="text-white/55">{app.redirectUri}</code>
            </div>
          </Card>
        ))}
      </div>

      {/* Routing table */}
      <Card className="p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/55 mb-3">
          Operation → App routing
        </h2>
        <div className="grid gap-1.5 md:grid-cols-2">
          {data.routing.map((row) => (
            <div
              key={row.category}
              className="flex items-center justify-between gap-2 rounded border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs"
            >
              <span className="font-mono text-white/85">{row.category}</span>
              <ArrowRight className="h-3 w-3 text-white/30" />
              <span
                className={`font-mono font-semibold ${
                  row.routesTo === 'agency' ? 'text-purple-300' : 'text-emerald-300'
                }`}
              >
                {row.routesTo === 'agency' ? '0nAGENCY' : '0nCORE'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Rules */}
      <Card className="p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/55 mb-3">
          Rules in effect
        </h2>
        <ul className="space-y-2 text-xs text-white/65">
          {data.rules.map((r) => (
            <li key={r} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7ed957]" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function EnvRow({ label, field }: { label: string; field: AppEnvField }) {
  const ok = field.set && (field.isValidPit !== false || field.preview === null)
  const isPitField = field.isValidPit !== undefined
  const pitInvalid = isPitField && field.set && !field.isValidPit

  return (
    <div className="flex items-start justify-between gap-3 rounded border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white/85">{label}</span>
          <code className="font-mono text-[10px] text-white/40">{field.var}</code>
        </div>
        {field.preview && (
          <div className="mt-0.5 font-mono text-[11px] text-white/55 truncate">{field.preview}</div>
        )}
      </div>
      <div className="shrink-0">
        {!field.set ? (
          <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
            <AlertCircle className="h-3 w-3" /> not set
          </span>
        ) : pitInvalid ? (
          <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
            <AlertCircle className="h-3 w-3" /> not a PIT (must start with pit-)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> {ok ? 'set' : 'set (warn)'}
          </span>
        )}
      </div>
    </div>
  )
}
