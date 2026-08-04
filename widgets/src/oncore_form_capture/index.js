import { defineWidget, esc, runtimeTag, MOBILE } from '../_sdk/sdk.js'

/**
 * W4 — Form Capture.
 *
 * The emitted html is a SHELL, not the form. The real form is drawn at view
 * time by the runtime script, because the fields, the tag applied to new leads
 * and the destination all depend on which client's page this is — none of which
 * is knowable when the agency drops the element onto a template.
 */
defineWidget({
  key: 'oncore_form_capture',
  defaults: { heading: 'Get in touch', button: 'Send', tag: 'website-lead' },
  render: (s) => ({
    html: `
<div id="oncore-form" class="oncore-w oncore-form">
  <div class="oncore-form__fallback">
    <strong>${esc(s.heading)}</strong>
    <p>Loading form…</p>
  </div>
</div>
<style>
  .oncore-form { font: 400 15px/1.5 system-ui, -apple-system, sans-serif; max-width: 460px; }
  .oncore-form__fallback { padding: 18px; border: 1px dashed #d8dcd9; border-radius: 14px; color: #5c6660; }
  ${MOBILE} .oncore-form { max-width: 100%; }
</style>
${runtimeTag('oncore_form_capture')}`.trim(),
  }),
})
