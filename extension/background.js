import { getDistractingSite } from './distraction-sites.js';

console.log('[Zoned] Service worker loaded successfully');

const ZONED_PATTERNS = [
  'http://localhost:3000/*',
  'http://localhost:3001/*',
];

let distractionTabId = null;

/** Active distraction timing for Zoned tab (level 0–4 + seconds). */
let distractionMeta = null;

// ── Session state (stored in chrome.storage.local) ───────────────────────

async function isSessionActive() {
  try {
    const result = await chrome.storage.local.get('zonedSessionActive');
    return result.zonedSessionActive === true;
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'ZONED_SESSION_START') {
    console.log('[Zoned] Session started (message from page)');
    chrome.storage.local.set({ zonedSessionActive: true });
  } else if (message.type === 'ZONED_SESSION_END') {
    console.log('[Zoned] Session ended (message from page)');
    chrome.storage.local.set({ zonedSessionActive: false });
    stopEscalation();
  }
});

// Safety net: clear session flag when all Zoned tabs close
chrome.tabs.onRemoved.addListener(async () => {
  let zonedTabs = [];
  for (const pattern of ZONED_PATTERNS) {
    try {
      const found = await chrome.tabs.query({ url: pattern });
      zonedTabs = zonedTabs.concat(found);
    } catch {}
  }
  if (zonedTabs.length === 0) {
    console.log('[Zoned] All Zoned tabs closed — clearing session flag');
    chrome.storage.local.set({ zonedSessionActive: false });
    if (distractionTabId !== null) await stopEscalation();
  }
});

// ── Notify Zoned tabs (existing behavior) ────────────────────────────────
async function notifyZonedTabs(payload) {
  let zonedTabs = [];
  for (const pattern of ZONED_PATTERNS) {
    try {
      const found = await chrome.tabs.query({ url: pattern });
      zonedTabs = zonedTabs.concat(found);
    } catch {}
  }
  for (const tab of zonedTabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, payload);
    } catch {}
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
      level: 0,
      seconds: 0,
    };
  }
  return { type: 'ZONED_TAB_INFO', isDistracting: false, url };
}

function distractionLevelFromSeconds(sec) {
  if (sec >= 30) return 4;
  if (sec >= 22) return 3;
  if (sec >= 15) return 2;
  if (sec >= 8) return 1;
  return 0;
}

function pulseDistraction() {
  if (!distractionMeta) return;
  chrome.tabs.get(distractionMeta.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.url) return;
    const site = getDistractingSite(tab.url);
    if (!site) {
      distractionMeta = null;
      chrome.alarms.clear('zoned-distraction-pulse');
      return;
    }
    const sec = Math.floor((Date.now() - distractionMeta.since) / 1000);
    const level = distractionLevelFromSeconds(sec);
    notifyZonedTabs({
      type: 'ZONED_DISTRACTION_TICK',
      name: site.name,
      category: site.category,
      seconds: sec,
      level,
    });
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'zoned-distraction-pulse') return;
  pulseDistraction();
  chrome.alarms.create('zoned-distraction-pulse', { delayInMinutes: 1 / 60 });
});

// ── Self-escalating script injected into the distraction tab ─────────────
function injectedEscalationScript(siteName) {
  if (window.__zonedEscalation) return;

  const OVERLAY_ID = 'zoned-distraction-overlay';
  const startTime = Date.now();
  let lastLevel = 0;

  function beep(freq, duration, vol) {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
      setTimeout(() => ctx.close(), (duration + 0.1) * 1000);
    } catch {}
  }

  function clearOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (el) el.remove();
    document.body.style.filter = '';
    try { speechSynthesis.cancel(); } catch {}
  }

  function makeOverlay(styles, html) {
    clearOverlay();
    const el = document.createElement('div');
    el.id = OVERLAY_ID;
    Object.assign(el.style, {
      position: 'fixed',
      left: '0', right: '0',
      zIndex: '2147483647',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'all 0.3s ease',
      pointerEvents: 'none',
      ...styles,
    });
    el.innerHTML = html;
    document.documentElement.appendChild(el);
    return el;
  }

  function applyLevel(level) {
    if (level === lastLevel && level < 4) return;
    lastLevel = level;

    if (level <= 1) {
      beep(520, 0.35, 0.25);
      makeOverlay(
        { top: '0', height: '48px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(220,38,38,0.4)' },
        `<span style="font-size:18px">🚨</span><span style="color:white;font-size:14px;font-weight:600">Zoned: Distraction detected — ${siteName}</span><span style="font-size:18px">🚨</span>`,
      );
      return;
    }

    if (level === 2) {
      beep(440, 0.2, 0.35);
      setTimeout(() => beep(520, 0.2, 0.35), 250);
      makeOverlay(
        { top: '0', height: '56px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 4px 20px rgba(220,38,38,0.5)' },
        `<span style="font-size:22px">🚨</span><span style="color:white;font-size:15px;font-weight:600;letter-spacing:0.5px">You're supposed to be focusing!</span><span style="font-size:22px">🚨</span>`,
      );
      return;
    }

    if (level === 3) {
      beep(660, 0.15, 0.5);
      setTimeout(() => beep(880, 0.15, 0.5), 180);
      setTimeout(() => beep(1100, 0.15, 0.5), 360);
      document.body.style.filter = 'grayscale(100%)';
      makeOverlay(
        { top: '0', height: '80px', background: 'linear-gradient(135deg, #dc2626, #991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 6px 30px rgba(220,38,38,0.6)' },
        `<span style="font-size:26px">⛔</span><span style="color:white;font-size:18px;font-weight:700;letter-spacing:0.5px">GET BACK TO WORK!</span><span style="font-size:26px">⛔</span>`,
      );
      try {
        const msg = new SpeechSynthesisUtterance('Hey! Get back to work!');
        msg.rate = 1.1;
        msg.volume = 1;
        speechSynthesis.speak(msg);
      } catch {}
      return;
    }

    // Level 4: full takeover
    document.body.style.filter = 'grayscale(100%) brightness(0.7)';
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    makeOverlay(
      { top: '0', bottom: '0', background: 'rgba(127, 29, 29, 0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', backdropFilter: 'blur(8px)', pointerEvents: 'auto' },
      `<div style="font-size:64px;line-height:1">⛔</div>
       <div style="color:white;font-size:28px;font-weight:800;text-transform:uppercase;letter-spacing:2px">You Are Wasting Time</div>
       <div id="zoned-shame-timer" style="color:#fca5a5;font-size:48px;font-weight:700;font-variant-numeric:tabular-nums">${elapsed}s wasted</div>
       <div style="color:#fecaca;font-size:15px;max-width:400px;text-align:center;line-height:1.5">Close this tab and get back to your task. Every second counts.</div>`,
    );
    beep(880, 0.3, 0.6);
  }

  const tickId = setInterval(() => {
    const sec = (Date.now() - startTime) / 1000;
    const level = sec < 5 ? 1 : sec < 15 ? 2 : sec < 30 ? 3 : 4;
    applyLevel(level);

    if (level === 4) {
      const timerEl = document.getElementById('zoned-shame-timer');
      if (timerEl) timerEl.textContent = Math.round(sec) + 's wasted';
    }
  }, 1000);

  let alarmLoopId = null;
  const alarmCheck = setInterval(() => {
    const sec = (Date.now() - startTime) / 1000;
    if (sec >= 30 && !alarmLoopId) {
      alarmLoopId = setInterval(() => beep(880, 0.3, 0.6), 800);
    }
  }, 1000);

  window.__zonedEscalation = {
    stop() {
      clearInterval(tickId);
      clearInterval(alarmCheck);
      if (alarmLoopId) clearInterval(alarmLoopId);
      clearOverlay();
      window.__zonedEscalation = null;
    },
  };

  applyLevel(1);
}

function injectedCleanup() {
  if (window.__zonedEscalation) {
    window.__zonedEscalation.stop();
  }
  const el = document.getElementById('zoned-distraction-overlay');
  if (el) el.remove();
  document.body.style.filter = '';
  try { speechSynthesis.cancel(); } catch {}
}

// ── Start / stop escalation ──────────────────────────────────────────────
async function startEscalation(tabId, siteName) {
  distractionTabId = tabId;

  try {
    chrome.notifications.create('zoned-distraction', {
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Zoned — Distraction Detected',
      message: `You just opened ${siteName}. Get back to your task!`,
      priority: 2,
    });
  } catch {}

  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: injectedEscalationScript,
      args: [siteName],
      world: 'MAIN',
    });
    console.log('[Zoned] Injection result:', result);
  } catch (e) {
    console.error('[Zoned] INJECTION FAILED for tab', tabId, e.message, e);
  }
}

async function stopEscalation() {
  chrome.notifications.clear('zoned-distraction');
  distractionMeta = null;
  chrome.alarms.clear('zoned-distraction-pulse');

  if (distractionTabId !== null) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: distractionTabId },
        func: injectedCleanup,
        world: 'MAIN',
      });
    } catch {}
  }
  distractionTabId = null;
}

// ── Tab event handlers ───────────────────────────────────────────────────
async function handleTabChange(tabId, url) {
  console.log('[Zoned] Tab change:', tabId, url);
  const payload = buildPayload(url);
  await notifyZonedTabs(payload);

  const hasSession = await isSessionActive();
  console.log('[Zoned] Session active?', hasSession);
  if (!hasSession) {
    distractionMeta = null;
    chrome.alarms.clear('zoned-distraction-pulse');
    if (distractionTabId !== null) await stopEscalation();
    return;
  }

  if (payload.type === 'ZONED_DISTRACTION') {
    console.log('[Zoned] Distraction detected:', payload.name);
    if (distractionTabId !== tabId) {
      await stopEscalation();
      await startEscalation(tabId, payload.name);
    }
    if (!distractionMeta || distractionMeta.tabId !== tabId) {
      distractionMeta = {
        tabId,
        name: payload.name,
        category: payload.category,
        since: Date.now(),
      };
    }
    chrome.alarms.clear('zoned-distraction-pulse');
    chrome.alarms.create('zoned-distraction-pulse', { delayInMinutes: 1 / 60 });
  } else {
    console.log('[Zoned] Safe tab');
    distractionMeta = null;
    chrome.alarms.clear('zoned-distraction-pulse');
    if (distractionTabId !== null) {
      await stopEscalation();
    }
  }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await handleTabChange(tabId, tab.url);
  } catch {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.active) return;
  await handleTabChange(tabId, tab.url);
});
