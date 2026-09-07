import { describe, expect, it } from 'vitest'
import type { CheckContext, ImageInfo, SpineBundle } from '../types'
import { DEFAULT_THRESHOLDS } from '../settings'
import { parseAtlas } from '../atlas'
import { atlasChecks } from './atlas'
import { DOC } from '../__fixtures__/doc'

const bundle: SpineBundle = { dir: 'd', name: 'hero', key: 'd/hero', textures: [], variants: [], unreferencedTextures: [] }
const img = (name: string, width: number, height: number, bytes = 1000, format: ImageInfo['format'] = 'png'): [string, ImageInfo] => [name, { name, width, height, bytes, format }]
const ctx = (atlasText: string, over: Partial<CheckContext> = {}): CheckContext => ({ bundle, atlas: parseAtlas(atlasText), images: new Map([img('hero.png', 64, 64)]), variants: [], settings: DEFAULT_THRESHOLDS, ...over })
const codes = (c: CheckContext) => atlasChecks(c).map((f) => f.code)

const OK = 'hero.png\nsize: 64,64\nfilter: Linear,Linear\npma: true\nbody\nbounds: 0,0,40,40\nweapons/sword\nbounds: 40,0,24,64\narm_img\nbounds: 0,40,40,24\nfx01\nbounds: 0,0,1,1\nfx02\nbounds: 0,0,1,1\n'

describe('atlasChecks', () => {
  it('emits only infos for a healthy atlas', () => {
    const f = atlasChecks(ctx(OK, { skeleton: DOC }))
    expect(f.filter((x) => x.severity !== 'info')).toEqual([])
    expect(f.map((x) => x.code)).toEqual(['atlas.texture-format', 'atlas.pages', 'atlas.gpu-memory'])
    expect(f[1].message).toContain('pma true')
  })
  it('flags declared size different from the image', () => {
    expect(codes(ctx(OK.replace('64,64', '128,64'), { skeleton: DOC }))).toContain('atlas.page-size-mismatch')
  })
  it('flags regions out of bounds and duplicates', () => {
    const f = atlasChecks(ctx('hero.png\nsize: 64,64\nbody\nbounds: 60,60,10,10\nbody\nbounds: 0,0,1,1\n'))
    expect(f.map((x) => x.code)).toContain('atlas.region-out-of-bounds')
    expect(f.map((x) => x.code)).toContain('atlas.region-duplicate')
  })
  it('uses the rotated footprint for out-of-bounds', () => {
    const f = atlasChecks(ctx('hero.png\nsize: 64,64\nsmoke\nbounds: 40,0,60,20\nrotate: 90\nbad\nbounds: 40,0,60,20\n'))
    const names = f.filter((x) => x.code === 'atlas.region-out-of-bounds').map((x) => x.subject?.name)
    expect(names).toEqual(['bad'])
  })
  it('grades page size against thresholds', () => {
    const big = ctx('hero.png\nsize: 4096,4096\nbody\nbounds: 0,0,10,10\n', { images: new Map([img('hero.png', 4096, 4096)]) })
    expect(atlasChecks(big).find((x) => x.code === 'atlas.page-too-large')?.severity).toBe('warning')
    const huge = ctx('hero.png\nsize: 8192,64\nbody\nbounds: 0,0,10,10\n', { images: new Map([img('hero.png', 8192, 64)]) })
    expect(atlasChecks(huge).find((x) => x.code === 'atlas.page-too-large')?.severity).toBe('error')
  })
  it('reports unused regions, low occupancy, png size and gpu memory', () => {
    const c = ctx('hero.png\nsize: 64,64\nbody\nbounds: 0,0,8,8\nleftover\nbounds: 8,0,8,8\n', { skeleton: DOC, images: new Map([img('hero.png', 64, 64, 2 * 1024 * 1024)]), settings: { ...DEFAULT_THRESHOLDS, gpuMemoryWarnBytes: 1000 } })
    const f = atlasChecks(c)
    const unused = f.find((x) => x.code === 'atlas.region-unused')
    expect(unused?.detail).toBe('leftover')
    expect(f.find((x) => x.code === 'atlas.occupancy-low')?.severity).toBe('warning')
    expect(f.find((x) => x.code === 'atlas.texture-format')?.hint).toContain('WebP')
    expect(f.find((x) => x.code === 'atlas.gpu-memory')?.severity).toBe('warning')
  })
  it('warns on too many pages and reports parse errors', () => {
    const c = ctx('a.png\nsize: 8,8\nr\nbounds: 0,0,8,8\n\nb.png\nsize: 8,8\nr2\nbounds: 0,0,8,8\n\nc.png\nsize: x,8\nr3\nbounds: 0,0,8,8\n', { images: new Map([img('a.png', 8, 8), img('b.png', 8, 8), img('c.png', 8, 8)]) })
    const f = atlasChecks(c)
    expect(f.find((x) => x.code === 'atlas.pages')?.severity).toBe('warning')
    expect(f.find((x) => x.code === 'atlas.parse-error')?.severity).toBe('error')
  })
})
