/**
 * Web Tools — server-side tracking config.
 * GET  → this user's saved tracking IDs + a ready-to-install <head> snippet
 * PUT  → save tracking IDs  { ga4_id, fb_pixel_id, gads_id, gtm_id, custom_head }
 *
 * Persists per user (replaces the old localStorage-only storage), and builds the
 * combined GA4 + GTM + Facebook Pixel + Google Ads snippet to paste into any
 * site or push into the CRM funnel's tracking settings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface Cfg { ga4_id?: string | null; fb_pixel_id?: string | null; gads_id?: string | null; gtm_id?: string | null; custom_head?: string | null }

function buildSnippet(c: Cfg): string {
  const parts: string[] = []
  if (c.gtm_id) parts.push(
    `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${c.gtm_id}');</script>`)
  if (c.ga4_id || c.gads_id) {
    const id = c.ga4_id || c.gads_id
    parts.push(`<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${c.ga4_id ? `gtag('config','${c.ga4_id}');` : ''}${c.gads_id ? `gtag('config','${c.gads_id}');` : ''}</script>`)
  }
  if (c.fb_pixel_id) parts.push(
    `<!-- Meta Pixel -->\n<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${c.fb_pixel_id}');fbq('track','PageView');</script>`)
  if (c.custom_head) parts.push(`<!-- Custom -->\n${c.custom_head}`)
  return parts.join('\n\n')
}

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  return (await supabase.auth.getSession()).data.session?.user?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await admin.from('web_tracking_config').select('*').eq('user_id', userId).maybeSingle()
  const cfg: Cfg = data || {}
  return NextResponse.json({ config: cfg, snippet: buildSnippet(cfg) })
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const row = {
    user_id: userId,
    ga4_id: body.ga4_id || null,
    fb_pixel_id: body.fb_pixel_id || null,
    gads_id: body.gads_id || null,
    gtm_id: body.gtm_id || null,
    custom_head: body.custom_head || null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await admin.from('web_tracking_config').upsert(row, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, config: row, snippet: buildSnippet(row) })
}
