import { extractLocationId } from "../lib/url-detector";

let lastReported: string | null = null;

function report() {
  const id = extractLocationId(window.location.href);
  if (!id || id === lastReported) return;
  lastReported = id;
  chrome.runtime
    .sendMessage({ type: "DETECTED_LOCATION", locationId: id })
    .catch(() => {});
}

report();

const obs = new MutationObserver(() => report());
obs.observe(document.documentElement, { subtree: true, childList: true });

// CRM is an SPA — also listen for history changes.
const origPush = history.pushState;
history.pushState = function (...args: Parameters<typeof history.pushState>) {
  origPush.apply(this, args);
  report();
};
const origReplace = history.replaceState;
history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
  origReplace.apply(this, args);
  report();
};
window.addEventListener("popstate", report);
