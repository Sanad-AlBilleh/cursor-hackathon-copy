import { getDistractingSite } from './distraction-sites.js';

const ZONED_PATTERNS = [
  'http://localhost:3000/*',
  'http://localhost:3001/*',
];

async function notifyZonedTabs(payload) {
  let zonedTabs = [];
  for (const pattern of ZONED_PATTERNS) {
    try {
      const found = await chrome.tabs.query({ url: pattern });
      zonedTabs = zonedTabs.concat(found);
    } catch {
      // Pattern may not match any tabs
    }
  }

  for (const tab of zonedTabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, payload);
    } catch {
      // Content script not ready — ignore
    }
  }
}

function buildPayload(url) {
  const site = getDistractingSite(url);
  if (site) {
    return {
      type: 'ZONED_DISTRACTION',
      name: site.name,
      category: site.category,
      url,
    };
  }
  return {
    type: 'ZONED_TAB_INFO',
    isDistracting: false,
    url,
  };
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await notifyZonedTabs(buildPayload(tab.url));
  } catch {
    // Tab may have been closed
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.active) return;
  await notifyZonedTabs(buildPayload(tab.url));
});
