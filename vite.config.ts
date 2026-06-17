import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built `dist/` works from any path:
// static hosts, GitHub Pages project sites, Docker/nginx, file://.
// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
})
