import { NextRequest, NextResponse } from 'next/server'
import { drAdmin } from '@/lib/dr/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Path arrives as `[siteId].js` because the install snippet points to
// `/api/dr/script/SITE_ID.js`. We strip the trailing `.js` here.
function parseSiteId(raw: string): string | null {
  const decoded = decodeURIComponent(raw || '')
  if (!decoded) return null
  const stripped = decoded.endsWith('.js') ? decoded.slice(0, -3) : decoded
  return /^[a-z0-9_]+$/.test(stripped) ? stripped : null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId: rawSiteId } = await params
  const siteId = parseSiteId(rawSiteId)
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'www.0ncore.com'
  const endpoint = `${proto}://${host}/api/dr/events`

  if (!siteId) {
    return new NextResponse('// dr: invalid site id', {
      status: 404,
      headers: { 'content-type': 'application/javascript; charset=utf-8' },
    })
  }

  const { data, error } = await drAdmin()
    .from('dr_domains')
    .select('domain, is_active')
    .eq('site_id', siteId)
    .maybeSingle()

  if (error || !data || !data.is_active) {
    return new NextResponse('// dr: site not found or inactive', {
      status: 404,
      headers: { 'content-type': 'application/javascript; charset=utf-8' },
    })
  }

  const body = renderScript(siteId, String(data.domain), endpoint)

  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      // 5 minute edge cache — domain lock and is_active don't change often,
      // and the script is identical across all visitors of one site.
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  })
}

function renderScript(siteId: string, domain: string, endpoint: string): string {
  const cfg = JSON.stringify({ siteId, domain, endpoint })
  return `/* Detect & Refine v1 — site:${siteId} */
(function(){
  var CFG=${cfg};
  try {
    if (location.hostname.indexOf(CFG.domain)===-1 && location.hostname.replace(/^www\\./,'').indexOf(CFG.domain.replace(/^www\\./,''))===-1) return;
  } catch(e) { return; }

  var sid=null;
  try { sid=sessionStorage.getItem('dr_sid'); } catch(e){}
  if(!sid){
    sid='dr_'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);
    try { sessionStorage.setItem('dr_sid',sid); } catch(e){}
  }

  var params;
  try { params=new URLSearchParams(location.search); } catch(e){ params=null; }
  function p(k){ return params?params.get(k):null; }
  var gclid=p('gclid'), fbclid=p('fbclid'), li=p('li_fat_id'), tt=p('ttclid'), msclkid=p('msclkid');
  var clickId=gclid||fbclid||li||tt||msclkid||null;
  var ref=document.referrer||'';
  var platform=gclid?'google':fbclid?'meta':li?'linkedin':tt?'tiktok':msclkid?'bing':
    /facebook\\.|instagram\\.|fb\\./i.test(ref)?'meta':
    /google\\./i.test(ref)?'google':
    /linkedin\\./i.test(ref)?'linkedin':
    /tiktok\\./i.test(ref)?'tiktok':
    /bing\\.|duckduckgo\\.|yahoo\\./i.test(ref)?'bing':
    ref?'organic':'direct';

  var s={
    pageLoad:Date.now(), lastActivity:Date.now(), activeTime:0,
    scrollMax:0, scrollEvents:0,
    clicks:0, rageClicks:0, lastClickAt:0, lastClickX:0, lastClickY:0, recentClickTimes:[],
    mouseDistance:0, mouseEvents:0, lastMouseX:-1, lastMouseY:-1, lastMouseMoveAt:0,
    keypresses:0, formInteractions:0, formFieldsTouched:{},
    copyEvents:0, pasteEvents:0, selectionEvents:0,
    visibilityHidden:0, visibilityChanges:0,
    exitIntent:0, idleSpurts:0, lastIdleAt:0,
    maxBurstClicksPerSec:0, _bucketStart:Date.now(), _bucketCount:0,
    sent:false
  };

  function tick(){ var n=Date.now(); if(n-s.lastActivity<1500) s.activeTime+=Math.min(1500,n-s.lastActivity); s.lastActivity=n; }
  function bumpBurst(){
    var n=Date.now();
    if(n-s._bucketStart>1000){ s._bucketStart=n; s._bucketCount=0; }
    s._bucketCount++;
    if(s._bucketCount>s.maxBurstClicksPerSec) s.maxBurstClicksPerSec=s._bucketCount;
  }

  // Scroll depth
  function onScroll(){
    var doc=document.documentElement, body=document.body;
    var scrollTop=window.pageYOffset||doc.scrollTop||body.scrollTop||0;
    var height=Math.max(doc.scrollHeight,body.scrollHeight)-window.innerHeight;
    if(height>0){
      var pct=Math.min(100,Math.round((scrollTop/height)*100));
      if(pct>s.scrollMax) s.scrollMax=pct;
    }
    s.scrollEvents++; tick();
  }

  // Mouse movement
  function onMove(e){
    if(s.lastMouseX>=0){
      var dx=e.clientX-s.lastMouseX, dy=e.clientY-s.lastMouseY;
      s.mouseDistance+=Math.sqrt(dx*dx+dy*dy);
    }
    s.lastMouseX=e.clientX; s.lastMouseY=e.clientY;
    s.lastMouseMoveAt=Date.now(); s.mouseEvents++; tick();
    // Exit intent — mouse leaves through top edge with non-trivial speed
    if(e.clientY<=2 && Date.now()-s.pageLoad>1500) s.exitIntent++;
  }
  function onLeave(e){
    if(e.clientY<=0) s.exitIntent++;
  }

  // Clicks + rage clicks
  function onClick(e){
    var n=Date.now();
    s.clicks++; bumpBurst();
    if(s.lastClickAt && n-s.lastClickAt<500){
      var dx=Math.abs(e.clientX-s.lastClickX), dy=Math.abs(e.clientY-s.lastClickY);
      if(dx<25 && dy<25) s.rageClicks++;
    }
    s.recentClickTimes.push(n);
    if(s.recentClickTimes.length>20) s.recentClickTimes.shift();
    s.lastClickAt=n; s.lastClickX=e.clientX; s.lastClickY=e.clientY;
    tick();
  }

  // Keyboard activity
  function onKey(){ s.keypresses++; tick(); }

  // Form interaction tracking
  function onFormFocus(e){
    var t=e.target;
    if(!t || !t.tagName) return;
    var tag=t.tagName.toLowerCase();
    if(tag!=='input' && tag!=='textarea' && tag!=='select') return;
    var k=(t.name||t.id||tag)+':'+(t.type||'');
    if(!s.formFieldsTouched[k]){
      s.formFieldsTouched[k]=1;
      s.formInteractions++;
    }
    tick();
  }

  // Copy / paste / select — bot signal (none) vs human (some)
  function onCopy(){ s.copyEvents++; }
  function onPaste(){ s.pasteEvents++; tick(); }
  function onSelect(){ s.selectionEvents++; }

  // Visibility
  function onVis(){
    s.visibilityChanges++;
    if(document.visibilityState==='hidden') s.visibilityHidden++;
  }

  document.addEventListener('scroll',onScroll,{passive:true});
  document.addEventListener('mousemove',onMove,{passive:true});
  document.addEventListener('mouseout',onLeave,{passive:true});
  document.addEventListener('click',onClick,{passive:true});
  document.addEventListener('keydown',onKey,{passive:true});
  document.addEventListener('focusin',onFormFocus,{passive:true});
  document.addEventListener('copy',onCopy,{passive:true});
  document.addEventListener('paste',onPaste,{passive:true});
  document.addEventListener('selectionchange',onSelect,{passive:true});
  document.addEventListener('visibilitychange',onVis,{passive:true});

  function score(timeOnPage){
    // Score 0-100: depth, engagement, intent, anti-bot.
    // Bot detection: zero mouse, zero scroll, zero keys, super-fast bounce,
    // headless / unusual UA, or clicks-only-no-movement.
    var ua=(navigator.userAgent||'').toLowerCase();
    var headless=/headless|phantomjs|selenium|puppeteer|playwright|bot|crawler|spider|preview/i.test(ua);
    var noInteraction=s.mouseEvents===0 && s.keypresses===0 && s.scrollEvents===0;
    var instantBounce=timeOnPage<800 && s.scrollMax===0 && s.mouseEvents===0;
    var clicksWithoutMove=s.clicks>0 && s.mouseDistance<50 && s.mouseEvents<5;

    if(headless || (noInteraction && timeOnPage<1500) || instantBounce || (clicksWithoutMove && timeOnPage<3000)){
      return { score:5, isBot:true };
    }

    var sc=0;
    // Time on page (max 25)
    sc += Math.min(25, Math.round(timeOnPage/2400));
    // Scroll depth (max 20)
    sc += Math.round(s.scrollMax*0.20);
    // Active engagement ratio (max 15)
    var activeRatio = timeOnPage>0 ? Math.min(1, s.activeTime/timeOnPage) : 0;
    sc += Math.round(activeRatio*15);
    // Mouse movement (max 10)
    sc += Math.min(10, Math.round(s.mouseDistance/600));
    // Clicks — value first 3, diminishing after, penalize rage (max 10)
    sc += Math.min(10, s.clicks*3) - Math.min(15, s.rageClicks*5);
    // Keystrokes (max 8)
    sc += Math.min(8, Math.round(s.keypresses/4));
    // Forms (max 12)
    sc += Math.min(12, s.formInteractions*4);
    // Selection / copy / paste signal humans (max 5)
    sc += Math.min(5, (s.selectionEvents>0?2:0)+(s.copyEvents>0?2:0)+(s.pasteEvents>0?1:0));
    // Tab visibility — a single hide is fine, many flips are noisy (max 5)
    if(s.visibilityChanges<4) sc += 5; else if(s.visibilityChanges<8) sc += 2;
    // Penalties
    if(s.maxBurstClicksPerSec>=5) sc -= 15;
    if(s.exitIntent>3 && timeOnPage<2000) sc -= 5;

    sc = Math.max(0, Math.min(100, sc));
    return { score:sc, isBot:false };
  }

  function gradeFor(sc, isBot){
    if(isBot) return 'X';
    if(sc>=90) return 'A+';
    if(sc>=80) return 'A';
    if(sc>=65) return 'B';
    if(sc>=50) return 'C';
    if(sc>=35) return 'D';
    if(sc>=15) return 'F';
    return 'F';
  }

  function send(eventType, extra){
    var payload={
      site_id: CFG.siteId, session_id: sid, event_type: eventType,
      url: location.href, referrer: ref, ad_platform: platform,
      click_id: clickId, user_agent: navigator.userAgent
    };
    if(extra) for(var k in extra) payload[k]=extra[k];
    var json=JSON.stringify(payload);
    try {
      if(navigator.sendBeacon){
        var blob=new Blob([json],{type:'application/json'});
        if(navigator.sendBeacon(CFG.endpoint, blob)) return;
      }
    } catch(e){}
    try { fetch(CFG.endpoint,{method:'POST',headers:{'content-type':'application/json'},body:json,keepalive:true,credentials:'omit'}); } catch(e){}
  }

  function flushGrade(){
    if(s.sent) return; s.sent=true;
    var t=Date.now()-s.pageLoad;
    var r=score(t);
    var g=gradeFor(r.score, r.isBot);
    send('grade',{
      grade:g, score:r.score,
      behavioral_signals:{
        scroll_depth: s.scrollMax,
        scroll_events: s.scrollEvents,
        time_on_page_ms: t,
        active_time_ms: s.activeTime,
        idle_pct: t>0 ? Math.max(0, Math.round((1 - s.activeTime/t)*100)) : 0,
        clicks: s.clicks,
        rage_clicks: s.rageClicks,
        max_click_burst: s.maxBurstClicksPerSec,
        mouse_distance_px: Math.round(s.mouseDistance),
        mouse_events: s.mouseEvents,
        keypresses: s.keypresses,
        form_interactions: s.formInteractions,
        form_fields_touched: Object.keys(s.formFieldsTouched).length,
        copy_events: s.copyEvents,
        paste_events: s.pasteEvents,
        selection_events: s.selectionEvents,
        visibility_hidden: s.visibilityHidden,
        visibility_changes: s.visibilityChanges,
        exit_intent: s.exitIntent,
        is_bot: r.isBot,
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
        screen_w: screen.width,
        screen_h: screen.height,
        timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone||''),
        language: navigator.language||''
      }
    });
  }

  // Initial pageview
  send('page_view',{});

  window.addEventListener('pagehide', flushGrade);
  window.addEventListener('beforeunload', flushGrade);
  // Some browsers (mobile Safari) only emit visibilitychange on app switch.
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='hidden') flushGrade(); });
})();
`
}
