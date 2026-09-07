import { describe, expect, it } from 'vitest'
import { parseAtlas } from './atlas'

const ATLAS_4X = `
player.png
size: 1024,512
filter: Linear,Linear
pma: true
scale: 0.5
body
	bounds: 2, 2, 100, 200
	rotate: 90
arm_img
	bounds: 104, 2, 50, 60
	offsets: 1, 1, 52, 62
	index: -1
`

const ATLAS_3X = `
old.png
size: 256,256
format: RGBA8888
filter: Linear,Linear
repeat: none
head
  rotate: true
  xy: 2, 2
  size: 64, 64
  orig: 66, 66
  offset: 1, 1
  index: -1
`

const ATLAS_2PAGES = 'a.png\nsize: 8,8\nfilter: Linear,Linear\nr1\nbounds: 0,0,4,4\n\nb.png\nsize: 8,8\nfilter: Linear,Linear\nr2\nbounds: 0,0,8,8\n'

describe('parseAtlas', () => {
  it('reads 4.x page headers and regions', () => {
    const a = parseAtlas(ATLAS_4X)
    expect(a.errors).toEqual([])
    expect(a.pages).toHaveLength(1)
    const p = a.pages[0]
    expect(p.name).toBe('player.png')
    expect([p.width, p.height]).toEqual([1024, 512])
    expect([p.minFilter, p.magFilter]).toEqual(['Linear', 'Linear'])
    expect(p.pma).toBe(true)
    expect(p.scale).toBe(0.5)
    expect(a.regions.map((r) => r.name)).toEqual(['body', 'arm_img'])
    const body = a.regions[0]
    expect([body.x, body.y, body.width, body.height, body.rotate]).toEqual([2, 2, 100, 200, 90])
    expect([body.originalWidth, body.originalHeight]).toEqual([100, 200])
    const arm = a.regions[1]
    expect([arm.offsetX, arm.offsetY, arm.originalWidth, arm.originalHeight, arm.index]).toEqual([1, 1, 52, 62, -1])
    expect(arm.page).toBe(0)
  })

  it('reads 3.x xy/size/orig/offset and rotate:true', () => {
    const a = parseAtlas(ATLAS_3X)
    const head = a.regions[0]
    expect([head.x, head.y, head.width, head.height]).toEqual([2, 2, 64, 64])
    expect([head.originalWidth, head.originalHeight, head.offsetX, head.offsetY]).toEqual([66, 66, 1, 1])
    expect(head.rotate).toBe(90)
    expect(a.pages[0].format).toBe('RGBA8888')
    expect(a.pages[0].pma).toBeUndefined()
  })

  it('splits pages on blank lines', () => {
    const a = parseAtlas(ATLAS_2PAGES)
    expect(a.pages.map((p) => p.name)).toEqual(['a.png', 'b.png'])
    expect(a.regions.map((r) => r.page)).toEqual([0, 1])
    expect(a.pages[1].regions[0].name).toBe('r2')
  })

  it('records invalid numbers without aborting', () => {
    const a = parseAtlas('x.png\nsize: big,8\nr\nbounds: 0,0,1,1\n')
    expect(a.errors).toHaveLength(1)
    expect(a.errors[0]).toMatch(/line 2/)
    expect(a.regions).toHaveLength(1)
  })

  it('flags an empty atlas', () => {
    expect(parseAtlas('   \n').errors).toContain('empty atlas')
  })
})
