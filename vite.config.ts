import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Absolute base — the app is hosted at a domain root (vibepantry.com on
// Cloudflare Pages; also Docker/nginx or any static host served from `/`).
// Root hosting is required by the landing (`/`) ↔ app (`/app`) split, and it
// lets the service worker register at `/sw.js` with scope `/`.
// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'VibePantry',
        short_name: 'VibePantry',
        description:
          'Snap your pantry, cook from what you have. Static, bring-your-own-key, your data never leaves your browser.',
        theme_color: '#17120e',
        background_color: '#17120e',
        display: 'standalone',
        // Installed PWA opens the app, not the landing page.
        start_url: '/app',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Offline app shell — AI calls obviously still need network.
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      },
    }),
  ],
})
