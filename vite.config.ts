import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Claude Code masaüstü önizlemesi 5173 doluysa PORT ile başka port verir.
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    host: 'localhost',
  },
})
