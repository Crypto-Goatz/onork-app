/**
 * GET /api/cro9/script/<siteSlug>.js
 *
 * Generates the per-site CRO9 tracking script. Mirrors the D&R script
 * pattern: domain-locked at the server (the script's hardcoded
 * SITE_DOMAIN check noops if pasted on the wrong domain), reads its
 * config from cro9_embed_sites, and posts events to /api/cro9/events.
 *
 * Cache: 5 min so updates to enabled_signals / sample_rate propagate
 * within minutes without rebuilding the page.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 300

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const SCRIPT_TEMPLATE = (cfg: {
  siteSlug: string
  domain: string
  signals: string[]
  sampleRate: number
  endpoint: string
}) => `/* CRO9 v1 — ${cfg.siteSlug} */
(function(){
  if (typeof window === 'undefined') return;
  var SITE = ${JSON.stringify(cfg.siteSlug)};
  var DOMAIN = ${JSON.stringify(cfg.domain)};
  var SIGNALS = ${JSON.stringify(cfg.signals)};
  var SAMPLE = ${cfg.sampleRate};
  var ENDPOINT = ${JSON.stringify(cfg.endpoint)};

  // Domain-lock — pasted on the wrong site = no-op
  var host = (location.hostname || '').replace(/^www\\./, '').toLowerCase();
  var expected = (DOMAIN || '').replace(/^www\\./, '').toLowerCase();
  if (expected && host && host !== expected && !host.endsWith('.' + expected)) return;

  // Sample
  if (Math.random() > SAMPLE) return;

  var session = (function(){
    try {
      var key = 'cro9_session';
      var sid = sessionStorage.getItem(key);
      if (!sid) {
        sid = 's_' + Math.random().toString(36).slice(2, 12) + '_' + Date.now().toString(36);
        sessionStorage.setItem(key, sid);
      }
      return sid;
    } catch (e) { return 's_anon_' + Date.now(); }
  })();

  function send(payload) {
    try {
      payload.site_slug = SITE;
      payload.session_id = session;
      payload.url = location.href;
      payload.path = location.pathname;
      payload.referrer = document.referrer || null;
      // Attribution
      var p = new URLSearchParams(location.search);
      payload.utm_source = p.get('utm_source') || undefined;
      payload.utm_medium = p.get('utm_medium') || undefined;
      payload.utm_campaign = p.get('utm_campaign') || undefined;
      var blob = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([blob], { type: 'application/json' }));
      } else {
        fetch(ENDPOINT, { method: 'POST', body: blob, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function(){});
      }
    } catch(e) {}
  }

  // ── pageview ────────────────────────────────────────────────────
  if (SIGNALS.indexOf('pageview') >= 0) {
    send({ event_type: 'pageview' });
  }

  // ── scroll depth ────────────────────────────────────────────────
  if (SIGNALS.indexOf('scroll') >= 0) {
    var maxScroll = 0;
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function(){
        var d = document.documentElement;
        var pct = Math.round((window.scrollY + window.innerHeight) / d.scrollHeight * 100);
        if (pct > maxScroll) maxScroll = pct;
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    // Send final scroll on unload
    window.addEventListener('pagehide', function(){
      if (maxScroll > 0) send({ event_type: 'scroll', scroll_pct: Math.min(100, maxScroll) });
    });
  }

  // ── time on page ────────────────────────────────────────────────
  var startTime = Date.now();
  window.addEventListener('pagehide', function(){
    var duration = Date.now() - startTime;
    if (duration > 1000) send({ event_type: 'time_on_page', duration_ms: duration });
  });

  // ── clicks (delegated, with selector capture) ───────────────────
  if (SIGNALS.indexOf('click') >= 0) {
    document.addEventListener('click', function(e){
      var el = e.target;
      if (!el || !el.closest) return;
      var clickable = el.closest('a, button, [role="button"], [data-cro9-track]');
      if (!clickable) return;
      var label = clickable.getAttribute('data-cro9-label')
        || clickable.getAttribute('aria-label')
        || (clickable.textContent || '').trim().slice(0, 80)
        || clickable.tagName.toLowerCase();
      send({
        event_type: 'click',
        metadata: {
          label: label,
          tag: clickable.tagName.toLowerCase(),
          href: clickable.href || null,
        },
      });
    }, { capture: true, passive: true });
  }

  // ── conversion (call window.cro9('conversion', { value, ... }) from your code) ─
  if (!window.cro9) {
    window.cro9 = function(eventType, data) {
      data = data || {};
      send({ event_type: eventType, metadata: data });
    };
  }

  // ── exit intent ────────────────────────────────────────────────
  if (SIGNALS.indexOf('exit') >= 0) {
    var exitFired = false;
    document.addEventListener('mouseout', function(e){
      if (exitFired) return;
      if (e.clientY <= 0) {
        exitFired = true;
        send({ event_type: 'exit_intent' });
      }
    });
  }
})();
`

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const { siteSlug } = await params
  const slug = siteSlug.replace(/\.js$/, '').replace(/[^a-z0-9_-]/gi, '_')

  const sb = admin()
  const { data: site } = await sb
    .from('cro9_embed_sites')
    .select('*')
    .eq('site_slug', slug)
    .maybeSingle()

  if (!site) {
    return new Response(`/* cro9: unknown site '${slug}' */`, {
      status: 200, // 200 not 404 so customers don't see console errors during setup
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
    })
  }
  if (site.status !== 'active') {
    return new Response(`/* cro9: site '${slug}' is ${site.status} */`, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
    })
  }

  const config = (site.config as Record<string, unknown>) || {}
  const signals = (config.enabled_signals as string[]) || [
    'pageview',
    'scroll',
    'click',
    'conversion',
    'exit',
  ]
  const sampleRate = (config.sample_rate as number) ?? 1.0

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.0ncore.com'
  const script = SCRIPT_TEMPLATE({
    siteSlug: slug,
    domain: site.domain,
    signals,
    sampleRate,
    endpoint: `${baseUrl}/api/cro9/events`,
  })

  return new Response(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
