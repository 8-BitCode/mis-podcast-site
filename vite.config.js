// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Mirrors functions/feed-proxy.js so `npm run dev` works standalone.
      '/feed-proxy': {
        target: 'https://anchor.fm/s/11798adb0/podcast/rss',
        changeOrigin: true,
        rewrite: () => '',
      },
      // Mirrors functions/audio-proxy/[[path]].js.
      '/audio-proxy': {
        target: 'https://anchor.fm',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/audio-proxy/, ''),
        followRedirects: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['access-control-allow-origin'] = '*'
            proxyRes.headers['access-control-allow-headers'] = 'Range'
            proxyRes.headers['access-control-expose-headers'] =
              'Content-Length, Content-Range, Accept-Ranges'
          })
        },
      },
    },
  },
})