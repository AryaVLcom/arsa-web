/* ARSA Share Portal — Pure Apple Liquid Glass Client Engine */
(function () {
  'use strict';

  const PACKAGE  = 'com.arsa.aryavl';
  const ACTIVITY = 'com.arsa.aryavl.WelcomeActivity';
  const DOMAIN   = 'listen.aryavl.com';
  const DOWNLOAD = 'https://download.app.aryavl.com';

  const seed = window.__ARSA_SHARE__ || {};

  const card          = document.getElementById('song-card');
  const coverArt      = document.getElementById('cover-art');
  const bleedPrimary  = document.getElementById('bleed-primary');
  const bleedSecond   = document.getElementById('bleed-secondary');
  const artworkShadow = document.getElementById('artwork-shadow');
  const vinylLabel    = document.getElementById('vinyl-label');
  const vinylRecord   = document.getElementById('vinyl-record');
  const songName      = document.getElementById('song-name');
  const songArtist    = document.getElementById('song-artist');
  const badgePill     = document.getElementById('badge-pill');
  const chipType      = document.getElementById('chip-type');
  const btnOpen       = document.getElementById('btn-open-arsa');
  const btnSmartOpen  = document.getElementById('btn-smart-open');
  const btnPlay       = document.getElementById('btn-play-toggle');
  const playIcon      = document.getElementById('play-icon');
  const playerCtrls   = document.getElementById('player-controls');
  const scrubber      = document.getElementById('audio-scrubber');
  const timeCurrent   = document.getElementById('time-current');
  const timeRemaining = document.getElementById('time-remaining');
  const previewStatus = document.getElementById('preview-status');
  const btnShare      = document.getElementById('btn-share');
  const btnCopy       = document.getElementById('btn-copy');
  const toast         = document.getElementById('toast');
  const metaTitle     = document.getElementById('meta-title');

  // 1. Specular Glare & Subtle 3D Refraction Tilt
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (card) {
    let rafId = null;
    window.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const px = (x / r.width) - 0.5;
      const py = (y / r.height) - 0.5;
      const angle = Math.round(Math.atan2(py, px) * (180 / Math.PI) + 135);

      card.style.setProperty('--mouse-x', x + 'px');
      card.style.setProperty('--mouse-y', y + 'px');
      card.style.setProperty('--light-angle', angle + 'deg');

      if (!prefersReducedMotion && e.pointerType === 'mouse') {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          card.style.transform = 'rotateX(' + (-py * 4.5).toFixed(2) + 'deg) rotateY(' + (px * 4.5).toFixed(2) + 'deg) translateY(-2px)';
        });
      }
    }, { passive: true });

    card.addEventListener('pointerleave', () => {
      if (rafId) cancelAnimationFrame(rafId);
      card.style.transform = '';
    });
  }

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  function syncBackdropArtwork(src) {
    if (!src) return;
    const cssUrl = "url('" + src.replace(/'/g, "\\'") + "')";
    if (bleedPrimary)  bleedPrimary.style.backgroundImage  = cssUrl;
    if (bleedSecond)   bleedSecond.style.backgroundImage   = cssUrl;
    if (artworkShadow) artworkShadow.style.backgroundImage = cssUrl;
    if (vinylLabel)    vinylLabel.style.backgroundImage    = cssUrl;
  }

  // Multi-zone palette extraction from cover art
  function samplePalette() {
    if (!coverArt) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 36;
      canvas.height = 36;
      ctx.drawImage(coverArt, 0, 0, 36, 36);
      const { data } = ctx.getImageData(0, 0, 36, 36);

      const sampleRegion = (x0, y0, x1, y1) => {
        let r = 0, g = 0, b = 0, count = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * 36 + x) * 4;
            const br = (data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000;
            if (br > 32 && br < 235) {
              r += data[i]; g += data[i+1]; b += data[i+2]; count++;
            }
          }
        }
        if (!count) return null;
        return [
          Math.min(255, Math.round((r / count) * 1.12)),
          Math.min(255, Math.round((g / count) * 1.12)),
          Math.min(255, Math.round((b / count) * 1.12))
        ];
      };

      const c1 = sampleRegion(0, 0, 24, 24);
      const c2 = sampleRegion(12, 12, 36, 36);
      const c3 = sampleRegion(0, 16, 36, 36);

      if (c1) {
        document.documentElement.style.setProperty('--accent', 'rgb(' + c1[0] + ', ' + c1[1] + ', ' + c1[2] + ')');
        document.documentElement.style.setProperty('--accent-rgb', c1[0] + ', ' + c1[1] + ', ' + c1[2]);
        document.documentElement.style.setProperty('--accent-glow', 'rgba(' + c1[0] + ', ' + c1[1] + ', ' + c1[2] + ', 0.52)');
      }
      if (c2) {
        document.documentElement.style.setProperty('--accent-2', 'rgb(' + c2[0] + ', ' + c2[1] + ', ' + c2[2] + ')');
        document.documentElement.style.setProperty('--accent-2-rgb', c2[0] + ', ' + c2[1] + ', ' + c2[2]);
      }
      if (c3) {
        document.documentElement.style.setProperty('--accent-3', 'rgb(' + c3[0] + ', ' + c3[1] + ', ' + c3[2] + ')');
        document.documentElement.style.setProperty('--accent-3-rgb', c3[0] + ', ' + c3[1] + ', ' + c3[2]);
      }
    } catch (_) {}
  }

  if (coverArt) {
    coverArt.addEventListener('load', () => {
      syncBackdropArtwork(coverArt.currentSrc || coverArt.src);
      samplePalette();
    });
    if (coverArt.complete) {
      syncBackdropArtwork(coverArt.currentSrc || coverArt.src);
      samplePalette();
    }
  }

  function parseMedia(urlStr) {
    try {
      const u = new URL(urlStr.startsWith('http') ? urlStr : 'https://' + urlStr);
      let videoId    = u.searchParams.get('v');
      let playlistId = u.searchParams.get('list');
      let artistId   = null;

      if (!videoId) {
        const vMatch = u.pathname.match(/^\/(?:watch|song|v)\/([a-zA-Z0-9_-]{11})/);
        if (vMatch) videoId = vMatch[1];
        else {
          const bareMatch = u.pathname.match(/^\/([a-zA-Z0-9_-]{11})$/);
          if (bareMatch) videoId = bareMatch[1];
        }
      }
      if (!playlistId) {
        const pMatch = u.pathname.match(/^\/playlist\/([a-zA-Z0-9_-]+)/);
        if (pMatch) playlistId = pMatch[1];
      }
      const aMatch = u.pathname.match(/^\/(?:channel|artist)\/([a-zA-Z0-9_-]+)/);
      if (aMatch) artistId = aMatch[1];

      return { videoId, playlistId, artistId };
    } catch (_) {
      return {};
    }
  }

  function setupLaunchButton(videoId, playlistId, artistId, customDeepLink) {
    let path = '';
    if (videoId)         path = 'watch?v=' + videoId;
    else if (playlistId) path = 'playlist?list=' + playlistId;
    else if (artistId)   path = 'channel/' + artistId;

    const arsaScheme   = 'arsa://' + path;
    const intentMain   = customDeepLink || ('intent://listen.aryavl.com/' + path + '#Intent;scheme=https;package=' + PACKAGE + ';action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end');
    const intentDomain = 'intent://' + DOMAIN + '/' + path + '#Intent;scheme=https;package=' + PACKAGE + ';end';

    const handler = (e) => {
      e.preventDefault();
      const start = Date.now();
      window.location.href = intentMain;
      setTimeout(() => { if (!document.hidden && Date.now() - start < 1500) window.location.href = arsaScheme; }, 250);
      setTimeout(() => { if (!document.hidden && Date.now() - start < 1800) window.location.href = intentDomain; }, 600);
    };

    if (btnOpen) {
      btnOpen.href = intentMain;
      btnOpen.onclick = handler;
    }
    if (btnSmartOpen) {
      btnSmartOpen.href = intentMain;
      btnSmartOpen.onclick = handler;
    }
  }

  // Vinyl + YouTube Preview Player
  let ytPlayer = null;
  let isPlaying = false;
  let vinylAngle = 0;

  function animateVinyl() {
    if (isPlaying && vinylRecord) {
      vinylAngle = (vinylAngle + 0.85) % 360;
      vinylRecord.style.transform = 'translateX(38px) rotate(' + vinylAngle + 'deg)';
    } else if (vinylRecord) {
      vinylRecord.style.transform = 'translateX(0px) rotate(' + vinylAngle + 'deg)';
    }
    requestAnimationFrame(animateVinyl);
  }
  requestAnimationFrame(animateVinyl);

  function initYouTubePreview(playableId) {
    if (!playableId || !btnPlay) return;
    btnPlay.style.display = 'flex';
    if (playerCtrls) playerCtrls.style.display = 'flex';

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);

    window.onYouTubeIframeAPIReady = function () {
      ytPlayer = new YT.Player('yt-frame-container', {
        height: '1',
        width: '1',
        videoId: playableId,
        playerVars: { playsinline: 1, controls: 0, disablekb: 1 },
        events: {
          onStateChange: (evt) => {
            if (evt.data === YT.PlayerState.PLAYING) {
              isPlaying = true;
              document.body.classList.add('is-playing');
              playIcon.querySelector('path').setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
              if (previewStatus) previewStatus.textContent = 'Playing Preview';
            } else {
              isPlaying = false;
              document.body.classList.remove('is-playing');
              playIcon.querySelector('path').setAttribute('d', 'M8 5v14l11-7z');
              if (previewStatus) previewStatus.textContent = 'Paused';
            }
          }
        }
      });
    };

    btnPlay.onclick = () => {
      if (!ytPlayer || !ytPlayer.playVideo) return;
      if (isPlaying) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
    };

    setInterval(() => {
      if (ytPlayer && ytPlayer.getCurrentTime && isPlaying) {
        const cur = ytPlayer.getCurrentTime();
        const dur = ytPlayer.getDuration() || 0;
        if (dur > 0 && scrubber) {
          const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
          scrubber.value = pct;
          scrubber.style.setProperty('--progress-pct', pct.toFixed(2) + '%');
          const m1 = Math.floor(cur / 60), s1 = Math.floor(cur % 60);
          if (timeCurrent) timeCurrent.textContent = m1 + ':' + (s1 < 10 ? '0' : '') + s1;
          const rem = Math.max(0, dur - cur);
          const m2 = Math.floor(rem / 60), s2 = Math.floor(rem % 60);
          if (timeRemaining) timeRemaining.textContent = '-' + m2 + ':' + (s2 < 10 ? '0' : '') + s2;
        }
      }
    }, 300);

    if (scrubber) {
      scrubber.addEventListener('input', () => {
        scrubber.style.setProperty('--progress-pct', scrubber.value + '%');
        if (ytPlayer && ytPlayer.seekTo && ytPlayer.getDuration) {
          ytPlayer.seekTo((scrubber.value / 100) * ytPlayer.getDuration(), true);
        }
      });
    }
  }

  if (btnShare) {
    btnShare.addEventListener('click', () => {
      const title = (songName && songName.textContent) || 'A.R.S.A Music';
      if (navigator.share) {
        navigator.share({ title, text: 'Listen to ' + title + ' on A.R.S.A', url: window.location.href }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied to clipboard ✓'));
      }
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied to clipboard ✓'));
      }
    });
  }

  async function initPortal() {
    if (seed.title || seed.videoId || seed.playlistId || seed.artistId) {
      if (seed.title && songName) songName.textContent = seed.title;
      if (seed.artist && songArtist) songArtist.textContent = seed.artist;
      if (seed.image && coverArt) coverArt.src = seed.image;
      setupLaunchButton(seed.videoId, seed.playlistId, seed.artistId, seed.deepLink);
      if (seed.videoId) initYouTubePreview(seed.videoId);
      return;
    }

    const parsed = parseMedia(window.location.href);
    const videoId    = parsed.videoId || (!parsed.playlistId && !parsed.artistId ? 'kXYiU_JCYtU' : null);
    const playlistId = parsed.playlistId;
    const artistId   = parsed.artistId;

    const u = new URL(window.location.href);
    const hintTitle  = u.searchParams.get('title');
    const hintThumb  = u.searchParams.get('thumb');
    const hintAuthor = u.searchParams.get('author');

    if (videoId) {
      const maxres = 'https://i.ytimg.com/vi/' + videoId + '/maxresdefault.jpg';
      const hq     = 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg';
      if (coverArt) {
        coverArt.src = hintThumb || maxres;
        coverArt.onerror = () => { coverArt.src = hq; };
      }
      setupLaunchButton(videoId, null, null);
      initYouTubePreview(videoId);

      if (hintTitle) {
        if (songName)   songName.textContent   = hintTitle;
        if (songArtist) songArtist.textContent = hintAuthor || 'A.R.S.A Music';
        if (metaTitle)  metaTitle.textContent  = hintTitle + ' — A.R.S.A';
      } else {
        try {
          const res = await fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + videoId + '&format=json');
          if (res.ok) {
            const data = await res.json();
            if (songName)   songName.textContent   = data.title || ('Track (' + videoId + ')');
            if (songArtist) songArtist.textContent = data.author_name || 'A.R.S.A Music';
            if (metaTitle)  metaTitle.textContent  = (data.title || 'Shared Song') + ' — A.R.S.A';
          }
        } catch (_) {}
      }
    } else if (playlistId) {
      if (badgePill) badgePill.textContent = 'PLAYLIST';
      if (chipType)  chipType.textContent  = 'PLAYLIST';
      if (songName)   songName.textContent   = hintTitle || 'Shared Playlist';
      if (songArtist) songArtist.textContent = hintAuthor || 'A.R.S.A Playlist';
      if (coverArt && hintThumb) coverArt.src = hintThumb;
      setupLaunchButton(null, playlistId, null);
    } else if (artistId) {
      if (badgePill) badgePill.textContent = 'ARTIST';
      if (chipType)  chipType.textContent  = 'ARTIST';
      if (songName)   songName.textContent   = hintTitle || 'Artist Channel';
      if (songArtist) songArtist.textContent = hintAuthor || 'A.R.S.A Artist';
      if (coverArt && hintThumb) coverArt.src = hintThumb;
      setupLaunchButton(null, null, artistId);
    }
  }

  initPortal();
})();
