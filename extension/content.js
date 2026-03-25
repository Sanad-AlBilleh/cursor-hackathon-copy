/**
 * Content script — injected into the Zoned session page.
 * Bridges messages from the extension background → the React app via postMessage.
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'ZONED_DISTRACTION' && message.type !== 'ZONED_TAB_INFO') return;
  window.postMessage(message, window.location.origin);
});
