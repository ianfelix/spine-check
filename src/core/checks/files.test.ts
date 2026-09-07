import { describe, expect, it } from 'vitest'
import type { CheckContext, FileRef, SpineBundle } from '../types'
import { DEFAULT_THRESHOLDS } from '../settings'
import { parseAtlas } from '../atlas'
import { filesChecks } from './files'

const fr = (name: string): FileRef => ({ path: `d/${name}`, name, size: 10, file: {} as File })
const bundle = (over: Partial<SpineBundle> = {}): SpineBundle => ({
  dir: 'd', name: 'hero', key: 'd/hero', json: fr('hero.json'), atlas: fr('hero.atlas'), textures: [fr('hero.png')], variants: [], unreferencedTextures: [], ...over,
})
const ctx = (over: Partial<CheckContext> = {}): CheckContext => ({
  bundle: bundle(), atlas: parseAtlas('hero.png\nsize: 4,4\nr\nbounds: 0,0,4,4\n'), images: new Map(), variants: [], settings: DEFAULT_THRESHOLDS, ...over,
})
const codes = (ctx: CheckContext) => filesChecks(ctx).map((f) => f.code)

describe('filesChecks', () => {
  it('is quiet for a complete bundle', () => { expect(codes(ctx())).toEqual([]) })
  it('flags missing atlas / skeleton', () => {
    expect(codes(ctx({ bundle: bundle({ atlas: undefined }), atlas: undefined }))).toEqual(['files.atlas-missing'])
    expect(codes(ctx({ bundle: bundle({ json: undefined }) }))).toEqual(['files.skeleton-missing'])
  })
  it('notes json+skel and skel-only', () => {
    expect(codes(ctx({ bundle: bundle({ skel: fr('hero.skel') }) }))).toEqual(['files.json-and-skel'])
    expect(codes(ctx({ bundle: bundle({ json: undefined, skel: fr('hero.skel') }) }))).toEqual(['files.skel-only'])
  })
  it('flags missing and case-mismatched textures', () => {
    expect(codes(ctx({ bundle: bundle({ textures: [] }) }))).toEqual(['files.texture-missing'])
    const f = filesChecks(ctx({ bundle: bundle({ textures: [fr('Hero.PNG')] }) }))
    expect(f[0].code).toBe('files.texture-case-mismatch')
    expect(f[0].severity).toBe('warning')
    expect(f[1].code).toBe('files.name-unsafe')
  })
  it('reports unreferenced textures and unsafe names', () => {
    const f = filesChecks(ctx({ bundle: bundle({ name: 'Hero Final', unreferencedTextures: [fr('old.png')] }) }))
    expect(f.map((x) => x.code)).toEqual(['files.texture-unreferenced', 'files.name-unsafe'])
  })
})
