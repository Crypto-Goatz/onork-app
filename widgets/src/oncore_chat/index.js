import { defineWidget, esc, runtimeTag, MOBILE } from '../_sdk/sdk.js'

/**
 * W7 — Chat bubble, answered by the client's own agent.
 *
 * Emits only the loader. The bubble itself is built at view time, because the
 * agent it talks to belongs to whichever client's page this is — which is not
 * knowable when the agency drops the element onto a template.
 */
defineWidget({
  key: 'oncore_chat',
  defaults: { greeting: 'Hi — how can we help?', accent: '#2E9A1F' },
  render: (s) => ({
    html: `
<div class="oncore-w oncore-chat" data-accent="${esc(s.accent)}" aria-hidden="true"></div>
<style>
  /* The bubble is fixed-position and drawn at runtime; nothing to lay out here. */
  .oncore-chat { display: none; }
  ${MOBILE} .oncore-chat { display: none; }
</style>
${runtimeTag('oncore_chat')}`.trim(),
  }),
})
