/**
 * /auth/authorize — OAuth 2.1 consent screen.
 *
 * Server-rendered. The /api/oauth/authorize endpoint redirects the
 * user here once it has validated the client and the user is logged in.
 * We re-fetch the client so the displayed name / scopes / app icon
 * cannot be tampered with via querystring.
 *
 * Approve / Deny POST to /api/oauth/consent which mints an auth code
 * (or returns access_denied) and redirects back to the client.
 */
import { redirect } from 'next/navigation'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { adminClient, loadClient, parseScope } from '@/lib/oauth-server'
import { Shield, ShieldAlert, Check, X } from 'lucide-react'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SearchParams {
  client_id?: string
  redirect_uri?: string
  response_type?: string
  scope?: string
  state?: string
  code_challenge?: string
  code_challenge_method?: string
  nonce?: string
}

const SCOPE_DESCRIPTIONS: Record<string, { label: string; detail: string }> = {
  openid: { label: 'Verify your identity', detail: 'Sign in with your 0nCore account.' },
  profile: { label: 'Read your profile', detail: 'Name and avatar.' },
  email: { label: 'Read your email address', detail: 'For identification — never used for marketing.' },
  offline_access: { label: 'Stay signed in', detail: 'Refresh tokens so you don\'t re-authorize every hour.' },
  mcp: { label: 'Access your 0nMCP tools', detail: 'Run any 0nMCP tool you have access to.' },
  'mcp:read': { label: 'Read from 0nMCP', detail: 'Read-only access to tool catalogs and metadata.' },
  'mcp:write': { label: 'Write via 0nMCP', detail: 'Create, update, and delete via your connected services.' },
  'workflows:run': { label: 'Run your workflows', detail: 'Execute .0n workflows on your behalf.' },
  'workflows:read': { label: 'Read your workflows', detail: 'List and inspect saved workflows.' },
  'crm:read': { label: 'Read CRM data', detail: 'Contacts, opportunities, conversations.' },
  'crm:write': { label: 'Write to CRM', detail: 'Create and update contacts, send messages.' },
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const clientId = params.client_id
  const redirectUri = params.redirect_uri
  const scope = params.scope || ''
  const state = params.state || ''

  if (!clientId || !redirectUri) {
    return <ErrorScreen message="Missing client_id or redirect_uri." />
  }

  const sb = await createServerSupabase()
  const { data: { session } } = await sb.auth.getSession()
  const user = session?.user ?? null

  if (!user) {
    redirect(`/login?return_to=${encodeURIComponent(currentUrl(params))}`)
  }

  const sbAdmin = adminClient()
  const client = await loadClient(sbAdmin, clientId)
  if (!client) return <ErrorScreen message="Unknown client." />

  const requestedScopes = parseScope(scope || client.scope)

  const { data: profile } = await sbAdmin
    .from('profiles')
    .select('full_name, avatar_url, email')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand strip */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#6EE05A]/10 border border-[#6EE05A]/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#6EE05A]" />
          </div>
          <span className="font-mono text-sm text-[#8b949e]">0nCore · Authorize</span>
        </div>

        {/* Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          {/* Client header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#30363d]">
            <div className="flex items-start gap-4">
              {client.logo_uri ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={client.logo_uri}
                  alt={client.client_name}
                  className="w-12 h-12 rounded-lg border border-[#30363d] object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#8b949e]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-[#e6edf3]">
                  Allow{' '}
                  <span className="text-[#6EE05A]">{client.client_name}</span>
                </h1>
                <p className="text-sm text-[#8b949e] mt-1">
                  to access your 0nCore account?
                </p>
              </div>
            </div>
          </div>

          {/* Account */}
          <div className="px-6 py-4 border-b border-[#30363d] bg-[#1c2128]">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#6EE05A]/20 border border-[#6EE05A]/40 flex items-center justify-center">
                  <span className="text-xs font-medium text-[#6EE05A]">
                    {(profile?.full_name || user.email || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#e6edf3] truncate">
                  {profile?.full_name || user.email}
                </p>
                <p className="text-xs text-[#8b949e] truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Scopes */}
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wide mb-3">
              This app will be able to
            </p>
            <ul className="space-y-3">
              {requestedScopes.length === 0 ? (
                <li className="text-sm text-[#8b949e]">No special permissions requested.</li>
              ) : (
                requestedScopes.map((s) => {
                  const meta = SCOPE_DESCRIPTIONS[s] || {
                    label: s,
                    detail: 'Custom scope.',
                  }
                  return (
                    <li key={s} className="flex gap-3">
                      <Check className="w-4 h-4 text-[#6EE05A] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#e6edf3]">{meta.label}</p>
                        <p className="text-xs text-[#8b949e]">{meta.detail}</p>
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          </div>

          {/* Redirect notice */}
          <div className="px-6 pb-4">
            <div className="flex gap-2 items-start text-xs text-[#8b949e] bg-[#1c2128] border border-[#30363d] rounded-lg px-3 py-2">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="break-all font-mono">
                Redirects to {safeHost(redirectUri)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <form
            method="post"
            action="/api/oauth/consent"
            className="px-6 pb-6 flex gap-3"
          >
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="response_type" value={params.response_type || 'code'} />
            <input type="hidden" name="scope" value={scope} />
            <input type="hidden" name="state" value={state} />
            {params.code_challenge && (
              <input type="hidden" name="code_challenge" value={params.code_challenge} />
            )}
            {params.code_challenge_method && (
              <input
                type="hidden"
                name="code_challenge_method"
                value={params.code_challenge_method}
              />
            )}
            {params.nonce && <input type="hidden" name="nonce" value={params.nonce} />}

            <button
              type="submit"
              name="decision"
              value="deny"
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-[#30363d] hover:border-[#484f58] bg-[#161b22] hover:bg-[#21262d] text-sm text-[#c9d1d9] transition-colors"
            >
              <X className="w-4 h-4" />
              Deny
            </button>
            <button
              type="submit"
              name="decision"
              value="approve"
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-[#6EE05A] hover:bg-[#5bc74a] text-sm font-medium text-[#0d1117] transition-colors"
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#8b949e] mt-6">
          Approving signs you in to {client.client_name} as {user.email}. You can
          revoke this access anytime from{' '}
          <a className="text-[#58a6ff] hover:underline" href="/dashboard/settings/accounts">
            account settings
          </a>
          .
        </p>
      </div>
    </main>
  )
}

function safeHost(uri: string): string {
  try {
    const u = new URL(uri)
    return `${u.protocol}//${u.host}${u.pathname}`
  } catch {
    return uri
  }
}

function currentUrl(p: SearchParams): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) if (v) sp.set(k, v)
  return `/auth/authorize?${sp.toString()}`
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#161b22] border border-[#30363d] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#f87171]/10 border border-[#f87171]/30 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-[#f87171]" />
          </div>
          <h1 className="text-lg font-semibold text-[#e6edf3]">Authorization error</h1>
        </div>
        <p className="text-sm text-[#c9d1d9]">{message}</p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-sm text-[#c9d1d9]"
        >
          Return home
        </a>
      </div>
    </main>
  )
}
