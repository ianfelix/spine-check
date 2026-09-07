import { describe, expect, it } from 'vitest'
import { AtlasAttachmentLoader, SkeletonJson, TextureAtlas } from '@esotericsoftware/spine-core'
import { DEFAULT_THRESHOLDS } from '../core/settings'
import { probeSkeleton } from './probe'

const ATLAS = 'dot.png\nsize: 8,8\nfilter: Linear,Linear\ndot\nbounds: 0,0,8,8\n'
const DOC = {
  skeleton: { spine: '4.2.43', x: -40, y: -40, width: 80, height: 80 },
  bones: [{ name: 'root' }, { name: 'dot', parent: 'root', scaleX: 10, scaleY: 10 }],
  slots: [{ name: 'dot', bone: 'dot', attachment: 'dot' }],
  skins: [{ name: 'default', attachments: { dot: { dot: { width: 8, height: 8 } } } }],
  events: { beat: {} },
  animations: {
    pulse: { bones: { dot: { scale: [{ x: 10, y: 10 }, { time: 0.5, x: 14, y: 14 }, { time: 1, x: 10, y: 10 }] } }, events: [{ time: 0.5, name: 'beat' }] },
    slide: { bones: { dot: { translate: [{ x: 0, y: 0 }, { time: 1, x: 60, y: 0 }] } } },
  },
}

const load = () => {
  const atlas = new TextureAtlas(ATLAS)
  const skeletonData = new SkeletonJson(new AtlasAttachmentLoader(atlas)).readSkeletonData(DOC)
  return { skeletonData, atlas, pma: false, dispose() {} }
}

describe('probeSkeleton', () => {
  it('measures duration, events, seam and bounds per animation', async () => {
    const { animations, findings } = await probeSkeleton(load(), 'dot', DEFAULT_THRESHOLDS)
    expect(findings).toEqual([])
    const pulse = animations.find((a) => a.name === 'pulse')!
    expect(pulse.duration).toBe(1)
    expect(pulse.events).toEqual([{ name: 'beat', time: 0.5 }])
    expect(pulse.seamless).toBe(true)
    expect(pulse.bounds.width).toBeCloseTo(1120, 0)
    expect(pulse.nan).toBe(false)
    const slide = animations.find((a) => a.name === 'slide')!
    expect(slide.seamless).toBe(false)
    expect(slide.seamDiff).toEqual(['bone dot'])
    expect(slide.bounds.width).toBeCloseTo(140, 0)
  })
  it('subsamples when the step budget is exceeded', async () => {
    const done: number[] = []
    const r = await probeSkeleton(load(), 'dot', { ...DEFAULT_THRESHOLDS, probeMaxSteps: 10 }, (d) => done.push(d))
    expect(r.findings.map((f) => f.code)).toEqual(['runtime.probe-subsampled'])
    expect(done).toEqual([1, 2])
  })
})
