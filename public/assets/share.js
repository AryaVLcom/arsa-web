/* ARSA Share Page — Client JS */
(function () {
  'use strict';

  const PACKAGE  = 'com.arsa.aryavl';
  const ACTIVITY = 'com.arsa.aryavl.WelcomeActivity';
  const DOMAIN   = 'listen.aryavl.com';

  // Server pre-populates window.__ARSA_SHARE__ so we don't need a second oEmbed call
  const seed = window.__ARSA_SHARE__ || {};

  const card       = document.getElementById('song-card');
  const coverArt   = document.getElementById('cover-art');
  const songName   = document.getElementById('song-name');
  const songArtist = document.getElementById('song-artist');
  const btnOpen    = document.getElementById('btn-open-arsa');

  // 1. Specular highlight
  window.addEventListener('pointermove', (e) => {
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
  }, { passive: true });

  // 2. 3D Tilt
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && card) {
    let reqId = null;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      if (reqId) cancelAnimationFrame(reqId);
      reqId = requestAnimationFrame(() => {
        card.style.transform = `perspective(1000px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-2px)`;
      });
    });
    card.addEventListener('pointerleave', () => {
      if (reqId) cancelAnimationFrame(reqId);
      card.style.transform = '';
    });
  }

  // 3. Deep link launcher with progressive fallback
  function setupLaunchButton(deepLink) {
    if (!btnOpen || !deepLink) return;
    const arsaScheme   = deepLink.replace(/intent:\/\/[^#]+#Intent;/, 'arsa://').replace(/#.*$/, '');
    const intentDomain = `intent://${DOMAIN}/${location.pathname.replace(/^\//,'')}#Intent;scheme=https;package=${PACKAGE};end`;

    btnOpen.href    = deepLink;
    btnOpen.onclick = (e) => {
      e.preventDefault();
      const start = Date.now();
      window.location.href = deepLink;
      setTimeout(() => { if (!document.hidden && Date.now() - start < 1500) window.location.href = arsaScheme; }, 200);
      setTimeout(() => { if (!document.hidden && Date.now() - start < 1500) window.location.href = intentDomain; }, 500);
    };
  }

  // 4. Cover art fallback chain
  if (coverArt && seed.videoId) {
    const maxres = `https://i.ytimg.com/vi/${seed.videoId}/maxresdefault.jpg`;
    const hq     = `https://i.ytimg.com/vi/${seed.videoId}/hqdefault.jpg`;
    if (!seed.image || seed.image.includes('og-preview')) {
      coverArt.src = maxres;
      coverArt.onerror = () => { coverArt.src = hq; };
    } else {
      coverArt.onerror = () => { coverArt.src = maxres; };
    }
  }

  // 5. Apply seed data (server already rendered these, just ensure JS is in sync)
  if (seed.title  && songName)   songName.textContent   = seed.title;
  if (seed.artist && songArtist) songArtist.textContent = seed.artist;
  if (seed.deepLink) setupLaunchButton(seed.deepLink);

})();
