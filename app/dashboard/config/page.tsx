'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Mail, Phone, Share2, Plug, Shield, Globe, Server, Send, MessageSquare,
  PhoneCall, Voicemail, Hash, Link2, Key, RefreshCw, Copy, Trash2, Plus,
  ExternalLink, CheckCircle2, AlertCircle, Clock, Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfigState {
  // Email - Domain
  sendingDomain: string
  domainStatus: 'verified' | 'pending' | 'not_configured'
  // Email - SMTP
  smtpEnabled: boolean
  smtpProvider: 'crm' | 'sendgrid' | 'mailgun' | 'custom'
  smtpHost: string
  smtpPort: string
  smtpUsername: string
  smtpPassword: string
  // Email - Defaults
  fromName: string
  fromEmail: string
  replyTo: string
  trackOpens: boolean
  trackClicks: boolean
  includeUnsubscribe: boolean
  // Phone
  smsEnabled: boolean
  smsSenderId: string
  autoRespondMissed: boolean
  missedCallReply: string
  callRecording: boolean
  voicemailEnabled: boolean
  voicemailGreeting: string
  callForwarding: string
  // Social
  autoPostBlog: boolean
  includeHashtags: boolean
  defaultHashtags: string
  postingTime: string
  approvalRequired: boolean
  // Integrations
  gaPropertyId: string
  autoSyncAnalytics: boolean
  wordpressUrl: string
  autoSyncContent: boolean
  stripeAutoInvoice: boolean
  stripeSendReceipts: boolean
  crmLocationId: string
  slackChannel: string
  slackNotifications: boolean
  // Security
  securityLevel: 'low' | 'default' | 'strict'
  requireMfa: boolean
  sessionTimeout: boolean
  sessionMinutes: string
  ipWhitelist: boolean
  allowedIps: string
}

interface PhoneNumber {
  id: string
  number: string
  capabilities: string[]
}

interface ApiToken {
  id: string
  name: string
  prefix: string
  createdAt: string
}

interface SocialAccount {
  platform: string
  label: string
  connected: boolean
  icon: React.ReactNode
}

const DEFAULT_CONFIG: ConfigState = {
  sendingDomain: '',
  domainStatus: 'not_configured',
  smtpEnabled: false,
  smtpProvider: 'crm',
  smtpHost: '',
  smtpPort: '587',
  smtpUsername: '',
  smtpPassword: '',
  fromName: '',
  fromEmail: '',
  replyTo: '',
  trackOpens: true,
  trackClicks: true,
  includeUnsubscribe: true,
  smsEnabled: false,
  smsSenderId: '',
  autoRespondMissed: false,
  missedCallReply: 'Sorry I missed your call! I\'ll get back to you shortly.',
  callRecording: false,
  voicemailEnabled: true,
  voicemailGreeting: '',
  callForwarding: '',
  autoPostBlog: false,
  includeHashtags: true,
  defaultHashtags: '',
  postingTime: '09:00',
  approvalRequired: true,
  gaPropertyId: '',
  autoSyncAnalytics: false,
  wordpressUrl: '',
  autoSyncContent: false,
  stripeAutoInvoice: true,
  stripeSendReceipts: true,
  crmLocationId: '',
  slackChannel: '#general',
  slackNotifications: false,
  securityLevel: 'default',
  requireMfa: false,
  sessionTimeout: true,
  sessionMinutes: '60',
  ipWhitelist: false,
  allowedIps: '',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: 'verified' | 'pending' | 'not_configured' | 'connected' | 'not_connected' }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    verified: { label: 'Verified', variant: 'default' },
    connected: { label: 'Connected', variant: 'default' },
    pending: { label: 'Pending', variant: 'secondary' },
    not_configured: { label: 'Not Configured', variant: 'outline' },
    not_connected: { label: 'Not Connected', variant: 'outline' },
  }
  const { label, variant } = map[status] ?? map.not_configured
  return <Badge variant={variant}>{label}</Badge>
}

function FieldRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-2 ${className ?? ''}`}>{children}</div>
}

function SwitchRow({ label, description, checked, onCheckedChange }: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      <Switch checked={checked} onCheckedChange={(val) => onCheckedChange(val)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ConfigPage() {
  const supabase = createClient()
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([])
  const [areaCode, setAreaCode] = useState('')
  const [searchResults, setSearchResults] = useState<{ number: string; price: string }[]>([])
  const [searchingNumbers, setSearchingNumbers] = useState(false)
  const [newTokenName, setNewTokenName] = useState('')
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [generatedToken, setGeneratedToken] = useState('')
  const [activeTab, setActiveTab] = useState<string | number>('email')

  const socialAccounts: SocialAccount[] = [
    { platform: 'google', label: 'Google', connected: !!config.gaPropertyId, icon: <Globe className="size-5" /> },
    { platform: 'facebook', label: 'Facebook', connected: false, icon: <Share2 className="size-5" /> },
    { platform: 'instagram', label: 'Instagram', connected: false, icon: <Hash className="size-5" /> },
    { platform: 'linkedin', label: 'LinkedIn', connected: false, icon: <Link2 className="size-5" /> },
    { platform: 'twitter', label: 'X / Twitter', connected: false, icon: <MessageSquare className="size-5" /> },
    { platform: 'tiktok', label: 'TikTok', connected: false, icon: <Share2 className="size-5" /> },
  ]

  // --- Load config ---
  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const { data } = await supabase
          .from('profiles')
          .select('config, crm_location_id')
          .eq('id', session.user.id)
          .single()
        if (data?.config) {
          setConfig(prev => ({ ...prev, ...data.config, crmLocationId: data.crm_location_id ?? '' }))
        } else if (data?.crm_location_id) {
          setConfig(prev => ({ ...prev, crmLocationId: data.crm_location_id }))
        }
        // Load phone numbers
        const res = await fetch('/api/crm/phone-numbers', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch(() => null)
        if (res?.ok) {
          const json = await res.json()
          setPhoneNumbers(json.numbers ?? [])
        }
        // Load API tokens
        const tokenRes = await fetch('/api/auth/tokens', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch(() => null)
        if (tokenRes?.ok) {
          const json = await tokenRes.json()
          setApiTokens(json.tokens ?? [])
        }
      } catch {
        // Config columns may not exist yet — use defaults
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  // --- Save config ---
  const saveConfig = useCallback(async (updates?: Partial<ConfigState>) => {
    setSaving(true)
    try {
      const merged = updates ? { ...config, ...updates } : config
      if (updates) setConfig(merged)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('profiles')
        .update({ config: merged })
        .eq('id', session.user.id)
      if (error) throw error
      toast.success('Configuration saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [config, supabase])

  // --- Toggle helper (saves immediately) ---
  function toggle(key: keyof ConfigState) {
    const next = !config[key]
    const updates = { [key]: next } as Partial<ConfigState>
    setConfig(prev => ({ ...prev, ...updates }))
    saveConfig({ ...config, ...updates })
  }

  // --- SMTP Test ---
  async function testSmtp() {
    toast.info('Testing SMTP connection...')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const res = await fetch('/api/config/test-smtp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: config.smtpHost, port: config.smtpPort, username: config.smtpUsername, password: config.smtpPassword }),
      })
      if (!res.ok) throw new Error('Connection failed')
      toast.success('SMTP connection successful')
    } catch {
      toast.error('SMTP connection failed')
    }
  }

  // --- Domain verify ---
  async function verifyDomain() {
    toast.info('Verifying domain...')
    setConfig(prev => ({ ...prev, domainStatus: 'pending' }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const res = await fetch('/api/config/verify-domain', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: config.sendingDomain }),
      })
      const json = await res.json()
      if (json.verified) {
        setConfig(prev => ({ ...prev, domainStatus: 'verified' }))
        toast.success('Domain verified')
      } else {
        setConfig(prev => ({ ...prev, domainStatus: 'pending' }))
        toast.info('DNS records pending verification')
      }
    } catch {
      toast.error('Verification failed')
    }
  }

  // --- Phone number search ---
  async function searchPhoneNumbers() {
    setSearchingNumbers(true)
    setSearchResults([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const res = await fetch(`/api/crm/phone-numbers/search?areaCode=${areaCode}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Search failed')
      const json = await res.json()
      setSearchResults(json.numbers ?? [
        { number: `+1${areaCode}5550101`, price: '$1.50/mo' },
        { number: `+1${areaCode}5550102`, price: '$1.50/mo' },
        { number: `+1${areaCode}5550103`, price: '$1.50/mo' },
      ])
    } catch {
      toast.error('Failed to search numbers')
    } finally {
      setSearchingNumbers(false)
    }
  }

  // --- Purchase number ---
  async function purchaseNumber(number: string) {
    toast.info(`Purchasing ${number}...`)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const res = await fetch('/api/crm/phone-numbers/purchase', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number }),
      })
      if (!res.ok) throw new Error('Purchase failed')
      toast.success(`Purchased ${number}`)
      setPhoneNumbers(prev => [...prev, { id: Date.now().toString(), number, capabilities: ['sms', 'voice'] }])
    } catch {
      toast.error('Failed to purchase number')
    }
  }

  // --- Generate API token ---
  async function generateToken() {
    if (!newTokenName.trim()) {
      toast.error('Enter a token name')
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const res = await fetch('/api/auth/tokens', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName }),
      })
      if (!res.ok) throw new Error('Failed to generate token')
      const json = await res.json()
      setGeneratedToken(json.token ?? 'sk_live_xxxx...xxxx')
      setApiTokens(prev => [...prev, { id: json.id ?? Date.now().toString(), name: newTokenName, prefix: json.prefix ?? 'sk_live_', createdAt: new Date().toISOString() }])
      setNewTokenName('')
      toast.success('Token generated')
    } catch {
      toast.error('Failed to generate token')
    }
  }

  // --- Revoke token ---
  async function revokeToken(id: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      await fetch(`/api/auth/tokens/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      setApiTokens(prev => prev.filter(t => t.id !== id))
      toast.success('Token revoked')
    } catch {
      toast.error('Failed to revoke token')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Manage email, phone, social media, integrations, and security settings.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="email" className="gap-1.5">
            <Mail className="size-3.5" />
            Email
          </TabsTrigger>
          <TabsTrigger value="phone" className="gap-1.5">
            <Phone className="size-3.5" />
            Phone & SMS
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5">
            <Share2 className="size-3.5" />
            Social Media
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Plug className="size-3.5" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="size-3.5" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* ================================================================= */}
        {/* EMAIL TAB                                                          */}
        {/* ================================================================= */}
        <TabsContent value="email" className="space-y-4 pt-4">
          {/* Sending Domain */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="size-4" />
                Sending Domain
              </CardTitle>
              <CardDescription>Configure your email sending domain for deliverability.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label htmlFor="domain">Domain Name</Label>
                  <Input
                    id="domain"
                    placeholder="mail.yourdomain.com"
                    value={config.sendingDomain}
                    onChange={e => setConfig(prev => ({ ...prev, sendingDomain: e.target.value }))}
                  />
                </div>
                <div className="pt-5">
                  <StatusBadge status={config.domainStatus} />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={verifyDomain} disabled={!config.sendingDomain}>
                <CheckCircle2 className="size-3.5" />
                Verify Domain
              </Button>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Required DNS Records</p>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground font-mono space-y-1">
                  <p><span className="font-semibold text-foreground">DKIM:</span> Add a TXT record for your sending domain</p>
                  <p><span className="font-semibold text-foreground">SPF:</span> v=spf1 include:_spf.yourdomain.com ~all</p>
                  <p><span className="font-semibold text-foreground">DMARC:</span> v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMTP Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="size-4" />
                SMTP Settings
              </CardTitle>
              <CardDescription>Use a custom SMTP server for outgoing email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchRow
                label="Enable Custom SMTP"
                description="Override the default email sending provider."
                checked={config.smtpEnabled}
                onCheckedChange={() => toggle('smtpEnabled')}
              />
              {config.smtpEnabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Quick Select Provider</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['crm', 'sendgrid', 'mailgun', 'custom'] as const).map(p => (
                        <Button
                          key={p}
                          variant={config.smtpProvider === p ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setConfig(prev => ({ ...prev, smtpProvider: p }))}
                        >
                          {p === 'crm' ? 'CRM Built-in' : p.charAt(0).toUpperCase() + p.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {config.smtpProvider === 'custom' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldRow>
                        <Label htmlFor="smtp-host">SMTP Host</Label>
                        <Input id="smtp-host" placeholder="smtp.example.com" value={config.smtpHost} onChange={e => setConfig(prev => ({ ...prev, smtpHost: e.target.value }))} />
                      </FieldRow>
                      <FieldRow>
                        <Label htmlFor="smtp-port">Port</Label>
                        <Input id="smtp-port" placeholder="587" value={config.smtpPort} onChange={e => setConfig(prev => ({ ...prev, smtpPort: e.target.value }))} />
                      </FieldRow>
                      <FieldRow>
                        <Label htmlFor="smtp-user">Username</Label>
                        <Input id="smtp-user" value={config.smtpUsername} onChange={e => setConfig(prev => ({ ...prev, smtpUsername: e.target.value }))} />
                      </FieldRow>
                      <FieldRow>
                        <Label htmlFor="smtp-pass">Password</Label>
                        <Input id="smtp-pass" type="password" value={config.smtpPassword} onChange={e => setConfig(prev => ({ ...prev, smtpPassword: e.target.value }))} />
                      </FieldRow>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={testSmtp}>
                    <Send className="size-3.5" />
                    Test Connection
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Email Defaults */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-4" />
                Email Defaults
              </CardTitle>
              <CardDescription>Set default values for outgoing emails.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldRow>
                  <Label htmlFor="from-name">Default &quot;From&quot; Name</Label>
                  <Input id="from-name" placeholder="Your Business" value={config.fromName} onChange={e => setConfig(prev => ({ ...prev, fromName: e.target.value }))} />
                </FieldRow>
                <FieldRow>
                  <Label htmlFor="from-email">Default &quot;From&quot; Email</Label>
                  <Input id="from-email" type="email" placeholder="hello@yourdomain.com" value={config.fromEmail} onChange={e => setConfig(prev => ({ ...prev, fromEmail: e.target.value }))} />
                </FieldRow>
              </div>
              <FieldRow>
                <Label htmlFor="reply-to">Reply-To Address</Label>
                <Input id="reply-to" type="email" placeholder="support@yourdomain.com" value={config.replyTo} onChange={e => setConfig(prev => ({ ...prev, replyTo: e.target.value }))} />
              </FieldRow>
              <Separator />
              <div className="space-y-3">
                <SwitchRow label="Track Opens" checked={config.trackOpens} onCheckedChange={() => toggle('trackOpens')} />
                <SwitchRow label="Track Clicks" checked={config.trackClicks} onCheckedChange={() => toggle('trackClicks')} />
                <SwitchRow label="Include Unsubscribe Link" description="Required for CAN-SPAM compliance." checked={config.includeUnsubscribe} onCheckedChange={() => toggle('includeUnsubscribe')} />
              </div>
            </CardContent>
            <CardFooter>
              <Button size="sm" onClick={() => saveConfig()} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Save Email Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* PHONE & SMS TAB                                                    */}
        {/* ================================================================= */}
        <TabsContent value="phone" className="space-y-4 pt-4">
          {/* Phone Numbers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="size-4" />
                Phone Numbers
              </CardTitle>
              <CardDescription>Manage your purchased phone numbers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {phoneNumbers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No phone numbers purchased yet.</p>
              ) : (
                <div className="space-y-2">
                  {phoneNumbers.map(pn => (
                    <div key={pn.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Phone className="size-4 text-muted-foreground" />
                        <span className="text-sm font-mono font-medium">{pn.number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {pn.capabilities.map(c => (
                          <Badge key={c} variant="secondary">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Sheet>
                <SheetTrigger render={<Button variant="outline" size="sm" />}>
                  <Plus className="size-3.5" />
                  Purchase Number
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Purchase a Phone Number</SheetTitle>
                    <SheetDescription>Search by area code to find available numbers.</SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 p-4">
                    <FieldRow>
                      <Label htmlFor="area-code">Area Code</Label>
                      <div className="flex gap-2">
                        <Input id="area-code" placeholder="412" maxLength={3} value={areaCode} onChange={e => setAreaCode(e.target.value.replace(/\D/g, ''))} />
                        <Button size="sm" onClick={searchPhoneNumbers} disabled={areaCode.length < 3 || searchingNumbers}>
                          {searchingNumbers ? <Loader2 className="size-3.5 animate-spin" /> : 'Search'}
                        </Button>
                      </div>
                    </FieldRow>
                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        {searchResults.map(r => (
                          <div key={r.number} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <span className="text-sm font-mono font-medium">{r.number}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{r.price}</span>
                            </div>
                            <Button size="xs" onClick={() => purchaseNumber(r.number)}>Purchase</Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Phone numbers are billed monthly through your CRM account.</p>
                  </div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>

          {/* SMS Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-4" />
                SMS Settings
              </CardTitle>
              <CardDescription>Configure text messaging preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchRow label="Enable SMS" description="Allow sending and receiving text messages." checked={config.smsEnabled} onCheckedChange={() => toggle('smsEnabled')} />
              {config.smsEnabled && (
                <>
                  <FieldRow>
                    <Label htmlFor="sms-sender">Default SMS Sender ID</Label>
                    <Input id="sms-sender" placeholder="Your Business" value={config.smsSenderId} onChange={e => setConfig(prev => ({ ...prev, smsSenderId: e.target.value }))} />
                  </FieldRow>
                  <Separator />
                  <SwitchRow label="Auto-respond to Missed Calls" description="Send an SMS when a call is missed." checked={config.autoRespondMissed} onCheckedChange={() => toggle('autoRespondMissed')} />
                  {config.autoRespondMissed && (
                    <FieldRow>
                      <Label htmlFor="missed-reply">Missed Call Auto-Reply</Label>
                      <Input id="missed-reply" value={config.missedCallReply} onChange={e => setConfig(prev => ({ ...prev, missedCallReply: e.target.value }))} />
                    </FieldRow>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Call Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneCall className="size-4" />
                Call Settings
              </CardTitle>
              <CardDescription>Configure voice call preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchRow label="Call Recording" description="Automatically record incoming and outgoing calls." checked={config.callRecording} onCheckedChange={() => toggle('callRecording')} />
              <SwitchRow label="Voicemail Enabled" checked={config.voicemailEnabled} onCheckedChange={() => toggle('voicemailEnabled')} />
              {config.voicemailEnabled && (
                <FieldRow>
                  <Label htmlFor="vm-greeting">Voicemail Greeting Message</Label>
                  <Input id="vm-greeting" placeholder="Please leave a message..." value={config.voicemailGreeting} onChange={e => setConfig(prev => ({ ...prev, voicemailGreeting: e.target.value }))} />
                </FieldRow>
              )}
              <FieldRow>
                <Label htmlFor="call-fwd">Call Forwarding Number</Label>
                <Input id="call-fwd" type="tel" placeholder="+1 (555) 000-0000" value={config.callForwarding} onChange={e => setConfig(prev => ({ ...prev, callForwarding: e.target.value }))} />
              </FieldRow>
            </CardContent>
            <CardFooter>
              <Button size="sm" onClick={() => saveConfig()} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Save Phone Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* SOCIAL MEDIA TAB                                                   */}
        {/* ================================================================= */}
        <TabsContent value="social" className="space-y-4 pt-4">
          {/* Connected Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="size-4" />
                Connected Accounts
              </CardTitle>
              <CardDescription>Manage social media platform connections.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {socialAccounts.map(account => (
                  <div key={account.platform} className="flex flex-col items-center gap-3 rounded-lg border p-4 text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                      {account.icon}
                    </div>
                    <span className="text-sm font-medium">{account.label}</span>
                    <StatusBadge status={account.connected ? 'connected' : 'not_connected'} />
                    <Sheet>
                      <SheetTrigger render={<Button variant="outline" size="xs" />}>
                        {account.connected ? 'Manage' : 'Connect'}
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Connect {account.label}</SheetTitle>
                          <SheetDescription>
                            Social accounts are connected through your CRM. Click below to open the connection page.
                          </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-4 p-4">
                          <p className="text-sm text-muted-foreground">
                            Social media integrations are managed through your CRM dashboard. This ensures proper OAuth authentication and token management.
                          </p>
                          <Button
                            className="w-full"
                            onClick={() => window.open('https://app.gohighlevel.com/settings/social', '_blank')}
                          >
                            <ExternalLink className="size-3.5" />
                            Open CRM Social Settings
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Posting Defaults */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="size-4" />
                Posting Defaults
              </CardTitle>
              <CardDescription>Default settings for social media posting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchRow label="Auto-post New Blog Content" description="Publish to connected socials when blog posts go live." checked={config.autoPostBlog} onCheckedChange={() => toggle('autoPostBlog')} />
              <SwitchRow label="Include Hashtags" checked={config.includeHashtags} onCheckedChange={() => toggle('includeHashtags')} />
              {config.includeHashtags && (
                <FieldRow>
                  <Label htmlFor="hashtags">Default Hashtags</Label>
                  <Input id="hashtags" placeholder="#ai, #automation, #workflow" value={config.defaultHashtags} onChange={e => setConfig(prev => ({ ...prev, defaultHashtags: e.target.value }))} />
                </FieldRow>
              )}
              <FieldRow>
                <Label htmlFor="post-time">Default Posting Time</Label>
                <Input id="post-time" type="time" value={config.postingTime} onChange={e => setConfig(prev => ({ ...prev, postingTime: e.target.value }))} />
              </FieldRow>
              <SwitchRow label="Approval Required Before Posting" description="Require manual approval before scheduled posts go live." checked={config.approvalRequired} onCheckedChange={() => toggle('approvalRequired')} />
            </CardContent>
            <CardFooter>
              <Button size="sm" onClick={() => saveConfig()} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Save Social Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* INTEGRATIONS TAB                                                   */}
        {/* ================================================================= */}
        <TabsContent value="integrations" className="space-y-4 pt-4">
          {/* Google */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="size-4" />
                Google
              </CardTitle>
              <CardDescription>Google Analytics and Search Console.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={config.gaPropertyId ? 'connected' : 'not_connected'} />
                <Button variant="outline" size="xs" onClick={() => window.location.href = '/dashboard/settings/analytics'}>
                  <ExternalLink className="size-3" />
                  Upload SA Key
                </Button>
              </div>
              {config.gaPropertyId && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
                  <span className="text-muted-foreground">GA4 Property ID: </span>
                  <span className="text-foreground">{config.gaPropertyId}</span>
                </div>
              )}
              <SwitchRow label="Auto-sync Analytics Daily" checked={config.autoSyncAnalytics} onCheckedChange={() => toggle('autoSyncAnalytics')} />
            </CardContent>
          </Card>

          {/* WordPress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="size-4" />
                WordPress
              </CardTitle>
              <CardDescription>Connect your WordPress site for content sync.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusBadge status={config.wordpressUrl ? 'connected' : 'not_connected'} />
              <FieldRow>
                <Label htmlFor="wp-url">WordPress Site URL</Label>
                <Input id="wp-url" placeholder="https://yourblog.com" value={config.wordpressUrl} onChange={e => setConfig(prev => ({ ...prev, wordpressUrl: e.target.value }))} />
              </FieldRow>
              <SwitchRow label="Auto-sync Content" description="Keep WordPress posts in sync with 0nCore." checked={config.autoSyncContent} onCheckedChange={() => toggle('autoSyncContent')} />
            </CardContent>
          </Card>

          {/* Stripe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="size-4" />
                Stripe
              </CardTitle>
              <CardDescription>Payment processing configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusBadge status="connected" />
              <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
                <span className="text-muted-foreground">Account: </span>
                <span className="text-foreground">acct_****KVQM</span>
              </div>
              <SwitchRow label="Auto-invoice" description="Automatically generate invoices for transactions." checked={config.stripeAutoInvoice} onCheckedChange={() => toggle('stripeAutoInvoice')} />
              <SwitchRow label="Send Payment Receipts" checked={config.stripeSendReceipts} onCheckedChange={() => toggle('stripeSendReceipts')} />
            </CardContent>
          </Card>

          {/* CRM */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="size-4" />
                CRM
              </CardTitle>
              <CardDescription>CRM connection and marketplace app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusBadge status={config.crmLocationId ? 'connected' : 'not_connected'} />
              {config.crmLocationId && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
                  <span className="text-muted-foreground">Location ID: </span>
                  <span className="text-foreground">{config.crmLocationId}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open('https://marketplace.gohighlevel.com/oauth/chooselocation', '_blank')}>
                  <ExternalLink className="size-3.5" />
                  Install Marketplace App
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  toast.info('Syncing CRM data...')
                  fetch('/api/crm/sync', { method: 'POST' }).then(() => toast.success('Sync complete')).catch(() => toast.error('Sync failed'))
                }}>
                  <RefreshCw className="size-3.5" />
                  Sync Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Slack */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-4" />
                Slack
              </CardTitle>
              <CardDescription>Slack notifications and alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={config.slackNotifications ? 'connected' : 'not_connected'} />
                <Button variant="outline" size="xs">
                  <ExternalLink className="size-3" />
                  Connect Slack
                </Button>
              </div>
              <FieldRow>
                <Label htmlFor="slack-channel">Default Notification Channel</Label>
                <Input id="slack-channel" placeholder="#general" value={config.slackChannel} onChange={e => setConfig(prev => ({ ...prev, slackChannel: e.target.value }))} />
              </FieldRow>
              <SwitchRow label="Send Workflow Notifications" description="Post to Slack when workflows complete." checked={config.slackNotifications} onCheckedChange={() => toggle('slackNotifications')} />
            </CardContent>
            <CardFooter>
              <Button size="sm" onClick={() => saveConfig()} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Save Integration Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* SECURITY TAB                                                       */}
        {/* ================================================================= */}
        <TabsContent value="security" className="space-y-4 pt-4">
          {/* Trust Engine */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-4" />
                Trust Engine
              </CardTitle>
              <CardDescription>Configure the security level for your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Security Level</Label>
                <div className="flex flex-wrap gap-2">
                  {(['low', 'default', 'strict'] as const).map(level => (
                    <Button
                      key={level}
                      variant={config.securityLevel === level ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setConfig(prev => ({ ...prev, securityLevel: level }))
                        saveConfig({ ...config, securityLevel: level })
                      }}
                    >
                      {level === 'low' && <AlertCircle className="size-3.5" />}
                      {level === 'default' && <Shield className="size-3.5" />}
                      {level === 'strict' && <Shield className="size-3.5" />}
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                {config.securityLevel === 'low' && <p>Minimal restrictions. Suitable for development and testing environments.</p>}
                {config.securityLevel === 'default' && <p>Balanced security with standard session timeouts and rate limiting.</p>}
                {config.securityLevel === 'strict' && <p>Maximum protection with MFA enforcement, IP restrictions, and audit logging.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="size-4" />
                Authentication
              </CardTitle>
              <CardDescription>Manage authentication and session settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchRow label="Require MFA" description="Enforce multi-factor authentication for all users." checked={config.requireMfa} onCheckedChange={() => toggle('requireMfa')} />
              <Separator />
              <SwitchRow label="Session Timeout" description="Automatically log out after inactivity." checked={config.sessionTimeout} onCheckedChange={() => toggle('sessionTimeout')} />
              {config.sessionTimeout && (
                <FieldRow>
                  <Label htmlFor="timeout-min">Timeout (minutes)</Label>
                  <Input id="timeout-min" type="number" min="5" max="1440" value={config.sessionMinutes} onChange={e => setConfig(prev => ({ ...prev, sessionMinutes: e.target.value }))} />
                </FieldRow>
              )}
              <Separator />
              <SwitchRow label="IP Whitelist" description="Restrict access to specific IP addresses." checked={config.ipWhitelist} onCheckedChange={() => toggle('ipWhitelist')} />
              {config.ipWhitelist && (
                <FieldRow>
                  <Label htmlFor="ips">Allowed IPs (comma-separated)</Label>
                  <Input id="ips" placeholder="192.168.1.1, 10.0.0.1" value={config.allowedIps} onChange={e => setConfig(prev => ({ ...prev, allowedIps: e.target.value }))} />
                </FieldRow>
              )}
            </CardContent>
            <CardFooter>
              <Button size="sm" onClick={() => saveConfig()} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Save Security Settings
              </Button>
            </CardFooter>
          </Card>

          {/* API Tokens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="size-4" />
                API Tokens
              </CardTitle>
              <CardDescription>Manage API access tokens for programmatic access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {apiTokens.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active API tokens.</p>
              ) : (
                <div className="space-y-2">
                  {apiTokens.map(token => (
                    <div key={token.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{token.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{token.prefix}****</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          <Clock className="mr-1 inline size-3" />
                          {new Date(token.createdAt).toLocaleDateString()}
                        </span>
                        <Button variant="destructive" size="icon-xs" onClick={() => revokeToken(token.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" />}>
                  <Plus className="size-3.5" />
                  Generate New Token
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate API Token</DialogTitle>
                    <DialogDescription>
                      Create a new token for programmatic API access. Save it immediately — it will not be shown again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {!generatedToken ? (
                      <FieldRow>
                        <Label htmlFor="token-name">Token Name</Label>
                        <Input id="token-name" placeholder="My Integration" value={newTokenName} onChange={e => setNewTokenName(e.target.value)} />
                      </FieldRow>
                    ) : (
                      <div className="space-y-2">
                        <Label>Your New Token</Label>
                        <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                          <code className="flex-1 break-all text-xs">{generatedToken}</code>
                          <Button variant="ghost" size="icon-xs" onClick={() => { navigator.clipboard.writeText(generatedToken); toast.success('Copied!') }}>
                            <Copy className="size-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-destructive font-medium">Save this token now. It cannot be retrieved later.</p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    {!generatedToken ? (
                      <Button size="sm" onClick={generateToken} disabled={!newTokenName.trim()}>Generate</Button>
                    ) : (
                      <Button size="sm" onClick={() => { setTokenDialogOpen(false); setGeneratedToken('') }}>Done</Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
