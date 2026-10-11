import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'assets/icons/icon-192.png',
        'assets/icons/icon-512.png',
        'assets/icons/icon-512-maskable.png',
      ],

      manifest: {
        name: 'SIDUTama Cibenda',
        short_name: 'SIDUTama',
        description: 'Pelayanan Terpadu Satu Pintu Desa Cibenda',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',

        icons: [
          {
            src: '/assets/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/assets/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/assets/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        navigateFallback: '/index.html',
        importScripts: ['/push-handler.js'],
        // Pratinjau PDF selalu butuh jaringan; tidak perlu ikut precache.
        globIgnores: ['**/pdfjs-*.js'],

        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'StaleWhileRevalidate',

            options: {
              cacheName: 'images',

              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },

              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    rollupOptions: {
      output: {
        // Vendor jarang berubah; dipisah agar tetap ter-cache di browser
        // walau kode aplikasi dirilis ulang.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('pdfjs-dist')) return 'pdfjs'
          if (/[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/.test(id)) {
            return 'charts'
          }
          if (
            /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(
              id,
            )
          ) {
            return 'react'
          }

          return undefined
        },
      },
    },
  },

  server: {
    host: '127.0.0.1',
    port: 5173,

    allowedHosts: true,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/sanctum': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
