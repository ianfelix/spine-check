import { describe, expect, it } from 'vitest'
import type { InputFile } from './types'
import { groupBundles, splitPath } from './bundle'

const mk = (path: string): InputFile => {
  const { name, ext } = splitPath(path)
  return { path, name, ext, size: 1, file: {} as File }
}

const ROOT_ATLAS = 'player.webp\nsize: 8,8\nfilter: Linear,Linear\na\nbounds: 0,0,4,4\n\nplayer_2.webp\nsize: 8,8\nfilter: Linear,Linear\nb\nbounds: 0,0,4,4\n'
const HALF_ATLAS = 'player.webp\nsize: 4,4\nfilter: Linear,Linear\nscale: 0.5\na\nbounds: 0,0,2,2\n'

const FILES = [
  'game/player.json', 'game/player.atlas', 'game/player.webp', 'game/player_2.WEBP', 'game/stray.png', 'game/notes.txt',
  'game/@0.5x/player.json', 'game/@0.5x/player.atlas', 'game/@0.5x/player.webp',
  'other/@2x/solo.json', 'other/@2x/solo.atlas',
].map(mk)

const TEXTS = new Map([
  ['game/player.atlas', ROOT_ATLAS],
  ['game/@0.5x/player.atlas', HALF_ATLAS],
  ['other/@2x/solo.atlas', 'solo.png\nsize: 2,2\nfilter: Linear,Linear\nscale: 2\ns\nbounds: 0,0,2,2\n'],
])

describe('splitPath', () => {
  it('splits dir, name, base and lowercase ext', () => {
    expect(splitPath('a/b/Player.JSON')).toEqual({ dir: 'a/b', name: 'Player.JSON', base: 'Player', ext: 'json' })
    expect(splitPath('solo.atlas')).toEqual({ dir: '', name: 'solo.atlas', base: 'solo', ext: 'atlas' })
    expect(splitPath('./x\\y.png').dir).toBe('x')
  })
})

describe('groupBundles', () => {
  const { bundles, ignored } = groupBundles(FILES, TEXTS)

  it('groups skeleton, atlas and atlas-declared textures by basename', () => {
    expect(bundles.map((b) => b.key)).toEqual(['game/player', 'other/@2x/solo'])
    const p = bundles[0]
    expect(p.name).toBe('player')
    expect(p.json?.path).toBe('game/player.json')
    expect(p.atlas?.path).toBe('game/player.atlas')
    expect(p.textures.map((t) => t.name)).toEqual(['player.webp', 'player_2.WEBP'])
  })

  it('attaches @0.5x as a variant of the root bundle', () => {
    const v = bundles[0].variants
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ factor: 0.5, label: '@0.5x', dir: 'game/@0.5x' })
    expect(v[0].textures.map((t) => t.path)).toEqual(['game/@0.5x/player.webp'])
  })

  it('keeps a variant without root as its own bundle', () => {
    expect(bundles[1]).toMatchObject({ name: 'solo', dir: 'other/@2x', variants: [] })
  })

  it('reports unreferenced textures on the first bundle of the folder and ignores unknown files', () => {
    expect(bundles[0].unreferencedTextures.map((t) => t.name)).toEqual(['stray.png'])
    expect(ignored.map((f) => f.name)).toEqual(['notes.txt'])
  })

  it('keeps a skeleton without atlas and an atlas without skeleton as bundles', () => {
    const r = groupBundles([mk('a/x.json'), mk('a/y.atlas')], new Map([['a/y.atlas', 'y.png\nsize: 1,1\n']]))
    expect(r.bundles.map((b) => [b.name, !!b.json, !!b.atlas])).toEqual([['x', true, false], ['y', false, true]])
  })
})
