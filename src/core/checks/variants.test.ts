import { describe, expect, it } from 'vitest'
import type { CheckContext, ImageInfo, SkeletonDoc, SpineBundle, VariantContext } from '../types'
import { DEFAULT_THRESHOLDS } from '../settings'
import { parseAtlas } from '../atlas'
import { firstDiffPath, variantsChecks } from './variants'
import { runAllChecks } from './index'
import { DOC } from '../__fixtures__/doc'

const img = (name: string, width: number, height: number): [string, ImageInfo] => [name, { name, width, height, bytes: 1, format: 'webp' }]
const bundle: SpineBundle = { dir: 'game', name: 'hero', key: 'game/hero', textures: [], variants: [], unreferencedTextures: [] }
const variant = (over: Partial<VariantContext> = {}): VariantContext => ({
  label: '@0.5x', factor: 0.5,
  files: { dir: 'game/@0.5x', factor: 0.5, label: '@0.5x', textures: [] },
  skeleton: DOC,
  atlas: parseAtlas('hero.webp\nsize: 32,32\nscale: 0.5\nbody\nbounds: 0,0,4,4\n'),
  images: new Map([img('hero.webp', 32, 32)]),
  ...over,
})
const ctx = (variants: VariantContext[], over: Partial<CheckContext> = {}): CheckContext => ({
  bundle, skeleton: DOC, atlas: parseAtlas('hero.webp\nsize: 64,64\nbody\nbounds: 0,0,8,8\n'), images: new Map([img('hero.webp', 64, 64)]), variants, settings: DEFAULT_THRESHOLDS, ...over,
})
const codes = (c: CheckContext) => variantsChecks(c).map((f) => `${f.variant ?? ''}:${f.code}:${f.severity}`)

describe('firstDiffPath', () => {
  it('ignores key order and finds the first differing path', () => {
    expect(firstDiffPath({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBeNull()
    expect(firstDiffPath({ a: 1, b: [1, 2] }, { a: 1, b: [1, 3] })).toBe('$.b[1]')
    expect(firstDiffPath({ a: { x: 1 } }, { a: {} })).toBe('$.a.x')
    expect(firstDiffPath([1], [1, 2])).toBe('$.length')
  })
})

describe('variantsChecks', () => {
  it('is quiet when the variant matches', () => { expect(codes(ctx([variant()]))).toEqual([]) })
  it('flags divergent skeleton with the first diff path', () => {
    const other: SkeletonDoc = { ...DOC, slots: [{ ...DOC.slots![0], attachment: 'ref_value' }, ...DOC.slots!.slice(1)] }
    const f = variantsChecks(ctx([variant({ skeleton: other })]))
    expect(f[0]).toMatchObject({ code: 'variants.skeleton-differs', severity: 'error', variant: '@0.5x' })
    expect(f[0].detail).toContain('$.slots[0].attachment')
  })
  it('flags scale missing / mismatch, page size and missing textures', () => {
    expect(codes(ctx([variant({ atlas: parseAtlas('hero.webp\nsize: 32,32\nbody\nbounds: 0,0,4,4\n') })]))).toContain('@0.5x:variants.scale-missing:error')
    expect(codes(ctx([variant({ atlas: parseAtlas('hero.webp\nsize: 32,32\nscale: 0.25\nbody\nbounds: 0,0,4,4\n') })]))).toContain('@0.5x:variants.scale-mismatch:error')
    expect(codes(ctx([variant({ images: new Map([img('hero.webp', 40, 32)]) })]))).toContain('@0.5x:variants.page-size-mismatch:warning')
    expect(codes(ctx([variant({ images: new Map() })]))).toContain('@0.5x:variants.texture-missing:error')
  })
  it('marks orphan variant bundles', () => {
    expect(codes(ctx([], { bundle: { ...bundle, dir: 'game/@2x' } }))).toEqual([':variants.orphan:info'])
  })
})

describe('runAllChecks', () => {
  it('concatenates all check groups sorted by severity', () => {
    const f = runAllChecks(ctx([variant({ atlas: parseAtlas('hero.webp\nsize: 32,32\nbody\nbounds: 0,0,4,4\n') })]))
    const sev = f.map((x) => x.severity)
    expect(sev.indexOf('info')).toBeGreaterThan(sev.lastIndexOf('error'))
    expect(f.some((x) => x.code === 'variants.scale-missing')).toBe(true)
    expect(f.some((x) => x.code === 'skeleton.counts')).toBe(true)
  })
})
