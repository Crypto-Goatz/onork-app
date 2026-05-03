import { extractLocationId } from "../lib/url-detector";
import { setDetectedLocation } from "../lib/storage";

const HOST_RE = /\.(rocketclients\.com|leadconnectorhq\.com|gohighlevel\.com|180crm\.com)$/;

function isCrmUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

async function syncFromTab(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isCrmUrl(tab.url)) return;
    const locationId = extractLocationId(tab.url);
    if (locationId) {
      await setDetectedLocation(locationId);
    }
  } catch {
    // tab might be gone — ignore
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    void syncFromTab(tabId);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void syncFromTab(tabId);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "DETECTED_LOCATION" && typeof msg.locationId === "string") {
    void setDetectedLocation(msg.locationId).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "PING") {
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  // Sync on install / update so the popup has fresh state immediately.
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.id !== undefined) void syncFromTab(tab.id);
  });
});
