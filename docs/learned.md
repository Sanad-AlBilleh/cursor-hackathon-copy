# What we learned

**Purpose:** Short, concrete entries so we do not repeat the same mistakes. Format: **symptom → cause → fix → rule for next time.**

_Add entries after non-obvious bugs or integration wins._

## Entries

_(Example:)_  
- **Symptom:** API returned 401 on demo. **Cause:** token in `.env.local` not loaded in production build. **Fix:** documented `VITE_*` prefix / build-time env. **Rule:** verify env in the same mode you demo (dev vs prod build).
- **Symptom:** Tab-switch detection only fires when leaving/returning to Zoned tab, not between other tabs. **Cause:** Browser security — Page Visibility API (`visibilitychange`) only reports changes for the *current* document; it cannot observe switches between other tabs. **Fix:** Added `window.blur`/`focus` for marginal improvement + implemented Document Picture-in-Picture so the session monitor floats on top while the user works in other tabs. **Rule:** Web pages cannot observe other-tab activity; for cross-tab monitoring, use PiP/popup to keep the monitor visible, or build a browser extension.
- **Symptom:** User marked "distracted" whenever they leave the Zoned tab, even for productive work (Gmail, Google Docs, PowerPoint). **Cause:** `isTabAway` was used as the distraction flag — any tab switch = distracted. **Fix:** Built a Chrome extension (MV3) that checks the destination tab's URL against 80+ distracting domains. Introduced `isDistractedByTab` (only true for distracting sites) vs `isTabAway` (true for any tab switch). Session page uses `isDistractedByTab` for the distraction indicator. Without the extension, tab-away is NOT counted as distraction (benefit of the doubt). **Rule:** Separate "away from our tab" from "on a distracting site" — they are fundamentally different signals.
- **Symptom:** Extension `importScripts('distraction-sites.js')` failed in MV3 service worker. **Cause:** MV3 service workers are more restrictive with `importScripts`. **Fix:** Switched to ES modules — added `"type": "module"` in manifest.json, used `export`/`import` syntax. **Rule:** Always use ES modules (`type: "module"`) for MV3 service workers; `importScripts` is legacy and fragile.
