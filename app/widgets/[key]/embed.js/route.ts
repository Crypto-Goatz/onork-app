import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { widget } from '@/lib/widgets/registry'

/**
 * GET /widgets/:key/embed.js?location=… — the script a snapshot page carries.
 *
 * ONE TAG, FOREVER. The page ships with this tag baked in; everything else —
 * copy, colours, whether the widget is on at all — is read from us at render
 * time. That is what makes "edit once, changes on every client site" true, and
 * it is also the only mechanism available: there is no API to write content
 * into a funnel or site page after the fact.
 *
 * PUBLIC BY NECESSITY, so it must leak nothing. It runs on a client's public
 * website, where anyone can read it. It therefore returns only what is already
 * public — the agency's own copy and colours — and never a token, a contact, or
 * anything belonging to another client. The location id in the URL is a
 * PLACEMENT, not a credential: knowing it grants nothing that visiting the page
 * would not already show.
 *
 * NEVER RENDERS A HALF-BUILT WIDGET. A widget whose backing product is not
 * finished returns a script that does nothing at all, rather than a broken box
 * on a customer's public page.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const js = (body: string) =>
  new NextResponse(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Short cache: an agency editing copy expects to see it, but every page
      // view should not hit the database either.
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
    },
  })

const noop = (why: string) => js(`/* 0nCORE: ${why} */`)

export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params
  const w = widget(key)
  if (!w) return noop('unknown widget')
  if (!w.live) return noop(`${w.key} is not finished yet`)

  const locationId = req.nextUrl.searchParams.get('location') || ''
  // An unresolved merge field means the tag was pasted outside a page that can
  // resolve it. Rendering nothing beats rendering someone else's data.
  if (!locationId || locationId.includes('{{')) return noop('no location resolved')

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data } = await sb
    .from('widget_configs')
    .select('enabled, config')
    .eq('widget_key', key)
    .eq('location_id', locationId)
    .maybeSingle()

  if (data && data.enabled === false) return noop('switched off for this client')
  const cfg = (data?.config ?? {}) as Record<string, string>

  const ctxJson = JSON.stringify({
    key,
    locationId,
    cfg,
    api: 'https://app.0ncore.com',
  })

  return js(`(function(){var C=${ctxJson};\n${RENDERERS[key] ?? ''}\n})();`)
}

/**
 * Each renderer is plain browser JS, injected with `C` in scope.
 *
 * No framework and no build step on purpose: this runs on someone else's
 * website, where a heavy bundle is a page-speed problem the agency gets blamed
 * for. Styles are inlined and scoped by an id so nothing collides with the
 * host page's CSS.
 */
const RENDERERS: Record<string, string> = {
  oncore_analytics: `
    var s=document.createElement('script');
    s.async=true;
    s.src=C.api+'/api/dr/script/dr_0ncore_com_4wdui5.js';
    s.setAttribute('data-location',C.locationId);
    document.head.appendChild(s);`,

  oncore_conversion_bar: `
    if(!C.cfg.message) return;
    var d=document.createElement('div');
    d.id='oncore-bar';
    d.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;gap:12px;align-items:center;justify-content:center;padding:12px 16px;background:'+(C.cfg.accent||'#181D19')+';color:#fff;font:500 14px/1.4 system-ui,sans-serif';
    var t=document.createElement('span'); t.textContent=C.cfg.message; d.appendChild(t);
    if(C.cfg.ctaText&&C.cfg.ctaUrl){
      var a=document.createElement('a'); a.href=C.cfg.ctaUrl; a.textContent=C.cfg.ctaText;
      a.style.cssText='background:#fff;color:#181D19;padding:7px 14px;border-radius:999px;text-decoration:none;font-weight:600;white-space:nowrap';
      d.appendChild(a);
    }
    var x=document.createElement('button'); x.textContent='×'; x.setAttribute('aria-label','Close');
    x.style.cssText='background:none;border:0;color:#fff;font-size:20px;line-height:1;cursor:pointer;padding:0 4px';
    x.onclick=function(){d.remove()};
    d.appendChild(x);
    document.body.appendChild(d);`,

  oncore_form_capture: `
    var mount=document.getElementById('oncore-form')||document.currentScript&&document.currentScript.parentNode;
    if(!mount) return;
    var f=document.createElement('form');
    f.style.cssText='display:grid;gap:10px;max-width:420px;font:400 14px/1.4 system-ui,sans-serif';
    f.innerHTML='<div style="font:700 18px/1.2 system-ui">'+(C.cfg.heading||'Get in touch')+'</div>'
      +'<input name="name" placeholder="Your name" required style="padding:10px 12px;border:1px solid #d8dcd9;border-radius:10px">'
      +'<input name="email" type="email" placeholder="Email" required style="padding:10px 12px;border:1px solid #d8dcd9;border-radius:10px">'
      +'<input name="phone" placeholder="Phone" style="padding:10px 12px;border:1px solid #d8dcd9;border-radius:10px">'
      +'<button style="padding:11px 14px;border:0;border-radius:999px;background:#2E9A1F;color:#fff;font-weight:600;cursor:pointer">'+(C.cfg.button||'Send')+'</button>';
    f.onsubmit=function(e){
      e.preventDefault();
      var fd=new FormData(f);
      var btn=f.querySelector('button'); btn.disabled=true; btn.textContent='Sending…';
      fetch(C.api+'/api/widgets/lead/'+C.key,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({locationId:C.locationId,name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone')})})
        .then(function(r){return r.json()})
        .then(function(){f.innerHTML='<div style="font:600 15px/1.4 system-ui;color:#2E9A1F">Thanks — we\\'ll be in touch.</div>'})
        .catch(function(){btn.disabled=false;btn.textContent='Try again'});
    };
    mount.appendChild(f);`,
}
