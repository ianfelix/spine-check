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
    out.push(finding(s, 'skeleton.json-invalid', 'error', 'JSON do skeleton inválido.', { detail: ctx.skeletonError, hint: 'Reexporte o skeleton; o arquivo está corrompido ou truncado.' }))
    return out
  }
  const doc = ctx.skeleton
  if (!doc) return out
  const settings = ctx.settings

  const version = versionMajorMinor(doc.skeleton?.spine)
  if (!version) out.push(finding(s, 'skeleton.version-unknown', 'warning', 'Versão do Spine ausente no skeleton.', { hint: 'Exports normais gravam "spine" no cabeçalho; confira a ferramenta de export.' }))
  else if (version !== settings.runtimeVersion) out.push(finding(s, 'skeleton.version-mismatch', 'error', `Exportado no Spine ${doc.skeleton?.spine}; runtime alvo é ${settings.runtimeVersion}.`, { hint: 'Reexporte na versão do runtime ou atualize o runtime do jogo. Major.minor precisam bater.' }))

  if (ctx.atlas) {
    const names = new Set(ctx.atlas.regions.map((r) => r.name))
    for (const ref of attachmentsOf(doc)) {
      const missing = regionNamesOf(ref).filter((n) => !names.has(n))
      if (!missing.length) continue
      const more = missing.length > 1 ? ` · ${missing.length} regiões faltando: ${listPreview(missing, 5)}` : ''
      out.push(finding(s, 'skeleton.region-missing', 'error', `Attachment "${ref.name}" referencia região "${missing[0]}" inexistente no atlas.`, { detail: `slot ${ref.slot} · skin ${ref.skin} · tipo ${ref.type}${more}`, hint: 'Reexporte o atlas com a imagem incluída ou corrija o path do attachment. O runtime lança "Region not found in atlas".', subject: { kind: 'attachment', name: ref.name } }))
    }
  }

  for (const a of emptyAnimations(doc)) out.push(finding(s, 'skeleton.empty-animation', 'warning', `Animação "${a}" não tem timelines.`, { hint: 'Remova a animação ou anime algo nela.', subject: { kind: 'animation', name: a } }))

  const patterns = settings.suspiciousPatterns.map((p) => p.toLowerCase())
  const suspicious = (name: string) => name.toLowerCase().split('/').some((seg) => patterns.some((p) => seg === p || seg.startsWith(p + '_') || seg.startsWith(p + '-') || seg.endsWith('_' + p) || seg.endsWith('-' + p)))
  for (const a of animationNames(doc)) if (suspicious(a)) out.push(finding(s, 'skeleton.suspicious-name', 'info', `Animação "${a}" parece sobra de trabalho.`, { hint: 'Confirme se deveria estar no export; animações extras aumentam o arquivo.', subject: { kind: 'animation', name: a } }))
  for (const sk of skinsOf(doc)) if (suspicious(sk.name)) out.push(finding(s, 'skeleton.suspicious-name', 'info', `Skin "${sk.name}" parece sobra de trabalho.`, { subject: { kind: 'skin', name: sk.name } }))

  const bones = unusedBones(doc)
  if (bones.length) out.push(finding(s, 'skeleton.unused-bone', 'warning', `${bones.length} bone(s) sem uso.`, { detail: listPreview(bones), hint: 'Bones sem slot, filhos, constraint ou animação só pesam no arquivo e no update.' }))
  const slots = unusedSlots(doc)
  if (slots.length) out.push(finding(s, 'skeleton.unused-slot', 'warning', `${slots.length} slot(s) sem attachment em nenhuma skin.`, { detail: listPreview(slots), hint: 'Remova o slot ou confira se a imagem ficou fora do export.' }))
  for (const sk of emptySkins(doc)) out.push(finding(s, 'skeleton.empty-skin', 'warning', `Skin "${sk}" está vazia.`, { subject: { kind: 'skin', name: sk } }))

  const keyed = eventsKeyed(doc)
  const unkeyed = Object.keys(doc.events ?? {}).filter((ev) => !keyed.has(ev))
  if (unkeyed.length) out.push(finding(s, 'skeleton.event-unkeyed', 'warning', `${unkeyed.length} evento(s) definido(s) mas nunca disparado(s) em animação.`, { detail: listPreview(unkeyed), hint: 'O jogo pode esperar esses eventos; adicione as keys ou remova os eventos do skeleton.' }))
  if (keyed.size) out.push(finding(s, 'skeleton.events', 'info', `${keyed.size} evento(s) disparado(s) por animações.`, { detail: [...keyed].map(([e, anims]) => `${e}: ${anims.join(', ')}`).join('\n') }))

  const clips = clippingAttachments(doc)
  if (clips.length) out.push(finding(s, 'skeleton.clipping', 'warning', `${clips.length} clipping attachment(s).`, { detail: listPreview(clips.map((c) => `${c.slot}/${c.name}`)), hint: 'Clipping custa caro em mobile; prefira máscaras por mesh ou recorte na arte.' }))

  const meshes = meshStats(doc)
  for (const m of meshes) if (m.vertices > settings.meshVerticesWarn) out.push(finding(s, 'skeleton.mesh-heavy', 'warning', `Mesh "${m.name}" tem ${m.vertices} vértices.`, { detail: `slot ${m.slot} · skin ${m.skin}`, hint: 'Reduza vértices; acima de 1000 raramente compensa.', subject: { kind: 'attachment', name: m.name } }))
  const triangles = meshes.reduce((n, m) => n + m.triangles, 0)
  if (meshes.length) out.push(finding(s, 'skeleton.triangles-total', triangles > settings.trianglesWarn ? 'warning' : 'info', `${meshes.length} mesh(es), ${triangles} triângulos no total.`))
  const deform = deformTimelineCount(doc)
  if (deform > settings.deformWarn) out.push(finding(s, 'skeleton.deform-heavy', 'info', `${deform} timelines de deform.`, { hint: 'Deform por vértice é a timeline mais cara; prefira bones com weights.' }))

  const ik = doc.ik?.length ?? 0, transform = doc.transform?.length ?? 0, path = doc.path?.length ?? 0, physics = doc.physics?.length ?? 0
  if (ik + transform + path + physics) out.push(finding(s, 'skeleton.constraints', 'info', `Constraints: ${ik} IK, ${transform} transform, ${path} path, ${physics} physics.`))
  const blends = blendModes(doc)
  if (blends.length) out.push(finding(s, 'skeleton.blend-modes', 'info', `${blends.length} slot(s) com blend mode diferente de normal.`, { detail: listPreview(blends.map((b) => `${b.slot} (${b.blend})`)), hint: 'Cada troca de blend quebra o batch de render.' }))

  const sum = summaryOf(doc)
  out.push(finding(s, 'skeleton.counts', 'info', `${sum.bones} bones · ${sum.slots} slots · ${sum.skins.length} skins · ${sum.animations.length} animações · ${attachmentsOf(doc).length} attachments.`))
  const big = Math.max(sum.size.width, sum.size.height)
  out.push(finding(s, 'skeleton.size', big > settings.skeletonSizeWarn ? 'warning' : 'info', `Tamanho declarado ${Math.round(sum.size.width)}×${Math.round(sum.size.height)} (x ${Math.round(sum.size.x)}, y ${Math.round(sum.size.y)}).`, big > settings.skeletonSizeWarn ? { hint: 'Arte muito grande para a resolução alvo; confira a escala de export.' } : {}))
  if (hasNonessential(doc)) out.push(finding(s, 'skeleton.nonessential', 'info', 'Export inclui dados não essenciais (paths de imagem/áudio, cores de bone).', { hint: 'Desligue "Nonessential data" no export para reduzir o arquivo.' }))
  const ratio = ctx.prettyRatio ?? 1
  if (ratio > 1.15) out.push(finding(s, 'skeleton.pretty-printed', 'info', `JSON formatado com indentação (+${pct(ratio - 1)} de tamanho).`, { hint: 'Desligue "Pretty print" no export.' }))
  if (ctx.bundle.json && ctx.bundle.json.size > 512 * 1024) out.push(finding(s, 'skeleton.binary-hint', 'info', `JSON com ${fmtBytes(ctx.bundle.json.size)}.`, { hint: 'Export binário (.skel) carrega mais rápido e ocupa menos.' }))
  return out
}
