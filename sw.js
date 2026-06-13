// Regicide service worker — offline play + asset caching.
// Strategy: network-first for the page & config (so updates appear
// immediately), cache-first for heavy static assets (music, icons).
const VERSION = 'regicide-v1';
const STATIC = ['regicide-music.mp3','icon-192.png','icon-512.png','manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c =>
      Promise.all(STATIC.map(u => c.add(u).catch(()=>{})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;          // leaderboard API etc: straight to network
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('config.js');
  if (isPage) {
    // network-first: always serve the freshest game, fall back to cache offline
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // cache-first for static assets
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return r;
      }))
    );
  }
});
