import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/three') && !id.includes('@react-three')) return 'three-core'
          if (id.includes('@react-three')) return 'three-fiber'
          if (id.includes('gsap')) return 'gsap-bundle'
          if (id.includes('framer-motion') || id.includes('motion')) return 'motion'
        },
      }
    },
    target: 'esnext',
  }
})