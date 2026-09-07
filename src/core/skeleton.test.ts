import { describe, expect, it } from 'vitest'
import type { SkeletonDoc } from './types'
import { DOC } from './__fixtures__/doc'
import {
  animationNames, attachmentsOf, blendModes, clippingAttachments, deformTimelineCount, emptyAnimations,
  emptySkins, eventsKeyed, hasNonessential, meshStats, parseSkeleton, regionNamesOf, regionNamesUsed,
  skinsOf, summaryOf, unusedBones, unusedSlots, versionMajorMinor,
} from './skeleton'

describe('parseSkeleton', () => {
  it('parses and measures pretty-print ratio', () => {
    const pretty = JSON.stringify(DOC, null, 2)
    const r = parseSkeleton(pretty)
    expect(r.doc?.skeleton?.spine).toBe('4.2.43')
    expect(r.prettyRatio).toBeGreaterThan(1.15)
    expect(parseSkeleton(JSON.stringify(DOC)).prettyRatio).toBe(1)
  })
  it('reports parse errors', () => {
    const r = parseSkeleton('{ nope')
    expect(r.doc).toBeUndefined()
    expect(r.error).toBeTruthy()
  })
})

describe('derivations', () => {
  it('normalizes 3.7 object skins', () => {
    const old = { skins: { default: { s: { a: {} } } } } as unknown as SkeletonDoc
    expect(skinsOf(old)).toEqual([{ name: 'default', attachments: { s: { a: {} } } }])
    expect(skinsOf(DOC).map((s) => s.name)).toEqual(['default', 'ghost'])
  })
  it('versionMajorMinor', () => {
    expect(versionMajorMinor('4.2.43')).toBe('4.2')
    expect(versionMajorMinor('3.8.99-beta')).toBe('3.8')
    expect(versionMajorMinor(undefined)).toBeUndefined()
  })
  it('lists attachments with resolved names and types', () => {
    const refs = attachmentsOf(DOC)
    expect(refs.map((r) => `${r.skin}/${r.slot}/${r.name}:${r.type}`)).toEqual([
      'default/body/body:region', 'default/body/sword:mesh', 'default/body/mask:clipping', 'default/arm/arm:region', 'default/arm/fx:region',
    ])
  })
  it('expands region names including sequences and skips non-region types', () => {
    const refs = attachmentsOf(DOC)
    expect(regionNamesOf(refs[0])).toEqual(['body'])
    expect(regionNamesOf(refs[1])).toEqual(['weapons/sword'])
    expect(regionNamesOf(refs[2])).toEqual([])
    expect(regionNamesOf(refs[4])).toEqual(['fx01', 'fx02'])
    expect([...regionNamesUsed(DOC).keys()].sort()).toEqual(['arm_img', 'body', 'fx01', 'fx02', 'weapons/sword'])
  })
  it('finds unused bones, keeping constraint targets and ancestors', () => {
    expect(unusedBones(DOC)).toEqual(['stray'])
  })
  it('keeps bones referenced only by weighted mesh vertices', () => {
    const doc: SkeletonDoc = {
      bones: [{ name: 'root' }, { name: 'deform', parent: 'root' }, { name: 'idle', parent: 'root' }],
      slots: [{ name: 's', bone: 'root', attachment: 'm' }],
      skins: [{ name: 'default', attachments: { s: { m: { type: 'mesh', uvs: [0, 0, 1, 0, 1, 1], triangles: [0, 1, 2], vertices: [1, 1, 0, 0, 1, 1, 1, 5, 0, 1, 1, 0, 5, 5, 1] } } } }],
    }
    expect(unusedBones(doc)).toEqual(['idle'])
  })
  it('finds unused slots and empty skins/animations', () => {
    expect(unusedSlots(DOC)).toEqual(['empty'])
    expect(emptySkins(DOC)).toEqual(['ghost'])
    expect(animationNames(DOC)).toEqual(['idle', 'backup/old_walk'])
    expect(emptyAnimations(DOC)).toEqual(['backup/old_walk'])
  })
  it('maps events to animations', () => {
    const m = eventsKeyed(DOC)
    expect(m.get('hit')).toEqual(['idle'])
    expect(m.has('never')).toBe(false)
  })
  it('collects mesh, clipping, blend and deform stats', () => {
    expect(meshStats(DOC)).toEqual([{ skin: 'default', slot: 'body', name: 'sword', vertices: 4, triangles: 2 }])
    expect(clippingAttachments(DOC).map((c) => c.name)).toEqual(['mask'])
    expect(blendModes(DOC)).toEqual([{ slot: 'arm', blend: 'additive' }])
    expect(deformTimelineCount(DOC)).toBe(1)
  })
  it('detects nonessential data and builds a summary', () => {
    expect(hasNonessential(DOC)).toBe(true)
    expect(hasNonessential({ skeleton: { spine: '4.2.1' }, bones: [{ name: 'root' }] })).toBe(false)
    const s = summaryOf(DOC)
    expect(s).toMatchObject({ version: '4.2.43', hash: 'abc', bones: 5, slots: 3, skins: ['default', 'ghost'], animations: ['idle', 'backup/old_walk'], events: ['hit', 'never'] })
    expect(s.size).toEqual({ x: -50, y: 0, width: 100, height: 200 })
    expect(s.slotTable[1]).toEqual({ name: 'arm', bone: 'arm', attachment: undefined, blend: 'additive' })
  })
})
