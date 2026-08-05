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

  /**
   * The member portal is the one widget that does NOT need a location in the
   * tag: its signed session already names the contact AND the location, which
   * is stronger than anything a page could tell us. Every other widget still
   * refuses without one.
   */
  const selfIdentifying = key === 'oncore_member_profile'

  // An unresolved merge field means the tag was pasted outside a page that can
  // resolve it. Rendering nothing beats rendering someone else's data.
  if (!selfIdentifying && (!locationId || locationId.includes('{{'))) return noop('no location resolved')

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data } = locationId && !locationId.includes('{{')
    ? await sb.from('widget_configs').select('enabled, config')
        .eq('widget_key', key).eq('location_id', locationId).maybeSingle()
    : { data: null }

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

  oncore_chat: `
    var b=document.createElement('button');
    b.setAttribute('aria-label','Chat with us');
    b.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483000;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;background:'+(C.cfg.accent||'#2E9A1F')+';color:#fff;font:600 22px/1 system-ui;box-shadow:0 8px 24px -8px rgba(0,0,0,.45)';
    b.textContent='\u2709';
    var panel=null;
    b.onclick=function(){
      if(panel){panel.remove();panel=null;return}
      panel=document.createElement('div');
      panel.style.cssText='position:fixed;right:18px;bottom:84px;z-index:2147483000;width:min(360px,calc(100vw - 36px));height:min(460px,70vh);display:flex;flex-direction:column;background:#fff;border:1px solid #e4e7e5;border-radius:16px;overflow:hidden;box-shadow:0 18px 48px -18px rgba(0,0,0,.35);font:400 14px/1.5 system-ui,-apple-system,sans-serif';
      panel.innerHTML='<div style="padding:12px 14px;border-bottom:1px solid #eceeed;font-weight:600">'+(C.cfg.greeting||'How can we help?')+'</div>'
        +'<div id="oc-chat-log" style="flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px"></div>'
        +'<form id="oc-chat-f" style="display:flex;gap:8px;padding:10px;border-top:1px solid #eceeed">'
        +'<input id="oc-chat-i" placeholder="Type a message" style="flex:1;padding:9px 12px;border:1px solid #d8dcd9;border-radius:999px;font:inherit">'
        +'<button style="border:0;border-radius:999px;padding:9px 14px;background:'+(C.cfg.accent||'#2E9A1F')+';color:#fff;font-weight:600;cursor:pointer">Send</button></form>';
      document.body.appendChild(panel);
      var log=panel.querySelector('#oc-chat-log');
      function say(who,text){
        var d=document.createElement('div');
        d.style.cssText='max-width:85%;padding:8px 11px;border-radius:12px;'+(who==='you'?'align-self:flex-end;background:#eef6ec':'align-self:flex-start;background:#f3f4f3');
        d.textContent=text; log.appendChild(d); log.scrollTop=log.scrollHeight;
      }
      panel.querySelector('#oc-chat-f').onsubmit=function(e){
        e.preventDefault();
        var i=panel.querySelector('#oc-chat-i'); var msg=i.value.trim(); if(!msg) return;
        i.value=''; say('you',msg); say('them','…');
        var thinking=log.lastChild;
        fetch(C.api+'/api/widgets/chat',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({locationId:C.locationId,message:msg})})
          .then(function(r){return r.json()})
          .then(function(j){thinking.textContent=j.reply||j.error||'Sorry — I could not answer that.'})
          .catch(function(){thinking.textContent='Sorry — I could not reach us just now.'});
      };
    };
    document.body.appendChild(b);`,

  oncore_member_profile: `
    var mount=document.getElementById('oncore-portal'); if(!mount) return;
    var k=new URLSearchParams(location.search).get('k');
    var S=sessionStorage.getItem('oncore.member');
    function box(h){mount.innerHTML='<div style="font:400 15px/1.55 system-ui,-apple-system,sans-serif;max-width:560px">'+h+'</div>'}
    function fields(p,editable){
      var labels={firstName:'First name',lastName:'Last name',email:'Email',phone:'Phone',address1:'Address',city:'City',state:'State',postalCode:'Postcode',companyName:'Company',website:'Website'};
      return Object.keys(labels).map(function(f){
        var v=(p[f]||'');
        return editable
          ? '<label style="display:block;margin-bottom:10px"><span style="display:block;font-size:12px;color:#5c6660;margin-bottom:4px">'+labels[f]+'</span><input name="'+f+'" value="'+String(v).replace(/"/g,'&quot;')+'" style="width:100%;padding:10px 12px;border:1px solid #d8dcd9;border-radius:10px;font:inherit"></label>'
          : '<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eceeed"><span style="color:#5c6660">'+labels[f]+'</span><span style="font-weight:500;text-align:right">'+(v||'—')+'</span></div>';
      }).join('');
    }
    function render(session){
      fetch(C.api+'/api/member/profile',{headers:{'x-member-session':session}})
        .then(function(r){return r.json()})
        .then(function(j){
          if(!j.ok){box('<p>'+(j.error||'Please open your portal link again.')+'</p>');return}
          var edit=C.cfg.mode==='edit';
          box('<h2 style="font:700 20px/1.2 system-ui;margin:0 0 4px">'+(C.cfg.heading||('Hello, '+j.name))+'</h2>'
            +'<p style="color:#5c6660;margin:0 0 16px">'+(C.cfg.subheading||(edit?'Update your details below.':'Your details.'))+'</p>'
            +(edit?'<form id="oncore-pf">'+fields(j.profile,true)+'<button style="margin-top:6px;padding:11px 18px;border:0;border-radius:999px;background:#2E9A1F;color:#fff;font-weight:600;cursor:pointer">Save changes</button><span id="oncore-pmsg" style="margin-left:10px;font-size:13px"></span></form>':fields(j.profile,false));
          var f=document.getElementById('oncore-pf');
          if(f) f.onsubmit=function(e){
            e.preventDefault();
            var fd=new FormData(f),body={};fd.forEach(function(v,k){body[k]=v});
            var msg=document.getElementById('oncore-pmsg');msg.textContent='Saving…';
            fetch(C.api+'/api/member/profile',{method:'PUT',headers:{'Content-Type':'application/json','x-member-session':session},body:JSON.stringify(body)})
              .then(function(r){return r.json()})
              .then(function(x){msg.textContent=x.ok?'Saved.':(x.error||'Could not save.');msg.style.color=x.ok?'#2E9A1F':'#D65454'})
              .catch(function(){msg.textContent='Could not save.';msg.style.color='#D65454'});
          };
        })
        .catch(function(){box('<p>Could not load your details.</p>')});
    }
    if(S){render(S)}
    else if(k){
      fetch(C.api+'/api/member/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({link:k})})
        .then(function(r){return r.json()})
        .then(function(j){
          if(!j.ok){box('<p>'+(j.error||'This link is not valid any more.')+'</p>');return}
          sessionStorage.setItem('oncore.member',j.session);
          history.replaceState({},'',location.pathname);
          render(j.session);
        })
        .catch(function(){box('<p>Could not sign you in.</p>')});
    } else {
      box('<p style="color:#5c6660">Open the link from your email to see your details.</p>');
    }`,

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
