import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// Build web standalone (SPA) do mesmo renderer React — sem Electron.
// A ponte window.readdeck é provida pelo Supabase (ver src/renderer/src/main.tsx).
export default defineConfig({
  root: resolve('src/renderer'),
  // .env.local fica na raiz do projeto (não em src/renderer).
  envDir: resolve('.'),
  base: '/',
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(resolve('tailwind.config.js')), autoprefixer()]
    }
  },
  build: {
    outDir: resolve('dist-web'),
    emptyOutDir: true
  },
  server: { port: 5199, strictPort: false }
})
