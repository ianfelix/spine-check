import { describe, expect, it } from 'vitest'
import { AtlasAttachmentLoader, SkeletonJson, TextureAtlas } from '@esotericsoftware/spine-core'
import { summaryFromRuntime } from './summary'

const ATLAS = 'dot.png\nsize: 8,8\nfilter: Linear,Linear\ndot\nbounds: 0,0,8,8\n'
const DOC = {
  skeleton: { hash: 'h1', spine: '4.2.43', x: -40, y: -40, width: 80, height: 80 },
  bones: [{ name: 'root' }, { name: 'dot', parent: 'root', scaleX: 10, scaleY: 10 }],
  slots: [{ name: 'dot', bone: 'dot', attachment: 'dot', blend: 'additive' }, { name: 'empty', bone: 'root' }],
  skins: [{ name: 'default', attachments: { dot: { dot: { width: 8, height: 8 } } } }],
  events: { beat: {} },
  animations: { pulse: { bones: { dot: { scale: [{ x: 10, y: 10 }, { time: 1, x: 14, y: 14 }] } } } },
}

describe('summaryFromRuntime', () => {
  it('mirrors the JSON summary shape from runtime data', () => {
    const data = new SkeletonJson(new AtlasAttachmentLoader(new TextureAtlas(ATLAS))).readSkeletonData(DOC)
    const s = summaryFromRuntime(data)
    expect(s).toMatchObject({ version: '4.2.43', hash: 'h1', bones: 2, slots: 2, skins: ['default'], animations: ['pulse'], events: ['beat'] })
    expect(s.size).toEqual({ x: -40, y: -40, width: 80, height: 80 })
    expect(s.slotTable).toEqual([
      { name: 'dot', bone: 'dot', attachment: 'dot', blend: 'additive' },
      { name: 'empty', bone: 'root', attachment: undefined, blend: 'normal' },
    ])
  })
  it('surfaces the runtime error for a missing region', () => {
    const bad = { ...DOC, skins: [{ name: 'default', attachments: { dot: { dot: { path: 'nope', width: 8, height: 8 } } } }] }
    expect(() => new SkeletonJson(new AtlasAttachmentLoader(new TextureAtlas(ATLAS))).readSkeletonData(bad)).toThrow(/Region not found in atlas/)
  })
})
