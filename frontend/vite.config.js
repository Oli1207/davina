import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png', 'push-sw.js'],
      manifest: {
        name: 'Davina',
        short_name: 'Davina',
        description: 'Avancer chaque jour, dans chaque domaine de ma vie.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#c8102e',
        shortcuts: [
          { name: 'SOS envie', url: '/corps?onglet=sucre&sos=1', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Noter une idée', url: '/journal', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
        categories: ['productivity', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        // Reception des notifications push (fichier autonome dans public/).
        importScripts: ['/push-sw.js'],
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\/]node_modules[\/](react|react-dom|react-router|react-router-dom|scheduler)[\/]/.test(id)) return 'react-vendor';
          if (/[\/]node_modules[\/]@supabase[\/]/.test(id)) return 'supabase';
          if (/[\/]node_modules[\/]lucide-react[\/]/.test(id)) return 'icons';
          return 'vendor';
        },
      },
    },
  },
});
