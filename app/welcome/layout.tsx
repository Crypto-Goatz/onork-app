/**
 * Welcome layout — escapes the dark dashboard chrome and the marketing
 * public nav. White-themed island. Same approach as /canvas.
 */

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-welcome-root
      className="welcome-root min-h-screen w-full bg-gradient-to-b from-slate-50 to-white text-slate-900"
      style={
        {
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
          colorScheme: 'light',
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
