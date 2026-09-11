'use strict';

const VERSION = 'swift-bird-v11-13';
const SHELL = [
  './',
  './index.html',
  './app.js',
  './words.js',
  './patterns.js',
  './stories.js',
  './dialogues.js',
  './errors.js',
  './journey.js',
  './styles.css',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== VERSION && key !== VERSION + '-fonts').map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);

  // Dane kont i postępów zawsze pochodzą z serwera i nigdy nie trafiają do cache PWA.
  if(url.origin === location.origin && url.pathname.startsWith('/api/')) return;

  if(url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')){
    event.respondWith(
      caches.open(VERSION + '-fonts').then(cache =>
        cache.match(request).then(cached => {
          const live = fetch(request).then(response => {
            if(response.ok) cache.put(request,response.clone());
            return response;
          }).catch(() => cached);
          return cached || live;
        })
      )
    );
    return;
  }

  if(url.origin !== location.origin) return;

  // Najpierw sieć, aby tablet od razu pobierał nową wersję; cache jest planem awaryjnym.
  event.respondWith(
    fetch(request).then(response => {
      if(response.ok){
        const copy=response.clone();
        caches.open(VERSION).then(cache => cache.put(request,copy));
      }
      return response;
    }).catch(async () => {
      const cached=await caches.match(request);
      if(cached) return cached;
      if(request.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    })
  );
});
