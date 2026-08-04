import Postmate from 'postmate'

/**
 * The builder-widget SDK — the half of a widget that talks to the page builder.
 *
 * HOW A BUILDER WIDGET ACTUALLY WORKS, which is not what "widget" suggests:
 * the bundle runs in an iframe INSIDE the builder at DESIGN time, and what it
 * emits — `{ html, js, elementStore }` — is what the builder bakes into the
 * published page. The iframe is not present on the live site.
 *
 * The consequence shapes every widget here: anything that must be current when
 * a VISITOR loads the page cannot be emitted as static html. It has to be a
 * script tag in the emitted html pointing back at us, so the emitted markup is
 * a shell and app.0ncore.com fills it per client at view time. That is also why
 * the runtime layer (/widgets/:key/embed.js) is not redundant — it is the other
 * half of the same widget.
 *
 * `elementStore` is the builder's persistence for this element. It arrives on
 * handshake and must be echoed back on every emit, or the agency's settings are
 * silently lost the next time the page is opened.
 *
 * AN INITIAL PREVIEW IS MANDATORY. A widget that emits nothing until configured
 * looks broken in the builder — the agency drops it on a page and sees a blank.
 * Every widget here renders a real, sensible default immediately.
 */

const API = 'https://app.0ncore.com'

export function defineWidget({ key, render, defaults = {} }) {
  let store = { ...defaults }
  let emit = null

  const build = () => {
    const { html, js } = render(store, { API, key })
    return { html, js: js || '', elementStore: store }
  }

  const handshake = new Postmate.Model({
    // The builder hands us the saved settings for THIS placement.
    setElementStore(next) {
      if (next && typeof next === 'object') store = { ...defaults, ...next }
      if (emit) emit(build())
    },
    getState() {
      return build()
    },
  })

  handshake.then((parent) => {
    emit = (payload) => parent.emit('widgetState', payload)

    // Anything the builder handed us at handshake time wins over defaults.
    if (parent.model && typeof parent.model === 'object') {
      const given = parent.model.elementStore
      if (given && typeof given === 'object') store = { ...defaults, ...given }
    }

    // The mandatory first paint.
    emit(build())

    // The settings UI lives in our own popup — the builder only exposes
    // margin, padding, visibility and custom class.
    window.addEventListener('message', (e) => {
      if (e?.data?.type === 'oncore:setStore' && e.data.store) {
        store = { ...store, ...e.data.store }
        emit(build())
      }
    })

    window.oncore = {
      key,
      get store() { return store },
      set(patch) { store = { ...store, ...patch }; emit(build()) },
      openPopup() { parent.emit('customWidgetOpenPopup', { key }) },
      nextStep() { parent.emit('customWidgetGoToNextStep', { key }) },
    }
  })

  return { build }
}

/** Escape anything that came from an agency's settings before it becomes html. */
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

/**
 * The runtime script tag the emitted html carries.
 *
 * `{{location.id}}` stays UNRESOLVED here on purpose — the builder writes it
 * into the page and the platform resolves it per client at render time. That is
 * what lets one emitted element serve every sub-account without being rebuilt.
 */
export function runtimeTag(key) {
  return `<script async src="${API}/widgets/${key}/embed.js?location={{location.id}}"></script>`
}

/** Mobile styles have to target the builder's own class, not a media query. */
export const MOBILE = '.--mobile'
