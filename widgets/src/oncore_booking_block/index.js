import { defineWidget, esc, runtimeTag, MOBILE } from '../_sdk/sdk.js'

/** W3 — Booking Block. The calendar belongs to the client, so it resolves at runtime. */
defineWidget({
  key: 'oncore_booking_block',
  defaults: { heading: 'Book a time', calendarId: '' },
  render: (s) => ({
    html: `
<div id="oncore-booking" class="oncore-w oncore-booking" data-calendar="${esc(s.calendarId)}">
  <h3 class="oncore-booking__h">${esc(s.heading)}</h3>
  <div class="oncore-booking__slot"></div>
</div>
<style>
  .oncore-booking { font:400 15px/1.5 system-ui,-apple-system,sans-serif; }
  .oncore-booking__h { font:700 17px/1.2 system-ui; margin:0 0 10px; }
  .oncore-booking__slot { min-height:120px; border:1px dashed #d8dcd9; border-radius:14px; }
  ${MOBILE} .oncore-booking__slot { min-height:96px; }
</style>
${runtimeTag('oncore_booking_block')}`.trim(),
  }),
})
