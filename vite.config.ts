import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { resolve } from 'path'

// Custom plugin to build service worker
function buildServiceWorker() {
  return {
    name: 'build-service-worker',
    async writeBundle() {
      // Build the service worker using esbuild (available via Vite)
      const { build } = await import('esbuild')
      await build({
        entryPoints: [resolve(__dirname, 'src/workers/service-worker.ts')],
        bundle: true,
        outfile: resolve(__dirname, 'dist/sw.js'),
        format: 'iife',
        target: 'es2020',
        minify: true,
      })
    },
    configureServer(server: { middlewares: { use: (path: string, handler: (req: unknown, res: { setHeader: (name: string, value: string) => void; end: (content: string) => void }, next: () => void) => void) => void } }) {
      // Serve the service worker during development
      server.middlewares.use('/sw.js', async (_req, res, next) => {
        try {
          const { build } = await import('esbuild')
          const result = await build({
            entryPoints: [resolve(__dirname, 'src/workers/service-worker.ts')],
            bundle: true,
            write: false,
            format: 'iife',
            target: 'es2020',
          })
          res.setHeader('Content-Type', 'application/javascript')
          res.end(result.outputFiles[0].text)
        } catch {
          next()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      // Enable polyfills for Node.js modules used by @originals/sdk
      include: ['crypto', 'buffer', 'path', 'stream', 'util'],
      globals: {
        Buffer: true,
        process: true,
      },
    }),
    buildServiceWorker(),
  ],
  optimizeDeps: {
    // Force pre-bundling of problematic dependencies
    include: ['@originals/sdk'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'convex-vendor': ['convex'],
          // Split @originals packages for better code splitting
          'originals-sdk': ['@originals/sdk'],
          'originals-auth': ['@originals/auth'],
        },
      },
    },
  },
})
