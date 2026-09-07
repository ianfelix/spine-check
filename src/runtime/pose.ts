import type { Skeleton } from '@esotericsoftware/spine-core'

export interface PoseSnapshot {
  bones: Array<{ name: string; m: [number, number, number, number, number, number] }>
  slots: Array<{ name: string; attachment: string | null; color: [number, number, number, number] }>
  drawOrder: string[]
}

export function snapshotPose(skeleton: Skeleton): PoseSnapshot {
  return {
    bones: skeleton.bones.map((b) => ({ name: b.data.name, m: [b.a, b.b, b.c, b.d, b.worldX, b.worldY] })),
    slots: skeleton.slots.map((s) => ({ name: s.data.name, attachment: s.getAttachment()?.name ?? null, color: [s.color.r, s.color.g, s.color.b, s.color.a] })),
    drawOrder: skeleton.drawOrder.map((s) => s.data.name),
  }
}

export function diffPose(a: PoseSnapshot, b: PoseSnapshot, eps = 1e-3): string[] {
  const out: string[] = []
  a.bones.forEach((bone, i) => {
    const o = b.bones[i]
    if (!o || bone.m.some((v, k) => Math.abs(v - o.m[k]) > eps)) out.push(`bone ${bone.name}`)
  })
  a.slots.forEach((slot, i) => {
    const o = b.slots[i]
    if (!o || slot.attachment !== o.attachment || slot.color.some((v, k) => Math.abs(v - o.color[k]) > eps)) out.push(`slot ${slot.name}`)
  })
  if (a.drawOrder.join('|') !== b.drawOrder.join('|')) out.push('draw order')
  return out
}

export function hasNaN(skeleton: Skeleton): boolean {
  return skeleton.bones.some((b) => [b.a, b.b, b.c, b.d, b.worldX, b.worldY].some((v) => Number.isNaN(v)))
}
