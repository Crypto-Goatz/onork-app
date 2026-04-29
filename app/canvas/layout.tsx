/**
 * Canvas layout — the ONLY visible front-end layer.
 *
 * Strategy: don't touch the global html.dark class (that fights with tldraw
 * post-mount and causes its UI to collapse). Instead, scope ALL theme
 * overrides to this layout's root div via inline CSS variables and
 * colorScheme:'light'. Cascades down the tree, never escapes upward.
 */

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-canvas-root
      className="canvas-root h-screen w-screen overflow-hidden bg-white text-slate-900"
      style={
        {
          // Override dark-mode shadcn vars so anything dropped here renders light
          ['--background' as string]: '#ffffff',
          ['--foreground' as string]: '#0f172a',
          ['--card' as string]: '#ffffff',
          ['--card-foreground' as string]: '#0f172a',
          ['--popover' as string]: '#ffffff',
          ['--popover-foreground' as string]: '#0f172a',
          ['--primary' as string]: '#0f172a',
          ['--primary-foreground' as string]: '#ffffff',
          ['--secondary' as string]: '#f1f5f9',
          ['--secondary-foreground' as string]: '#0f172a',
          ['--muted' as string]: '#f8fafc',
          ['--muted-foreground' as string]: '#64748b',
          ['--accent' as string]: '#6EE05A',
          ['--accent-foreground' as string]: '#04140a',
          ['--border' as string]: '#e2e8f0',
          ['--input' as string]: '#e2e8f0',
          ['--ring' as string]: '#94a3b8',
          colorScheme: 'light',
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
