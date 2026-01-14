import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: (id) => {
        // Exclude convex server files from the build
        return id.includes('convex/') && !id.includes('_generated/api')
      }
    }
  },
  resolve: {
    alias: {
      // Make sure convex/_generated/api resolves correctly
    }
  }
})
