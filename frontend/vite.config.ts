import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/', // ensures correct asset paths in production

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',

      includeAssets: [
        'pwa/apple-touch-icon.png',
        'pwa/favicon-64.png',
        'pwa/icon.svg',
        'pwa/safari-pinned-tab.svg'
      ],

      manifest: {
        id: '/',
        name: 'Hayleys Fentons TMS',
        short_name: 'HF TMS',
        description:
          'Transport Management System for request creation, approvals, allocation, fleet operations, and driver workflows.',

        start_url: '/',
        scope: '/',

        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],

        orientation: 'portrait-primary',

        theme_color: '#123c37',
        background_color: '#f7f5ef',

        lang: 'en',

        categories: ['business', 'productivity', 'utilities'],

        icons: [
          {
            src: '/pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },

      devOptions: {
        enabled: false
      }
    })
  ],

  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})