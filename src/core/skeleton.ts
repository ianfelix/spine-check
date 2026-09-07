import type { SkeletonAttachment, SkeletonDoc, SkeletonSkin, SkeletonSummary } from './types'

export interface ParsedSkeleton { doc?: SkeletonDoc; error?: string; prettyRatio: number }
export interface AttachmentRef { skin: string; slot: string; name: string; type: string; att: SkeletonAttachment }
export interface MeshStat { skin: string; slot: string; name: string; vertices: number; triangles: number }

const REGION_TYPES = new Set(['region', 'mesh', 'linkedmesh'])

export function parseSkeleton(text: string): ParsedSkeleton {
  try {
    const doc = JSON.parse(text) as SkeletonDoc
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { error: 'JSON is not an object', prettyRatio: 1 }
    const minified = JSON.stringify(doc).length
    return { doc, prettyRatio: minified ? text.length / minified : 1 }
  } catch (e) {
    return { error: (e as Error).message, prettyRatio: 1 }
  }
}

export function skinsOf(doc: SkeletonDoc): SkeletonSkin[] {
  const s = doc.skins
  if (!s) return []
  if (Array.isArray(s)) return s
  return Object.entries(s).map(([name, attachments]) => ({ name, attachments }))
}

export function versionMajorMinor(v?: string): string | undefined {
  const m = v?.match(/^(\d+)\.(\d+)/)
  return m ? `${m[1]}.${m[2]}` : undefined
}

export function attachmentsOf(doc: SkeletonDoc): AttachmentRef[] {
  const out: AttachmentRef[] = []
  for (const skin of skinsOf(doc)) {
    for (const [slot, atts] of Object.entries(skin.attachments ?? {})) {
      for (const [key, att] of Object.entries(atts ?? {})) {
        out.push({ skin: skin.name, slot, name: att.name ?? key, type: att.type ?? 'region', att })
      }
    }
  }
  return out
}

export function regionNamesOf(ref: AttachmentRef): string[] {
  if (!REGION_TYPES.has(ref.type)) return []
  const base = ref.att.path ?? ref.name
  const seq = ref.att.sequence
  if (!seq) return [base]
  const start = seq.start ?? 1
  const digits = seq.digits ?? 0
  return Array.from({ length: seq.count }, (_, i) => base + String(start + i).padStart(digits, '0'))
}

export function regionNamesUsed(doc: SkeletonDoc): Map<string, AttachmentRef[]> {
  const map = new Map<string, AttachmentRef[]>()
  for (const ref of attachmentsOf(doc)) {
    for (const name of regionNamesOf(ref)) {
      const list = map.get(name) ?? []
      list.push(ref)
      map.set(name, list)
    }
  }
  return map
}

/** Bone indices referenced by weighted vertices (`[count, boneIndex, x, y, weight, …]`). */
export function weightedBoneIndices(att: SkeletonAttachment): number[] {
  const v = att.vertices
  if (!v) return []
  const count = att.type === 'mesh' || att.type === 'linkedmesh' ? (att.uvs?.length ?? 0) / 2 : (att.vertexCount ?? 0)
  if (!count || v.length === count * 2) return []
  const out: number[] = []
  let i = 0
  while (i < v.length) {
    const n = v[i++]
    for (let k = 0; k < n && i < v.length; k++) { out.push(v[i]); i += 4 }
  }
  return out
}

export function unusedBones(doc: SkeletonDoc): string[] {
  const bones = doc.bones ?? []
  if (!bones.length) return []
  const parent = new Map(bones.map((b) => [b.name, b.parent]))
  const used = new Set<string>([bones[0].name])
  const mark = (name?: string) => {
    let n = name
    while (n && !used.has(n)) { used.add(n); n = parent.get(n) }
  }
  for (const s of doc.slots ?? []) mark(s.bone)
  for (const ref of attachmentsOf(doc)) for (const idx of weightedBoneIndices(ref.att)) mark(bones[idx]?.name)
  for (const list of [doc.ik, doc.transform, doc.path, doc.physics]) {
    for (const c of list ?? []) {
      c.bones?.forEach(mark)
      if (typeof c.target === 'string') mark(c.target)
      if (typeof c.bone === 'string') mark(c.bone)
    }
  }
  for (const skin of skinsOf(doc)) skin.bones?.forEach(mark)
  for (const a of Object.values(doc.animations ?? {})) Object.keys(a?.bones ?? {}).forEach(mark)
  return bones.filter((b) => !used.has(b.name)).map((b) => b.name)
}

export function unusedSlots(doc: SkeletonDoc): string[] {
  const withAttachment = new Set<string>()
  for (const skin of skinsOf(doc)) {
    for (const [slot, atts] of Object.entries(skin.attachments ?? {})) if (Object.keys(atts ?? {}).length) withAttachment.add(slot)
  }
  return (doc.slots ?? []).filter((s) => !withAttachment.has(s.name)).map((s) => s.name)
}

export function emptySkins(doc: SkeletonDoc): string[] {
  return skinsOf(doc)
    .filter((s) => s.name !== 'default' && !Object.values(s.attachments ?? {}).some((a) => Object.keys(a ?? {}).length))
    .map((s) => s.name)
}

export function animationNames(doc: SkeletonDoc): string[] {
  return Object.keys(doc.animations ?? {})
}

function sectionHasContent(section: unknown): boolean {
  if (!section) return false
  if (Array.isArray(section)) return section.length > 0
  return typeof section === 'object' && Object.keys(section as object).length > 0
}

export function emptyAnimations(doc: SkeletonDoc): string[] {
  return Object.entries(doc.animations ?? {})
    .filter(([, a]) => !a || !Object.values(a).some(sectionHasContent))
    .map(([name]) => name)
}

export function eventsKeyed(doc: SkeletonDoc): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const [anim, a] of Object.entries(doc.animations ?? {})) {
    for (const e of a?.events ?? []) {
      const list = map.get(e.name) ?? []
      if (!list.includes(anim)) list.push(anim)
      map.set(e.name, list)
    }
  }
  return map
}

export function meshStats(doc: SkeletonDoc): MeshStat[] {
  return attachmentsOf(doc)
    .filter((r) => r.type === 'mesh')
    .map((r) => ({ skin: r.skin, slot: r.slot, name: r.name, vertices: (r.att.uvs?.length ?? 0) / 2, triangles: (r.att.triangles?.length ?? 0) / 3 }))
}

export function clippingAttachments(doc: SkeletonDoc): AttachmentRef[] {
  return attachmentsOf(doc).filter((r) => r.type === 'clipping')
}

export function blendModes(doc: SkeletonDoc): Array<{ slot: string; blend: string }> {
  return (doc.slots ?? []).filter((s) => s.blend && s.blend !== 'normal').map((s) => ({ slot: s.name, blend: s.blend as string }))
}

export function deformTimelineCount(doc: SkeletonDoc): number {
  let n = 0
  for (const a of Object.values(doc.animations ?? {})) {
    for (const slots of Object.values(a?.attachments ?? {})) {
      for (const atts of Object.values(slots)) {
        for (const timelines of Object.values(atts)) if (timelines && 'deform' in timelines) n++
      }
    }
  }
  return n
}

export function hasNonessential(doc: SkeletonDoc): boolean {
  const h = doc.skeleton ?? {}
  if (h.images !== undefined || h.audio !== undefined || h.fps !== undefined) return true
  return (doc.bones ?? []).some((b) => b.color !== undefined || b.icon !== undefined)
}

export function summaryOf(doc: SkeletonDoc): SkeletonSummary {
  const h = doc.skeleton ?? {}
  return {
    version: h.spine,
    hash: h.hash,
    bones: (doc.bones ?? []).length,
    slots: (doc.slots ?? []).length,
    skins: skinsOf(doc).map((s) => s.name),
    animations: animationNames(doc),
    events: Object.keys(doc.events ?? {}),
    size: { x: h.x ?? 0, y: h.y ?? 0, width: h.width ?? 0, height: h.height ?? 0 },
    slotTable: (doc.slots ?? []).map((s) => ({ name: s.name, bone: s.bone, attachment: s.attachment, blend: s.blend ?? 'normal' })),
  }
}
