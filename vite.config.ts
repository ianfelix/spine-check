import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const runtimePkg = JSON.parse(
  readFileSync('node_modules/@esotericsoftware/spine-pixi-v8/package.json', 'utf8'),
) as { version: string }

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  define: { __SPINE_RUNTIME_VERSION__: JSON.stringify(runtimePkg.version) },
  test: { environment: 'node', passWithNoTests: true, include: ['src/**/*.test.ts'] },
})
