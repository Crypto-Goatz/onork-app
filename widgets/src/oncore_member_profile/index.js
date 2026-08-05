import { defineWidget, esc, runtimeTag, MOBILE } from '../_sdk/sdk.js'

/**
 * The membership portal element.
 *
 * The emitted markup is a SHELL and nothing else — no name, no email, no field
 * values. Those arrive at view time, for the signed-in member only. Baking any
 * of it into the published page would put one member's details on a page every
 * other member loads.
 */
defineWidget({
  key: 'oncore_member_profile',
  defaults: { mode: 'view', heading: '', subheading: '' },
  render: (s) => ({
    html: `
<div id="oncore-portal" class="oncore-w oncore-portal" data-mode="${esc(s.mode || 'view')}">
  <div class="oncore-portal__wait">
    <strong>${esc(s.heading || 'Your account')}</strong>
    <p>${esc(s.subheading || 'Sign in from your emailed link to see your details.')}</p>
  </div>
</div>
<style>
  .oncore-portal { font: 400 15px/1.55 system-ui, -apple-system, sans-serif; max-width: 560px; }
  .oncore-portal__wait { padding: 20px; border: 1px dashed #d8dcd9; border-radius: 14px; color: #5c6660; }
  .oncore-portal__wait p { margin: 6px 0 0; font-size: 13.5px; }
  ${MOBILE} .oncore-portal { max-width: 100%; }
</style>
${runtimeTag('oncore_member_profile')}`.trim(),
  }),
})
