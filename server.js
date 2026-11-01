/**
 * ARSA Web — Express server for listen.aryavl.com
 * Hosted on Render (Node.js Web Service)
 * Handles: dynamic OG share pages, Android App Links, static files
 *
 * Arsa Project (C) 2026 — Licensed under GPL-3.0
 */

'use strict';

const express = require('express');
const path    = require('path');
const https   = require('https');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Config ────────────────────────────────────────────────────────────────

const ANDROID_PACKAGE_NAME = 'com.arsa.aryavl';
const APP_NAME             = 'A.R.S.A';
const DOMAIN               = 'listen.aryavl.com';
const DOWNLOAD_URL         = 'https://download.app.aryavl.com';
const BANNER_IMAGE         = `https://${DOMAIN}/assets/og-preview.jpg`;

const ASSET_LINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: ANDROID_PACKAGE_NAME,
      sha256_cert_fingerprints: [
        'B8:4C:E6:E5:8E:9F:8B:2A:4D:1C:3E:5F:7A:9B:0C:2D:4E:6F:8A:1B:3C:5D:7E:9F:0A:2B:4C:6D:8E:0F'
      ]
    }
  }
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

/** Tiny fetch wrapper over Node's built-in https (no extra deps). */
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = Object.assign({ headers: { 'User-Agent': 'ARSAResolver/2.0', ...headers } }, require('url').parse(url));
    https.get(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 400, json: () => JSON.parse(data) }); }
        catch (e) { resolve({ ok: false }); }
      });
    }).on('error', reject);
  });
}

/** Parse videoId / playlistId / artistId from a URL pathname + searchParams. */
function extractIds(pathname, searchParams) {
  let videoId    = searchParams.get ? searchParams.get('v')    : searchParams.v;
  let playlistId = searchParams.get ? searchParams.get('list') : searchParams.list;
  let artistId   = null;

  if (!videoId) {
    const vm = pathname.match(/^\/(?:watch|song|v|)\/([a-zA-Z0-9_-]{11})(?:\/|$|\?)/);
    if (vm) videoId = vm[1];
    else {
      const bare = pathname.match(/^\/([a-zA-Z0-9_-]{11})$/);
      if (bare) videoId = bare[1];
    }
  }
  if (!playlistId) {
    const pm = pathname.match(/^\/playlist\/([a-zA-Z0-9_-]+)/);
    if (pm) playlistId = pm[1];
  }
  const am = pathname.match(/^\/(?:channel|artist)\/([a-zA-Z0-9_-]+)/);
  if (am) artistId = am[1];

  return { videoId, playlistId, artistId };
}

// ─── Share-page HTML builder ────────────────────────────────────────────────

async function buildShareHtml(reqUrl, { videoId, playlistId, artistId }) {
  const url         = new URL(reqUrl, `https://${DOMAIN}`);
  const hintTitle   = url.searchParams.get('title');
  const hintThumb   = url.searchParams.get('thumb');
  const hintAuthor  = url.searchParams.get('author');

  let title       = hintTitle  || 'Shared Track';
  let artist      = hintAuthor || APP_NAME;
  let description = `Stream ad-free on ${APP_NAME} with synchronized lyrics. Powered by ARYAVL.COM`;
  let image       = hintThumb  || BANNER_IMAGE;
  let deepLink    = `intent://music.youtube.com${url.pathname}${url.search}#Intent;scheme=https;package=${ANDROID_PACKAGE_NAME};component=${ANDROID_PACKAGE_NAME}.WelcomeActivity;end`;

  if (videoId) {
    deepLink = `intent://music.youtube.com/watch?v=${videoId}#Intent;scheme=https;package=${ANDROID_PACKAGE_NAME};component=${ANDROID_PACKAGE_NAME}.WelcomeActivity;end`;
    if (!hintThumb) image = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

    if (!hintTitle) {
      try {
        const oembed = await fetchJson(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oembed.ok) {
          const data = oembed.json();
          title  = data.title       || `Track (${videoId})`;
          if (!hintAuthor) artist = data.author_name || APP_NAME;
          description = `${artist} • Listen ad-free on ${APP_NAME}. Powered by ARYAVL.COM`;

          if (!hintThumb) {
            try {
              const q = encodeURIComponent(`${title} ${artist}`);
              const deezer = await fetchJson(`https://api.deezer.com/search?q=${q}&limit=3`);
              if (deezer.ok) {
                const cover = deezer.json()?.data?.[0]?.album?.cover_xl;
                if (cover) image = cover;
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

  } else if (playlistId) {
    deepLink    = `intent://music.youtube.com/playlist?list=${playlistId}#Intent;scheme=https;package=${ANDROID_PACKAGE_NAME};component=${ANDROID_PACKAGE_NAME}.WelcomeActivity;end`;
    if (!hintTitle)  title  = 'Shared Playlist';
    if (!hintAuthor) artist = APP_NAME;
    if (!hintThumb)  image  = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85';
    description = `A playlist shared via ${APP_NAME}. Powered by ARYAVL.COM`;

  } else if (artistId) {
    deepLink    = `intent://music.youtube.com/channel/${artistId}#Intent;scheme=https;package=${ANDROID_PACKAGE_NAME};component=${ANDROID_PACKAGE_NAME}.WelcomeActivity;end`;
    if (!hintTitle)  title  = 'Artist Channel';
    if (!hintAuthor) artist = APP_NAME;
    if (!hintThumb)  image  = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=85';
    description = `An artist shared via ${APP_NAME}. Powered by ARYAVL.COM`;
  }

  const e = escapeHtml;
  const pageUrl = `https://${DOMAIN}${url.pathname}${url.search}`;

  // Inject resolved metadata into the static page template
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title id="meta-title">${e(title)} — ${APP_NAME}</title>
  <meta name="description" id="meta-desc" content="${e(description)}">

  <meta property="og:type" content="music.song">
  <meta property="og:site_name" content="${APP_NAME}">
  <meta property="og:title" id="og-title" content="${e(title)}">
  <meta property="og:description" id="og-desc" content="${e(description)}">
  <meta property="og:image" id="og-image" content="${e(image)}">
  <meta property="og:image:secure_url" content="${e(image)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" id="og-url" content="${e(pageUrl)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" id="tw-title" content="${e(title)}">
  <meta name="twitter:description" id="tw-desc" content="${e(description)}">
  <meta name="twitter:image" id="tw-image" content="${e(image)}">

  <meta name="theme-color" content="#040508">
  <link rel="icon" href="https://app.aryavl.com/assets/assets/images/arsa-logo.6b8664469176a1cbc68b69165e007f8d.png">
  <!-- Preload data for client-side JS (avoids extra oEmbed call on load) -->
  <script>
    window.__ARSA_SHARE__ = {
      videoId:    ${videoId    ? `"${e(videoId)}"`    : 'null'},
      playlistId: ${playlistId ? `"${e(playlistId)}"` : 'null'},
      artistId:   ${artistId   ? `"${e(artistId)}"`   : 'null'},
      title:   "${e(title)}",
      artist:  "${e(artist)}",
      image:   "${e(image)}",
      deepLink:"${e(deepLink)}"
    };
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/share.css">
</head>
<body>
  <svg class="liquid-filters" aria-hidden="true">
    <defs>
      <filter id="liquid-glass-lens" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.014 0.018" numOctaves="2" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2.5" result="smoothNoise" />
        <feDisplacementMap in="SourceGraphic" in2="smoothNoise" scale="10" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
  <div class="ambient-stage" aria-hidden="true">
    <div id="bleed-primary" class="artwork-bleed-layer" style="background-image: url('${e(image)}')"></div>
    <div id="bleed-secondary" class="artwork-bleed-layer layer-secondary" style="background-image: url('${e(image)}')"></div>
    <div id="aura-1" class="aura-orb aura-1"></div>
    <div id="aura-2" class="aura-orb aura-2"></div>
    <div id="aura-3" class="aura-orb aura-3"></div>
    <div class="ambient-vignette"></div>
  </div>
  <div class="progressive-blur-edge edge-top" aria-hidden="true">
    <div class="p-blur-step step-1"></div>
    <div class="p-blur-step step-2"></div>
    <div class="p-blur-step step-3"></div>
    <div class="p-blur-step step-4"></div>
  </div>
  <div class="progressive-blur-edge edge-bottom" aria-hidden="true">
    <div class="p-blur-step step-1"></div>
    <div class="p-blur-step step-2"></div>
    <div class="p-blur-step step-3"></div>
    <div class="p-blur-step step-4"></div>
  </div>
  <main class="viewport">
    <header class="top-header">
      <a class="liquid-pill brand-pill" href="${e(DOWNLOAD_URL)}" target="_blank" rel="noopener">
        <div class="dot"></div>
        <span>A.R.S.A</span>
      </a>
      <span id="badge-pill" class="badge-pill">${artistId ? 'ARTIST' : (playlistId ? 'PLAYLIST' : 'TRACK')}</span>
    </header>
    <section class="main-card-wrapper">
      <div class="glass-card" id="song-card">
        <div class="card-progressive-shelf" aria-hidden="true"></div>
        <div class="artwork-stage">
          <div id="artwork-shadow" class="artwork-ambient-shadow" style="background-image: url('${e(image)}')" aria-hidden="true"></div>
          <div id="vinyl-record" class="vinyl-record" aria-hidden="true">
            <div class="vinyl-grooves"></div>
            <div id="vinyl-label" class="vinyl-label" style="background-image: url('${e(image)}')">
              <div class="vinyl-hole"></div>
            </div>
          </div>
          <div class="album-sleeve">
            <img id="cover-art" class="sleeve-cover" src="${e(image)}" alt="${e(title)}" crossorigin="anonymous">
            <div class="sleeve-sheen"></div>
            <div class="sleeve-progressive-footer">
              <span class="sleeve-audio-tag">
                <span class="eq-bars" aria-hidden="true">
                  <span></span><span></span><span></span><span></span>
                </span>
                <span>Lossless Spatial</span>
              </span>
            </div>
          </div>
          <button id="btn-play-toggle" class="btn-play-toggle" type="button" aria-label="Play Preview">
            <svg id="play-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
        <div class="song-info">
          <h1 class="song-title-display" id="song-name">${e(title)}</h1>
          <p class="song-artist-display" id="song-artist">${e(artist)}</p>
          <div class="chips-row">
            <span class="info-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 12h4l3-9 4 18 3-9h6"/></svg>
              Lossless 24-bit
            </span>
            <span class="info-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
              Liquid Glass Audio
            </span>
            <span id="chip-type" class="info-chip">${artistId ? 'ARTIST' : (playlistId ? 'PLAYLIST' : 'TRACK')}</span>
          </div>
        </div>
        <div id="player-controls" class="player-controls">
          <input id="audio-scrubber" class="scrubber-slider" type="range" min="0" max="100" value="0" step="0.1" aria-label="Audio scrubber">
          <div class="time-row">
            <span id="time-current">0:00</span>
            <span id="preview-status" class="preview-status-label">Tap Play to Preview</span>
            <span id="time-remaining">-:--</span>
          </div>
        </div>
        <div class="actions-list">
          <a href="${e(deepLink)}" class="btn-cta-primary" id="btn-open-arsa">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            <span>Open in A.R.S.A</span>
          </a>
          <div class="secondary-grid">
            <button id="btn-share" class="btn-action-secondary" type="button" aria-label="Share">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              <span>Share</span>
            </button>
            <button id="btn-copy" class="btn-action-secondary" type="button" aria-label="Copy Link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy Link</span>
            </button>
            <a href="${e(DOWNLOAD_URL)}" class="btn-action-secondary" target="_blank" rel="noopener">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Get App</span>
            </a>
          </div>
        </div>
      </div>
    </section>
    <footer class="site-footer">
      <p>A.R.S.A Music &bull; Pure Liquid Glass &bull; Ad-Free Lossless &bull; ARYAVL.COM</p>
    </footer>
  </main>
  <div id="yt-frame-container"></div>
  <div id="toast" class="toast-pill" role="status" aria-live="polite">Link copied to clipboard</div>
  <aside id="smart-app-banner" class="smart-banner" aria-label="Open in App">
    <div class="smart-banner-content">
      <div class="smart-banner-icon">
        <img src="https://app.aryavl.com/assets/assets/images/arsa-logo.6b8664469176a1cbc68b69165e007f8d.png" alt="A.R.S.A" width="40" height="40">
      </div>
      <div class="smart-banner-text">
        <div class="smart-banner-title">Experience in A.R.S.A</div>
        <div class="smart-banner-sub">Lossless audio, beat-synced lyrics & Liquid Glass UI</div>
      </div>
    </div>
    <div class="smart-banner-actions">
      <a href="${e(deepLink)}" class="smart-banner-btn" id="btn-smart-open">OPEN</a>
      <button class="smart-banner-close" type="button" onclick="document.getElementById('smart-app-banner').classList.add('dismissed')" aria-label="Dismiss">&times;</button>
    </div>
  </aside>
  <script src="/assets/share.js"></script>
</body>
</html>`;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// Android App Links
app.get('/.well-known/assetlinks.json', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.json(ASSET_LINKS);
});

// Static assets (CSS, JS, images)
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets'), { maxAge: '7d' }));
app.use('/public',  express.static(path.join(__dirname, 'public'),          { maxAge: '7d' }));

// Dynamic share routes
const shareRoutes = [
  '/watch/:videoId?',
  '/song/:videoId?',
  '/v/:videoId?',
  '/playlist/:playlistId?',
  '/channel/:artistId?',
  '/artist/:artistId?',
  '/:bareId([a-zA-Z0-9_-]{11})',  // bare video ID
];

shareRoutes.forEach((route) => {
  app.get(route, async (req, res) => {
    const ids = extractIds(req.path, { get: (k) => req.query[k] });
    // Override with named route params
    if (req.params.videoId)    ids.videoId    = req.params.videoId;
    if (req.params.playlistId) ids.playlistId = req.params.playlistId;
    if (req.params.artistId)   ids.artistId   = req.params.artistId;
    if (req.params.bareId)     ids.videoId    = req.params.bareId;

    if (!ids.videoId && !ids.playlistId && !ids.artistId) {
      return res.sendFile(path.join(__dirname, 'index.html'));
    }

    try {
      const html = await buildShareHtml(req.url, ids);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(html);
    } catch (err) {
      console.error('Share page error:', err);
      res.sendFile(path.join(__dirname, 'index.html'));
    }
  });
});

// Root — serve static landing
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// 404
app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, () => {
  console.log(`ARSA Web running on port ${PORT}`);
});
