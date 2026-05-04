'use client'

/**
 * MermaidView — renders Mermaid syntax inline as SVG.
 *
 * Lazy-imports the mermaid lib client-side (~600KB) so SSR isn't bloated.
 * Used by /dashboard/notes for flowchart/mindmap/diagram artifacts. The
 * "Turn into automation" hand-off lives in the parent — this component is
 * pure render.
 */

import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'

interface MermaidViewProps {
  source: string
  className?: string
}

let initialized = false

async function ensureInit() {
  if (initialized) return
  const m = await import('mermaid')
  m.default.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'strict',
    fontFamily: 'Inter, system-ui, sans-serif',
    themeVariables: {
      darkMode: true,
      primaryColor: '#161b22',
      primaryTextColor: '#f0f4f8',
      primaryBorderColor: '#30363d',
      lineColor: '#6EE05A',
      secondaryColor: '#1c2333',
      tertiaryColor: '#0d1117',
      background: '#0d1117',
      mainBkg: '#161b22',
      secondBkg: '#1c2333',
      tertiaryBkg: '#0d1117',
      nodeBorder: '#30363d',
      clusterBkg: '#161b22',
      clusterBorder: '#30363d',
      titleColor: '#f0f4f8',
      edgeLabelBackground: '#0d1117',
    },
  })
  initialized = true
}

export function MermaidView({ source, className }: MermaidViewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      setError(null)
      try {
        await ensureInit()
        const m = await import('mermaid')
        const id = `m_${Math.random().toString(36).slice(2, 10)}`
        const { svg: out } = await m.default.render(id, source)
        if (!cancelled) setSvg(out)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'failed to render diagram')
          setSvg(null)
        }
      }
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [source])

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Couldn't render diagram</p>
          <p className="mt-0.5 text-red-300/70">{error}</p>
          <details className="mt-2">
            <summary className="cursor-pointer text-red-300/60 hover:text-red-300">
              Show source
            </summary>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-black/40 p-2 font-mono text-[10px] text-white/70">
              {source}
            </pre>
          </details>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`mermaid-view overflow-x-auto rounded-lg border border-border/50 bg-bg-primary/40 p-4 ${className ?? ''}`}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    >
      {!svg && <div className="text-xs text-text-muted">Rendering…</div>}
    </div>
  )
}
