import { defineWidget, esc, runtimeTag, MOBILE } from '../_sdk/sdk.js'

/**
 * W9 — Social Proof.
 *
 * Deliberately emits NO example activity. A placeholder testimonial baked into
 * a published page is a fabricated review on a real business's website — the
 * shell stays empty until the runtime has this client's own data.
 */
defineWidget({
  key: 'oncore_social_proof',
  defaults: { heading: 'Recently', limit: '5' },
  render: (s) => ({
    html: `
<div id="oncore-proof" class="oncore-w oncore-proof" data-limit="${esc(s.limit)}">
  <h3 class="oncore-proof__h">${esc(s.heading)}</h3>
  <div class="oncore-proof__list"></div>
</div>
<style>
  .oncore-proof { font:400 15px/1.5 system-ui,-apple-system,sans-serif; }
  .oncore-proof__h { font:700 17px/1.2 system-ui; margin:0 0 10px; }
  .oncore-proof__list:empty { display:none; }
  ${MOBILE} .oncore-proof { font-size:14px; }
</style>
${runtimeTag('oncore_social_proof')}`.trim(),
  }),
})
