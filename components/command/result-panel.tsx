'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResultPanelProps {
  status: 'success' | 'error'
  statusCode: number
  durationMs: number
  result: unknown
  urlsFound: string[]
  tool: string
  service: string
  serviceName?: string
  onSaveSwitch?: () => void
}

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', className)}>
      {children}
    </span>
  )
}

export function ResultPanel({ status, statusCode, durationMs, result, urlsFound, tool, service, serviceName, onSaveSwitch }: ResultPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  const statusTint =
    status === 'success'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'

  const codeTint =
    statusCode < 300
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : statusCode < 400
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
        <Pill className={statusTint}>{status}</Pill>
        <Pill className={codeTint}>{statusCode}</Pill>
        <span className="text-xs text-white/55">{durationMs}ms</span>
        <span className="text-xs text-white/30">·</span>
        <span className="font-mono text-xs text-white/70">{tool}</span>
        {serviceName && (
          <>
            <span className="text-xs text-white/30">·</span>
            <span className="text-xs text-white/55 uppercase tracking-wider">{serviceName}</span>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
          {onSaveSwitch && (
            <Button variant="outline" size="sm" onClick={onSaveSwitch}>
              <Save className="mr-1 h-3.5 w-3.5" />
              Save as Switch
            </Button>
          )}
        </div>
      </div>

      {/* URLs found */}
      {urlsFound.length > 0 && (
        <div className="border-b border-white/10 px-3 py-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/55">
            URLs Found ({urlsFound.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {urlsFound.slice(0, 12).map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-xs items-center gap-1 truncate rounded border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-cyan-300 transition-colors hover:border-cyan-500/30 hover:bg-cyan-500/10"
              >
                {url}
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* JSON result */}
      {!collapsed && (
        <div className="p-3">
          <pre className="max-h-[480px] overflow-auto rounded-md border border-white/5 bg-black/40 p-3 font-mono text-xs text-white/85">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
