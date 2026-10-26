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

  <meta name="theme-color" content="#0a0010">
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
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/share.css">
</head>
<body>
  <svg class="filters-def" aria-hidden="true">
    <defs>
      <filter id="glass-lens" x="-10%" y="-10%" width="120%" height="120%" filterUnits="objectBoundingBox">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
        <feBlend in="SourceGraphic" in2="displaced" mode="overlay"/>
      </filter>
    </defs>
  </svg>
  <div class="backdrop-stage" aria-hidden="true">
    <div class="bg-shape shape-1"></div>
    <div class="bg-shape shape-2"></div>
    <div class="bg-shape shape-3"></div>
  </div>
  <div class="film-grain" aria-hidden="true"></div>
  <header class="top-bar">
    <a href="/" class="brand-capsule"><span></span> A.R.S.A</a>
  </header>
  <main class="main-container">
    <div class="glass-card" id="song-card">
      <div class="cover-art-wrapper">
        <img id="cover-art" src="${e(image)}" alt="Song artwork">
        <div class="art-reflection"></div>
      </div>
      <h1 class="song-title" id="song-name">${e(title)}</h1>
      <p class="song-artist" id="song-artist">${e(artist)}</p>
      <div class="actions-group">
        <a href="${e(deepLink)}" class="glass-btn glass-btn-primary" id="btn-open-arsa">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Open in A.R.S.A
        </a>
        <a href="${e(DOWNLOAD_URL)}" class="glass-btn glass-btn-secondary" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download A.R.S.A
        </a>
      </div>
    </div>
  </main>
  <footer class="site-footer">
    <p class="footer-desc">A.R.S.A is an ad-free, open-source music player featuring synchronized lyrics, gapless playback, and high-fidelity audio streams.</p>
    <div class="footer-meta-row">
      <span>HOSTED AT: <a href="https://listen.aryavl.com">listen.aryavl.com</a></span>
      <span>•</span>
      <span><a href="https://github.com/aryavl/arsa" target="_blank" rel="noopener">SOURCE (GPL-3.0)</a></span>
      <span>•</span>
      <span>POWERED BY <a href="https://aryavl.com" target="_blank" rel="noopener" class="powered-by">ARYAVL.COM</a></span>
    </div>
  </footer>
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
