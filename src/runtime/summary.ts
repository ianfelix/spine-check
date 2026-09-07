import { BlendMode, type SkeletonData } from '@esotericsoftware/spine-core'
import type { SkeletonSummary } from '../core/types'

export function summaryFromRuntime(data: SkeletonData): SkeletonSummary {
  return {
    version: data.version ?? undefined,
    hash: data.hash ?? undefined,
    bones: data.bones.length,
    slots: data.slots.length,
    skins: data.skins.map((s) => s.name),
    animations: data.animations.map((a) => a.name),
    events: data.events.map((e) => e.name),
    size: { x: data.x, y: data.y, width: data.width, height: data.height },
    slotTable: data.slots.map((s) => ({ name: s.name, bone: s.boneData.name, attachment: s.attachmentName ?? undefined, blend: BlendMode[s.blendMode].toLowerCase() })),
  }
}
