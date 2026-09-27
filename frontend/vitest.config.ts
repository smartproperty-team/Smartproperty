import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Same "@" alias as vite.config.ts, so source files resolve in tests.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  test: {
    // happy-dom, not jsdom: jsdom 28+ and its undici dependency require
    // Node >= 22, while this project targets Node 20 (node:20-alpine in the
    // Dockerfile, node-version 20 in CI). Under Node 20 jsdom fails to start
    // with "webidl.util.markAsUncloneable is not a function", which is why
    // the test suite had never run.
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage'
    }
  }
})
