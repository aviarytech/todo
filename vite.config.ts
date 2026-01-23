import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

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
  ],
  optimizeDeps: {
    // Force pre-bundling of problematic dependencies
    include: ['@originals/sdk'],
  },
})
