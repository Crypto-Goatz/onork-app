import Link from 'next/link'
import { ReactNode } from 'react'

interface AuthShellProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans antialiased">
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary bg-grid px-4 py-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-40 right-1/4 h-60 w-60 rounded-full bg-teal/10 blur-3xl" />
        </div>

        <Link href="/" className="relative z-10 mb-8 flex items-center gap-2 group">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-teal">
            <span className="text-lg font-bold text-bg-primary">0n</span>
          </span>
          <span className="text-2xl font-bold text-white">
            <span className="text-accent">0n</span>Core
          </span>
        </Link>

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-border/50 bg-bg-card/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && <div className="relative z-10 mt-8 text-xs text-text-muted">{footer}</div>}
      </div>
    </div>
  )
}

export function AuthInput({
  id,
  label,
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  icon?: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-300">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}
        <input
          id={id}
          {...props}
          className={`w-full rounded-lg border border-border/60 bg-bg-primary/40 ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 text-sm text-white placeholder:text-text-muted/60 outline-none transition-colors focus:border-accent/60 focus:bg-bg-primary/60 ${props.className || ''}`}
        />
      </div>
    </div>
  )
}

export function AuthButton({
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-primary transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Working…' : children}
    </button>
  )
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {message}
    </div>
  )
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-border/50" />
      <span className="text-xs uppercase tracking-wider text-text-muted">{label}</span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  )
}

export function OAuthButton({
  provider,
  onClick,
  disabled,
}: {
  provider: 'google' | 'linkedin' | 'slack'
  onClick: () => void
  disabled?: boolean
}) {
  const labels = { google: 'Continue with Google', linkedin: 'Continue with LinkedIn', slack: 'Continue with Slack' }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 bg-bg-primary/30 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-accent/50 hover:bg-bg-primary/60 disabled:opacity-50"
    >
      <ProviderIcon provider={provider} />
      <span>{labels[provider]}</span>
    </button>
  )
}

function ProviderIcon({ provider }: { provider: 'google' | 'linkedin' | 'slack' }) {
  if (provider === 'google') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.28-1.93-6.14-4.52H2.18v2.84A11 11 0 0 0 12 23Z"/>
        <path fill="#FBBC05" d="M5.86 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.36-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.42 3.46 1.18 4.96l3.68-2.84Z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.04l3.68 2.84C6.72 7.31 9.14 5.38 12 5.38Z"/>
      </svg>
    )
  }
  if (provider === 'linkedin') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#0A66C2" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z"/>
      </svg>
    )
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#E01E5A" d="M5 15a2 2 0 1 1 2-2v2H5Zm1 0a2 2 0 1 1 4 0v5a2 2 0 1 1-4 0v-5Z"/>
      <path fill="#36C5F0" d="M9 5a2 2 0 1 1 2 2H9V5Zm0 1a2 2 0 1 1 0 4H4a2 2 0 1 1 0-4h5Z"/>
      <path fill="#2EB67D" d="M19 9a2 2 0 1 1-2 2v-2h2Zm-1 0a2 2 0 1 1-4 0V4a2 2 0 1 1 4 0v5Z"/>
      <path fill="#ECB22E" d="M15 19a2 2 0 1 1-2-2h2v2Zm0-1a2 2 0 1 1 0-4h5a2 2 0 1 1 0 4h-5Z"/>
    </svg>
  )
}
