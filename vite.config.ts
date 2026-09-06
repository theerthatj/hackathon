import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { dtnRelayPlugin } from './vite-plugins/dtnRelay'

const isHttps = process.env.VITE_HTTPS === 'true' || process.argv.includes('--https')

export default defineConfig({
  plugins: [
    react(),
    dtnRelayPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3_500_000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: {
                maxEntries: 600,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/(scores|cells|scenarios).*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-telemetry-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/(dtn|households|members|auth).*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
    ...(isHttps ? [basicSsl()] : []),
  ],
  server: {
    host: true,
    https: isHttps ? {} : undefined,
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
