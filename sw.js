/* Asset Verse — service worker
   Caches the app shell (this single-page tool) so it opens instantly and
   works offline once visited at least once. It deliberately does NOT try
   to cache or intercept calls to your shared database (Google Apps
   Script) or Google Drive — those need real connectivity, same as before.
   Bump CACHE_NAME (e.g. to 'assetverse-v2') whenever you ship an updated
   index.html so returning users get the new version instead of a stale
   cached copy. */
const CACHE_NAME = 'assetverse-v7';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL_FILES)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then(names=>Promise.all(
      names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event)=>{
  const url = new URL(event.request.url);
  // Only handle same-origin app-shell requests. Everything else (fonts,
  // the barcode/QR/CSV libraries, and — importantly — your Apps Script
  // shared database and any Drive links) goes straight to the network,
  // untouched, so it always reflects live data.
  if(url.origin !== self.location.origin){ return; }

  // NETWORK-FIRST: always try to fetch the latest version when online, and
  // only fall back to the cached copy if there's no connectivity. This is
  // what makes "I updated the file" actually show up immediately for
  // anyone with signal, instead of requiring an extra reload before a
  // background-refreshed cache catches up.
  event.respondWith(
    fetch(event.request).then(response=>{
      if(response && response.ok){
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(event.request, copy));
      }
      return response;
    }).catch(()=> caches.match(event.request))
  );
});
