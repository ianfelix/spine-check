import { describe, expect, it } from 'vitest'
import type { CheckContext, SkeletonDoc, SpineBundle } from '../types'
import { DEFAULT_THRESHOLDS } from '../settings'
import { parseAtlas } from '../atlas'
import { skeletonChecks } from './skeleton'
import { DOC } from '../__fixtures__/doc'

const bundle: SpineBundle = { dir: 'd', name: 'hero', key: 'd/hero', json: { path: 'd/hero.json', name: 'hero.json', size: 100, file: {} as File }, textures: [], variants: [], unreferencedTextures: [] }
const ATLAS = parseAtlas('hero.png\nsize: 64,64\nbody\nbounds: 0,0,8,8\nweapons/sword\nbounds: 8,0,8,8\narm_img\nbounds: 16,0,8,8\nfx01\nbounds: 0,8,8,8\nfx02\nbounds: 8,8,8,8\n')
const ctx = (over: Partial<CheckContext> = {}): CheckContext => ({ bundle, skeleton: DOC, prettyRatio: 1, atlas: ATLAS, images: new Map(), variants: [], settings: DEFAULT_THRESHOLDS, ...over })
const byCode = (c: CheckContext) => { const m = new Map<string, ReturnType<typeof skeletonChecks>>(); for (const f of skeletonChecks(c)) m.set(f.code, [...(m.get(f.code) ?? []), f]); return m }

describe('skeletonChecks', () => {
  it('reports invalid json only', () => {
    const f = skeletonChecks(ctx({ skeleton: undefined, skeletonError: 'Unexpected token' }))
    expect(f.map((x) => x.code)).toEqual(['skeleton.json-invalid'])
  })
  it('checks version against the target runtime', () => {
    expect(byCode(ctx()).has('skeleton.version-mismatch')).toBe(false)
    const bad = ctx({ settings: { ...DEFAULT_THRESHOLDS, runtimeVersion: '4.1' } })
    expect(byCode(bad).get('skeleton.version-mismatch')?.[0].severity).toBe('error')
    const noVersion: SkeletonDoc = { ...DOC, skeleton: {} }
    expect(byCode(ctx({ skeleton: noVersion })).has('skeleton.version-unknown')).toBe(true)
  })
  it('finds attachments whose region is missing from the atlas', () => {
    const atlas = parseAtlas('hero.png\nsize: 64,64\nbody\nbounds: 0,0,8,8\n')
    const f = byCode(ctx({ atlas })).get('skeleton.region-missing') ?? []
    expect(f.map((x) => x.subject?.name).sort()).toEqual(['arm', 'fx', 'sword'])
    expect(f[0].severity).toBe('error')
  })
  it('emits structural warnings and infos', () => {
    const m = byCode(ctx())
    expect(m.get('skeleton.empty-animation')?.[0].subject).toEqual({ kind: 'animation', name: 'backup/old_walk' })
    expect(m.get('skeleton.suspicious-name')?.map((f) => f.subject?.name)).toEqual(['backup/old_walk'])
    expect(m.get('skeleton.unused-bone')?.[0].detail).toBe('stray')
    expect(m.get('skeleton.unused-slot')?.[0].detail).toBe('empty')
    expect(m.get('skeleton.empty-skin')?.[0].subject?.name).toBe('ghost')
    expect(m.get('skeleton.event-unkeyed')?.[0].detail).toBe('never')
    expect(m.get('skeleton.events')?.[0].detail).toBe('hit: idle')
    expect(m.get('skeleton.clipping')?.[0].severity).toBe('warning')
    expect(m.get('skeleton.triangles-total')?.[0].severity).toBe('info')
    expect(m.get('skeleton.constraints')?.[0].message).toContain('1 IK')
    expect(m.get('skeleton.blend-modes')?.[0].detail).toBe('arm (additive)')
    expect(m.get('skeleton.counts')?.[0].message).toContain('5 bones')
    expect(m.get('skeleton.size')?.[0].severity).toBe('info')
    expect(m.has('skeleton.nonessential')).toBe(true)
    expect(m.has('skeleton.pretty-printed')).toBe(false)
    expect(m.has('skeleton.binary-hint')).toBe(false)
  })
  it('scales severities with thresholds', () => {
    const settings = { ...DEFAULT_THRESHOLDS, meshVerticesWarn: 3, trianglesWarn: 1, deformWarn: 0, skeletonSizeWarn: 100 }
    const m = byCode(ctx({ settings, prettyRatio: 1.5, bundle: { ...bundle, json: { ...bundle.json!, size: 600 * 1024 } } }))
    expect(m.get('skeleton.mesh-heavy')?.[0].subject?.name).toBe('sword')
    expect(m.get('skeleton.triangles-total')?.[0].severity).toBe('warning')
    expect(m.has('skeleton.deform-heavy')).toBe(true)
    expect(m.get('skeleton.size')?.[0].severity).toBe('warning')
    expect(m.get('skeleton.pretty-printed')?.[0].message).toContain('+50%')
    expect(m.has('skeleton.binary-hint')).toBe(true)
  })
})
