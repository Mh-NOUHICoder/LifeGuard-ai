self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests to the network
  event.respondWith(fetch(event.request));
});