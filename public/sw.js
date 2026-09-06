// Sahayam Disaster Resilience Service Worker
const CACHE_NAME = 'sahayam-pwa-v1'
const TILE_CACHE = 'sahayam-tiles-v1'
const API_CACHE = 'sahayam-api-v1'

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
]

// Install lifecycle: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// Activate lifecycle: claim clients and purge old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (![CACHE_NAME, TILE_CACHE, API_CACHE].includes(key)) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. DTN mesh endpoints, SSE stream, and mutations: strictly NetworkOnly
  if (
    url.pathname.startsWith('/api/dtn') ||
    request.method !== 'GET' ||
    url.pathname.includes('/members') ||
    url.pathname.includes('/households') ||
    url.pathname.includes('/auth')
  ) {
    return
  }

  // 2. OpenStreetMap / Map raster tiles: CacheFirst (7-day offline persistence)
  if (url.hostname.includes('tile.openstreetmap.org') || url.pathname.endsWith('.png') && url.hostname.includes('tile')) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached

        try {
          const networkResponse = await fetch(request)
          if (networkResponse.status === 200 || networkResponse.type === 'opaque') {
            cache.put(request, networkResponse.clone())
          }
          return networkResponse
        } catch {
          return cached || new Response('', { status: 408, statusText: 'Tile Request Timeout' })
        }
      })
    )
    return
  }

  // 3. Telemetry scores & spatial cells: StaleWhileRevalidate
  if (url.pathname.startsWith('/api/scores') || url.pathname.startsWith('/api/cells') || url.pathname.startsWith('/api/scenarios')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request)
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone())
            }
            return networkResponse
          })
          .catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // 4. HTML navigation & static app assets: Cache falling back to network, with SPA offline fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (response.status === 200 && (request.url.startsWith(self.location.origin) || request.url.includes('/assets/'))) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
        }
        return response
      }).catch(async () => {
        // SPA routing fallback: if navigation fails offline, serve precached /index.html
        if (request.mode === 'navigate') {
          const indexCache = await caches.open(CACHE_NAME)
          const fallback = await indexCache.match('/index.html')
          if (fallback) return fallback
        }
        return new Response('Network unavailable (Offline)', { status: 503, statusText: 'Offline' })
      })
    })
  )
})
