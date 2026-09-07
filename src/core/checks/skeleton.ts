import type { CheckContext, Finding } from '../types'
import {
  animationNames, attachmentsOf, blendModes, clippingAttachments, deformTimelineCount, emptyAnimations, emptySkins,
  eventsKeyed, hasNonessential, meshStats, regionNamesOf, skinsOf, summaryOf, unusedBones, unusedSlots, versionMajorMinor,
} from '../skeleton'
import { finding, fmtBytes, listPreview, pct } from './util'

export function skeletonChecks(ctx: CheckContext): Finding[] {
  const s = { bundle: ctx.bundle }
  const out: Finding[] = []
  if (ctx.skeletonError) {
    out.push(finding(s, 'skeleton.json-invalid', 'error', 'Skeleton JSON is invalid.', { detail: ctx.skeletonError, hint: 'Re-export the skeleton; the file is corrupted or truncated.' }))
    return out
  }
  const doc = ctx.skeleton
  if (!doc) return out
  const settings = ctx.settings

  const version = versionMajorMinor(doc.skeleton?.spine)
  if (!version) out.push(finding(s, 'skeleton.version-unknown', 'warning', 'Spine version missing from the skeleton header.', { hint: 'Normal exports write "spine" in the header; check the export tool.' }))
  else if (version !== settings.runtimeVersion) out.push(finding(s, 'skeleton.version-mismatch', 'error', `Exported with Spine ${doc.skeleton?.spine}; target runtime is ${settings.runtimeVersion}.`, { hint: 'Re-export with the runtime version or upgrade the game runtime. Major.minor must match.' }))

  if (ctx.atlas) {
    const names = new Set(ctx.atlas.regions.map((r) => r.name))
    for (const ref of attachmentsOf(doc)) {
      const missing = regionNamesOf(ref).filter((n) => !names.has(n))
      if (!missing.length) continue
      const more = missing.length > 1 ? ` · ${missing.length} regions missing: ${listPreview(missing, 5)}` : ''
      out.push(finding(s, 'skeleton.region-missing', 'error', `Attachment "${ref.name}" references region "${missing[0]}", which does not exist in the atlas.`, { detail: `slot ${ref.slot} · skin ${ref.skin} · type ${ref.type}${more}`, hint: 'Re-export the atlas with the image included or fix the attachment path. The runtime throws "Region not found in atlas".', subject: { kind: 'attachment', name: ref.name } }))
    }
  }

  for (const a of emptyAnimations(doc)) out.push(finding(s, 'skeleton.empty-animation', 'warning', `Animation "${a}" has no timelines.`, { hint: 'Remove the animation or animate something in it.', subject: { kind: 'animation', name: a } }))

  const patterns = settings.suspiciousPatterns.map((p) => p.toLowerCase())
  const suspicious = (name: string) => name.toLowerCase().split('/').some((seg) => patterns.some((p) => seg === p || seg.startsWith(p + '_') || seg.startsWith(p + '-') || seg.endsWith('_' + p) || seg.endsWith('-' + p)))
  for (const a of animationNames(doc)) if (suspicious(a)) out.push(finding(s, 'skeleton.suspicious-name', 'info', `Animation "${a}" looks like a leftover.`, { hint: 'Confirm it belongs in the export; extra animations make the file bigger.', subject: { kind: 'animation', name: a } }))
  for (const sk of skinsOf(doc)) if (suspicious(sk.name)) out.push(finding(s, 'skeleton.suspicious-name', 'info', `Skin "${sk.name}" looks like a leftover.`, { subject: { kind: 'skin', name: sk.name } }))

  const bones = unusedBones(doc)
  if (bones.length) out.push(finding(s, 'skeleton.unused-bone', 'warning', `${bones.length} unused bone(s).`, { detail: listPreview(bones), hint: 'Bones with no slot, children, constraint or animation only add file size and update cost.' }))
  const slots = unusedSlots(doc)
  if (slots.length) out.push(finding(s, 'skeleton.unused-slot', 'warning', `${slots.length} slot(s) with no attachment in any skin.`, { detail: listPreview(slots), hint: 'Remove the slot or check whether the image was left out of the export.' }))
  for (const sk of emptySkins(doc)) out.push(finding(s, 'skeleton.empty-skin', 'warning', `Skin "${sk}" is empty.`, { subject: { kind: 'skin', name: sk } }))

  const keyed = eventsKeyed(doc)
  const unkeyed = Object.keys(doc.events ?? {}).filter((ev) => !keyed.has(ev))
  if (unkeyed.length) out.push(finding(s, 'skeleton.event-unkeyed', 'warning', `${unkeyed.length} event(s) defined but never fired by any animation.`, { detail: listPreview(unkeyed), hint: 'The game may be waiting for these events; key them or remove them from the skeleton.' }))
  if (keyed.size) out.push(finding(s, 'skeleton.events', 'info', `${keyed.size} event(s) fired by animations.`, { detail: [...keyed].map(([e, anims]) => `${e}: ${anims.join(', ')}`).join('\n') }))

  const clips = clippingAttachments(doc)
  if (clips.length) out.push(finding(s, 'skeleton.clipping', 'warning', `${clips.length} clipping attachment(s).`, { detail: listPreview(clips.map((c) => `${c.slot}/${c.name}`)), hint: 'Clipping is expensive on mobile; prefer mesh masks or cropping in the art.' }))

  const meshes = meshStats(doc)
  for (const m of meshes) if (m.vertices > settings.meshVerticesWarn) out.push(finding(s, 'skeleton.mesh-heavy', 'warning', `Mesh "${m.name}" has ${m.vertices} vertices.`, { detail: `slot ${m.slot} · skin ${m.skin}`, hint: 'Reduce vertices; above 1000 rarely pays off.', subject: { kind: 'attachment', name: m.name } }))
  const triangles = meshes.reduce((n, m) => n + m.triangles, 0)
  if (meshes.length) out.push(finding(s, 'skeleton.triangles-total', triangles > settings.trianglesWarn ? 'warning' : 'info', `${meshes.length} mesh(es), ${triangles} triangles in total.`))
  const deform = deformTimelineCount(doc)
  if (deform > settings.deformWarn) out.push(finding(s, 'skeleton.deform-heavy', 'info', `${deform} deform timelines.`, { hint: 'Per-vertex deform is the most expensive timeline; prefer weighted bones.' }))

  const ik = doc.ik?.length ?? 0, transform = doc.transform?.length ?? 0, path = doc.path?.length ?? 0, physics = doc.physics?.length ?? 0
  if (ik + transform + path + physics) out.push(finding(s, 'skeleton.constraints', 'info', `Constraints: ${ik} IK, ${transform} transform, ${path} path, ${physics} physics.`))
  const blends = blendModes(doc)
  if (blends.length) out.push(finding(s, 'skeleton.blend-modes', 'info', `${blends.length} slot(s) with a blend mode other than normal.`, { detail: listPreview(blends.map((b) => `${b.slot} (${b.blend})`)), hint: 'Every blend-mode switch breaks the render batch.' }))

  const sum = summaryOf(doc)
  out.push(finding(s, 'skeleton.counts', 'info', `${sum.bones} bones · ${sum.slots} slots · ${sum.skins.length} skins · ${sum.animations.length} animations · ${attachmentsOf(doc).length} attachments.`))
  const big = Math.max(sum.size.width, sum.size.height)
  out.push(finding(s, 'skeleton.size', big > settings.skeletonSizeWarn ? 'warning' : 'info', `Declared size ${Math.round(sum.size.width)}×${Math.round(sum.size.height)} (x ${Math.round(sum.size.x)}, y ${Math.round(sum.size.y)}).`, big > settings.skeletonSizeWarn ? { hint: 'Art is very large for the target resolution; check the export scale.' } : {}))
  if (hasNonessential(doc)) out.push(finding(s, 'skeleton.nonessential', 'info', 'Export includes nonessential data (image/audio paths, bone colors).', { hint: 'Disable "Nonessential data" in the export to shrink the file.' }))
  const ratio = ctx.prettyRatio ?? 1
  if (ratio > 1.15) out.push(finding(s, 'skeleton.pretty-printed', 'info', `JSON is pretty-printed (+${pct(ratio - 1)} in size).`, { hint: 'Disable "Pretty print" in the export.' }))
  if (ctx.bundle.json && ctx.bundle.json.size > 512 * 1024) out.push(finding(s, 'skeleton.binary-hint', 'info', `JSON is ${fmtBytes(ctx.bundle.json.size)}.`, { hint: 'Binary export (.skel) loads faster and is smaller.' }))
  return out
}
