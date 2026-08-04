import { defineWidget, esc, runtimeTag, MOBILE } from '../_sdk/sdk.js'

/**
 * W10 — Conversion Bar.
 *
 * Copy is emitted inline so the builder preview shows the real bar, but the
 * runtime script can still override it — that is what makes "edit once, changes
 * on every client site" work without reopening a single page.
 */
defineWidget({
  key: 'oncore_conversion_bar',
  defaults: { message: 'Limited-time offer', ctaText: 'Claim it', ctaUrl: '#', accent: '#181D19' },
  render: (s) => ({
    html: `
<div class="oncore-w oncore-bar" style="background:${esc(s.accent)}">
  <span class="oncore-bar__msg">${esc(s.message)}</span>
  ${s.ctaUrl ? `<a class="oncore-bar__cta" href="${esc(s.ctaUrl)}">${esc(s.ctaText)}</a>` : ''}
</div>
<style>
  .oncore-bar { display:flex; gap:14px; align-items:center; justify-content:center;
    padding:12px 18px; color:#fff; font:500 15px/1.4 system-ui,-apple-system,sans-serif; }
  .oncore-bar__cta { background:#fff; color:#181D19; padding:8px 16px; border-radius:999px;
    text-decoration:none; font-weight:600; white-space:nowrap; }
  ${MOBILE} .oncore-bar { flex-direction:column; gap:10px; text-align:center; padding:14px; }
</style>
${runtimeTag('oncore_conversion_bar')}`.trim(),
  }),
})
