/**
 * Comprehensive list of distracting domains.
 * Maps hostname → { name, category }
 * Researched from DeskTime, HeyFocus, WorkTime, and popular productivity blocklists.
 */
export const DISTRACTING_SITES = {
  // ── Social Media ──────────────────────────────────────────────────────────
  'facebook.com':    { name: 'Facebook',       category: 'Social Media' },
  'instagram.com':   { name: 'Instagram',      category: 'Social Media' },
  'twitter.com':     { name: 'Twitter / X',    category: 'Social Media' },
  'x.com':           { name: 'X (Twitter)',    category: 'Social Media' },
  'tiktok.com':      { name: 'TikTok',         category: 'Social Media' },
  'pinterest.com':   { name: 'Pinterest',      category: 'Social Media' },
  'tumblr.com':      { name: 'Tumblr',         category: 'Social Media' },
  'snapchat.com':    { name: 'Snapchat',       category: 'Social Media' },
  'threads.net':     { name: 'Threads',        category: 'Social Media' },
  'reddit.com':      { name: 'Reddit',         category: 'Social Media' },
  'ask.fm':          { name: 'Ask.fm',         category: 'Social Media' },
  'bereal.com':      { name: 'BeReal',         category: 'Social Media' },
  'mastodon.social': { name: 'Mastodon',       category: 'Social Media' },
  'linkedin.com':    { name: 'LinkedIn',       category: 'Social Media' },
  'flickr.com':      { name: 'Flickr',         category: 'Social Media' },
  'vk.com':          { name: 'VK',             category: 'Social Media' },

  // ── Video Streaming ───────────────────────────────────────────────────────
  'youtube.com':        { name: 'YouTube',         category: 'Video Streaming' },
  'netflix.com':        { name: 'Netflix',          category: 'Video Streaming' },
  'hulu.com':           { name: 'Hulu',             category: 'Video Streaming' },
  'twitch.tv':          { name: 'Twitch',           category: 'Video Streaming' },
  'disneyplus.com':     { name: 'Disney+',          category: 'Video Streaming' },
  'primevideo.com':     { name: 'Prime Video',      category: 'Video Streaming' },
  'max.com':            { name: 'Max (HBO)',         category: 'Video Streaming' },
  'hbomax.com':         { name: 'HBO Max',          category: 'Video Streaming' },
  'vimeo.com':          { name: 'Vimeo',            category: 'Video Streaming' },
  'dailymotion.com':    { name: 'Dailymotion',      category: 'Video Streaming' },
  'crunchyroll.com':    { name: 'Crunchyroll',      category: 'Video Streaming' },
  'peacocktv.com':      { name: 'Peacock',          category: 'Video Streaming' },
  'paramountplus.com':  { name: 'Paramount+',       category: 'Video Streaming' },
  'ted.com':            { name: 'TED',              category: 'Video Streaming' },
  'curiositystream.com':{ name: 'CuriosityStream',  category: 'Video Streaming' },
  'funimation.com':     { name: 'Funimation',       category: 'Video Streaming' },

  // ── Online Games ──────────────────────────────────────────────────────────
  'poki.com':              { name: 'Poki',             category: 'Online Games' },
  'friv.com':              { name: 'Friv',             category: 'Online Games' },
  'miniclip.com':          { name: 'Miniclip',         category: 'Online Games' },
  'kongregate.com':        { name: 'Kongregate',       category: 'Online Games' },
  'y8.com':                { name: 'Y8 Games',         category: 'Online Games' },
  'coolmathgames.com':     { name: 'Cool Math Games',  category: 'Online Games' },
  'coolmathplay.com':      { name: 'Cool Math Play',   category: 'Online Games' },
  'itch.io':               { name: 'itch.io',          category: 'Online Games' },
  'newgrounds.com':        { name: 'Newgrounds',       category: 'Online Games' },
  'roblox.com':            { name: 'Roblox',           category: 'Online Games' },
  'armorgames.com':        { name: 'Armor Games',      category: 'Online Games' },
  'addictinggames.com':    { name: 'Addicting Games',  category: 'Online Games' },
  'gamesgames.com':        { name: 'GamesGames',       category: 'Online Games' },
  'agame.com':             { name: 'Agame',            category: 'Online Games' },
  'chess.com':             { name: 'Chess.com',        category: 'Online Games' },
  'slither.io':            { name: 'Slither.io',       category: 'Online Games' },
  'agar.io':               { name: 'Agar.io',          category: 'Online Games' },
  'krunker.io':            { name: 'Krunker.io',       category: 'Online Games' },
  '1v1.lol':               { name: '1v1.LOL',          category: 'Online Games' },
  'sploop.io':             { name: 'Sploop.io',        category: 'Online Games' },
  'stabfish.io':           { name: 'Stabfish.io',      category: 'Online Games' },
  'orteil.dashnet.org':    { name: 'Cookie Clicker',   category: 'Online Games' },
  'wordleunlimited.org':   { name: 'Wordle Unlimited', category: 'Online Games' },
  'sudoku.com':            { name: 'Sudoku.com',       category: 'Online Games' },
  'crazygames.com':        { name: 'Crazy Games',      category: 'Online Games' },
  'gamaverse.com':         { name: 'Gamaverse',        category: 'Online Games' },
  'kbh.games':             { name: 'KBH Games',        category: 'Online Games' },
  'twoplayergames.org':    { name: 'Two Player Games',  category: 'Online Games' },
  'silvergames.com':       { name: 'Silver Games',     category: 'Online Games' },

  // ── Unblocked Games (school evasion sites) ────────────────────────────────
  'unblockedgames77.net':    { name: 'Unblocked Games 77',  category: 'Unblocked Games' },
  'classroomsgames.com':     { name: 'Classroom 6x',        category: 'Unblocked Games' },
  'classroom6x.com':         { name: 'Classroom 6x',        category: 'Unblocked Games' },
  'googleclassroom6x.com':   { name: 'Google Classroom 6x', category: 'Unblocked Games' },
  'unblockdgames76.com':     { name: 'Unblocked Games 76',  category: 'Unblocked Games' },
  'unblockedgames.wtf':      { name: 'Unblocked Games WTF', category: 'Unblocked Games' },
  'slope.io':                { name: 'Slope',               category: 'Unblocked Games' },
  'hoodamath.com':           { name: 'Hooda Math',          category: 'Unblocked Games' },
  'tyrone.games':            { name: 'Tyrone\'s Unblocked', category: 'Unblocked Games' },

  // ── Shopping ──────────────────────────────────────────────────────────────
  'amazon.com':     { name: 'Amazon',      category: 'Shopping' },
  'ebay.com':       { name: 'eBay',        category: 'Shopping' },
  'etsy.com':       { name: 'Etsy',        category: 'Shopping' },
  'craigslist.org': { name: 'Craigslist',  category: 'Shopping' },
  'aliexpress.com': { name: 'AliExpress',  category: 'Shopping' },
  'shein.com':      { name: 'SHEIN',       category: 'Shopping' },
  'wish.com':       { name: 'Wish',        category: 'Shopping' },
  'wayfair.com':    { name: 'Wayfair',     category: 'Shopping' },
  'asos.com':       { name: 'ASOS',        category: 'Shopping' },
  'temu.com':       { name: 'Temu',        category: 'Shopping' },
  'shopify.com':    { name: 'Shopify',     category: 'Shopping' },
  'walmart.com':    { name: 'Walmart',     category: 'Shopping' },

  // ── News & Aggregators ────────────────────────────────────────────────────
  'buzzfeed.com':       { name: 'BuzzFeed',        category: 'News' },
  'cnn.com':            { name: 'CNN',              category: 'News' },
  'foxnews.com':        { name: 'Fox News',         category: 'News' },
  'bbc.com':            { name: 'BBC',              category: 'News' },
  'nytimes.com':        { name: 'NY Times',         category: 'News' },
  'dailymail.co.uk':    { name: 'Daily Mail',       category: 'News' },
  'tmz.com':            { name: 'TMZ',              category: 'News' },
  'theonion.com':       { name: 'The Onion',        category: 'News' },
  'huffpost.com':       { name: 'HuffPost',         category: 'News' },
  'msn.com':            { name: 'MSN',              category: 'News' },
  'news.google.com':    { name: 'Google News',      category: 'News' },
  'quora.com':          { name: 'Quora',            category: 'News' },
  'medium.com':         { name: 'Medium',           category: 'News' },
  'producthunt.com':    { name: 'Product Hunt',     category: 'News' },
  'news.ycombinator.com': { name: 'Hacker News',   category: 'News' },
  'vice.com':           { name: 'VICE',             category: 'News' },
  'theverge.com':       { name: 'The Verge',        category: 'News' },

  // ── Music ─────────────────────────────────────────────────────────────────
  'spotify.com':        { name: 'Spotify',       category: 'Music' },
  'soundcloud.com':     { name: 'SoundCloud',    category: 'Music' },
  'pandora.com':        { name: 'Pandora',       category: 'Music' },
  'music.apple.com':    { name: 'Apple Music',   category: 'Music' },
  'deezer.com':         { name: 'Deezer',        category: 'Music' },
  'tidal.com':          { name: 'Tidal',         category: 'Music' },

  // ── Humor / Memes ─────────────────────────────────────────────────────────
  '9gag.com':           { name: '9GAG',           category: 'Humor / Memes' },
  'imgur.com':          { name: 'Imgur',          category: 'Humor / Memes' },
  'knowyourmeme.com':   { name: 'Know Your Meme', category: 'Humor / Memes' },
  'giphy.com':          { name: 'GIPHY',          category: 'Humor / Memes' },
  'ifunny.co':          { name: 'iFunny',         category: 'Humor / Memes' },
  'collegehumor.com':   { name: 'CollegeHumor',  category: 'Humor / Memes' },

  // ── Sports ────────────────────────────────────────────────────────────────
  'espn.com':           { name: 'ESPN',            category: 'Sports' },
  'bleacherreport.com': { name: 'Bleacher Report', category: 'Sports' },
  'cbssports.com':      { name: 'CBS Sports',      category: 'Sports' },
  'mlb.com':            { name: 'MLB',             category: 'Sports' },
  'nfl.com':            { name: 'NFL',             category: 'Sports' },
  'nba.com':            { name: 'NBA',             category: 'Sports' },
  'nhl.com':            { name: 'NHL',             category: 'Sports' },
  'sofascore.com':      { name: 'SofaScore',       category: 'Sports' },

  // ── Chat & Messaging ──────────────────────────────────────────────────────
  'discord.com':        { name: 'Discord',    category: 'Chat' },
  'web.whatsapp.com':   { name: 'WhatsApp',   category: 'Chat' },
  'telegram.org':       { name: 'Telegram',   category: 'Chat' },
  'slack.com':          { name: 'Slack',      category: 'Chat' },
  'web.telegram.org':   { name: 'Telegram',   category: 'Chat' },
};

/**
 * Returns { name, category } if the given URL matches a distracting domain,
 * or null if it is not distracting.
 */
export function getDistractingSite(url) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (DISTRACTING_SITES[hostname]) return DISTRACTING_SITES[hostname];
    // subdomain fallback: check parent domain (e.g. "music.apple.com")
    const parts = hostname.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.');
      if (DISTRACTING_SITES[parent]) return DISTRACTING_SITES[parent];
    }
    return null;
  } catch {
    return null;
  }
}
