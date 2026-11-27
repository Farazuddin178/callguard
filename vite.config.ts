import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  worker: { format: 'es' },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'CallGuard',
        short_name: 'CallGuard',
        lang: 'en',
        start_url: '/',
        display: 'standalone',
        theme_color: '#f2f8f4',
        background_color: '#f2f8f4',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['index.html', 'registerSW.js', 'assets/*.{js,css,woff,woff2}'],
        globIgnores: ['assets/{whisper.worker,capture.worklet}-*.js'],
        navigateFallback: 'index.html',
        runtimeCaching: [{
          urlPattern: ({ sameOrigin, url }) => sameOrigin &&
            /^\/assets\/(?:(?:whisper\.worker|capture\.worklet)-[\w-]+\.js|ort-wasm-simd-threaded\.jsep-[\w-]+\.(?:wasm|mjs))$/.test(url.pathname),
          handler: 'CacheFirst',
          options: {
            cacheName: 'callguard-speech-runtime',
            cacheableResponse: { statuses: [200] },
          },
        }],
      },
    }),
  ],
})
