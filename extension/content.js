/**
 * Content script — injected into the Zoned session page.
 * Bridges messages bidirectionally:
 *   background → page (distraction alerts)
 *   page → background (session lifecycle)
 */

// Background → React app
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'ZONED_DISTRACTION' && message.type !== 'ZONED_TAB_INFO') return;
  window.postMessage(message, window.location.origin);
});

// React app → Background (session start/end)
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const { type } = event.data ?? {};
  if (type === 'ZONED_SESSION_START' || type === 'ZONED_SESSION_END') {
    chrome.runtime.sendMessage(event.data);
  }
});
