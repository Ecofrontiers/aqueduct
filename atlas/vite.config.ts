import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/coingecko': {
          target: 'https://api.coingecko.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/coingecko/, '/api/v3'),
        },
        '/replicate-api': {
          target: 'https://api.replicate.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/replicate-api/, ''),
          headers: {
            'Authorization': `Bearer ${env.VITE_REPLICATE_API_TOKEN || ''}`,
          },
        },
        '/api/parliament': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        // Aqueduct swarm layer: dev-only same-origin proxy so the browser can
        // attempt a true live re-fetch of the EthicHub anchor lot (avoids a
        // CORS failure on greencoffee.ethichub.com). Production has no proxy —
        // the client always falls back to the timestamped snapshot honestly
        // (DESIGN-BRIEF.md §4.8).
        '/api/ethichub-shop': {
          target: 'https://greencoffee.ethichub.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ethichub-shop/, ''),
        },
      },
    },
  };
})
