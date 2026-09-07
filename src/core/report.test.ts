import { describe, expect, it } from 'vitest'
import type { BundleResult, Report } from './types'
import { countBySeverity, toJson, toMarkdown } from './report'

const result: BundleResult = {
  bundle: { dir: 'game', name: 'player', key: 'game/player', json: { path: 'game/player.json', name: 'player.json', size: 10, file: {} as File }, atlas: { path: 'game/player.atlas', name: 'player.atlas', size: 10, file: {} as File }, textures: [], variants: [{ dir: 'game/@0.5x', factor: 0.5, label: '@0.5x', textures: [] }], unreferencedTextures: [] },
  status: 'done',
  findings: [
    { code: 'skeleton.region-missing', severity: 'error', message: 'Attachment "arm" referencia região "arm" inexistente no atlas.', hint: 'Reexporte o atlas.', bundle: 'player', subject: { kind: 'attachment', name: 'arm' } },
    { code: 'atlas.region-unused', severity: 'warning', message: '2 regiões sem attachment.', detail: 'a, b', bundle: 'player' },
    { code: 'variants.scale-missing', severity: 'error', message: 'Atlas de @0.5x não declara "scale".', bundle: 'player', variant: '@0.5x' },
    { code: 'skeleton.counts', severity: 'info', message: '5 bones.', bundle: 'player' },
  ],
  summary: { version: '4.2.43', hash: 'h', bones: 5, slots: 3, skins: ['default'], animations: ['idle'], events: [], size: { x: 0, y: 0, width: 100, height: 200 }, slotTable: [] },
  animations: [{ name: 'idle', duration: 2, events: [{ name: 'hit', time: 0.5 }], seamless: true, seamDiff: [], bounds: { x: -10, y: 0, width: 420, height: 610 }, nan: false }],
  pages: [{ name: 'player.png', width: 1024, height: 512, bytes: 2048, format: 'png' }],
  runtime: { loaded: true, ms: 84 },
}
const report: Report = { generatedAt: '2026-09-06T21:00:00.000Z', runtimeVersion: '4.2', results: [result] }

describe('report', () => {
  it('counts by severity', () => {
    expect(countBySeverity(result.findings)).toEqual({ error: 2, warning: 1, info: 1 })
  })
  it('renders markdown sections', () => {
    const md = toMarkdown(report)
    expect(md).toContain('# Spine Check — report')
    expect(md).toContain('target runtime spine-pixi-v8 4.2')
    expect(md).toContain('## player  (player.json · player.atlas · 1 page · variants: @0.5x)')
    expect(md).toContain('Errors 2 · Warnings 1 · Info 1 · runtime: loaded in 84 ms')
    expect(md).toContain('### Errors\n- **skeleton.region-missing** — Attachment "arm"')
    expect(md).toContain('  Hint: Reexporte o atlas.')
    expect(md).toContain('- **variants.scale-missing** [@0.5x] — Atlas de @0.5x')
    expect(md).toContain('  a, b')
    expect(md).toContain('| idle | 2.00 s | hit @ 0.50 s | ✓ | 420×610 |')
  })
  it('serializes json without File objects', () => {
    const json = toJson(report)
    expect(json).not.toContain('"file"')
    expect(JSON.parse(json).results[0].bundle.json.name).toBe('player.json')
  })
})
