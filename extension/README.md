# Zoned — Distraction Detector Extension

A Chrome / Edge browser extension that detects when you switch to a distracting website during a focus session and reports it back to the Zoned session monitor in real time.

## What it does

- Monitors every tab switch in your browser
- Checks the destination URL against **80+ distracting domains** across 10 categories:
  - Social Media (YouTube, Instagram, TikTok, Reddit…)
  - Video Streaming (Netflix, Twitch, Disney+…)
  - Online Games (Poki, Friv, Roblox, Miniclip, Coolmath Games…)
  - Unblocked Games (Slope, Classroom 6x, Unblocked Games 77…)
  - Shopping (Amazon, Etsy, SHEIN, Temu…)
  - News & Aggregators (BuzzFeed, CNN, Hacker News…)
  - Music (Spotify, SoundCloud…)
  - Humor / Memes (9GAG, Imgur…)
  - Sports (ESPN, NBA…)
  - Chat & Messaging (Discord, WhatsApp Web…)
- Sends the site name and category to the Zoned session page
- The session monitor displays e.g. **"YouTube · Video Streaming"** in the distraction label and PiP window

## Install (Developer Mode — no Chrome Web Store needed)

1. Open Chrome or Edge and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository
5. The extension icon will appear in your toolbar — it is now active

## How the detection works

```
Tab switch (any tab) → background.js checks URL → distracting? → sendMessage → content.js in Zoned tab → postMessage → useTabDetection hook → session UI updates
```

The extension never stores or uploads your browsing history. All detection runs locally in the browser.

## Adding more sites

Edit `distraction-sites.js` and add entries to `DISTRACTING_SITES`:

```js
'example.com': { name: 'Example Site', category: 'Online Games' },
```

Then reload the extension in `chrome://extensions`.
