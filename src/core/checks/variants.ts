import type { CheckContext, Finding } from '../types'
import { VARIANT_DIR_RE } from '../bundle'
import { finding } from './util'

export function firstDiffPath(a: unknown, b: unknown, path = '$'): string | null {
  if (a === b) return null
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return path
  if (Array.isArray(a) !== Array.isArray(b)) return path
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}.length`
    for (let i = 0; i < a.length; i++) { const d = firstDiffPath(a[i], b[i], `${path}[${i}]`); if (d) return d }
    return null
  }
  const oa = a as Record<string, unknown>
  const ob = b as Record<string, unknown>
  for (const k of new Set([...Object.keys(oa), ...Object.keys(ob)])) {
    if (!(k in oa) || !(k in ob)) return `${path}.${k}`
    const d = firstDiffPath(oa[k], ob[k], `${path}.${k}`)
    if (d) return d
  }
  return null
}

export function variantsChecks(ctx: CheckContext): Finding[] {
  const out: Finding[] = []
  const last = ctx.bundle.dir.slice(ctx.bundle.dir.lastIndexOf('/') + 1)
  if (VARIANT_DIR_RE.test(last)) out.push(finding({ bundle: ctx.bundle }, 'variants.orphan', 'info', `Bundle está em pasta de variante "${last}" sem bundle raiz correspondente.`, { hint: 'Coloque a versão base na pasta pai para comparar as duas.' }))

  for (const v of ctx.variants) {
    const s = { bundle: ctx.bundle, variant: v.label }
    if (ctx.skeleton && v.skeleton) {
      const d = firstDiffPath(ctx.skeleton, v.skeleton)
      if (d) out.push(finding(s, 'variants.skeleton-differs', 'error', `Skeleton de ${v.label} difere do raiz.`, { detail: `primeira diferença em ${d}`, hint: 'Variantes de resolução devem trocar só o atlas e as imagens. Reexporte as duas do mesmo arquivo Spine.' }))
    } else if (v.skeletonError) {
      out.push(finding(s, 'skeleton.json-invalid', 'error', `JSON de ${v.label} inválido.`, { detail: v.skeletonError }))
    }
    const atlas = v.atlas
    if (!atlas) {
      if (v.files.json || v.files.skel) out.push(finding(s, 'files.atlas-missing', 'error', `${v.label} sem .atlas.`))
      continue
    }
    const scale = atlas.pages[0]?.scale
    if (scale === undefined) out.push(finding(s, 'variants.scale-missing', 'error', `Atlas de ${v.label} não declara "scale".`, { hint: `Exporte o atlas com scale ${v.factor} para o runtime compensar o tamanho.` }))
    else if (Math.abs(scale - v.factor) > 0.01) out.push(finding(s, 'variants.scale-mismatch', 'error', `Atlas de ${v.label} declara scale ${scale}; a pasta indica ${v.factor}.`, { hint: 'Pasta e header precisam concordar; o runtime usa o header.' }))
    atlas.pages.forEach((page, i) => {
      const img = v.images.get(page.name)
      if (!img) out.push(finding(s, 'variants.texture-missing', 'error', `Imagem "${page.name}" de ${v.label} não está na pasta da variante.`, { subject: { kind: 'page', name: page.name } }))
      const rootPage = ctx.atlas?.pages[i]
      const rootImg = rootPage ? ctx.images.get(rootPage.name) : undefined
      if (img && rootImg) {
        const ew = rootImg.width * v.factor
        const eh = rootImg.height * v.factor
        const tol = (expected: number) => Math.max(2, expected * 0.1)
        if (Math.abs(img.width - ew) > tol(ew) || Math.abs(img.height - eh) > tol(eh)) out.push(finding(s, 'variants.page-size-mismatch', 'warning', `Página "${page.name}" de ${v.label} tem ${img.width}×${img.height}; esperado ≈ ${Math.round(ew)}×${Math.round(eh)}.`, { hint: 'Confira a escala de export da variante.', subject: { kind: 'page', name: page.name } }))
      }
    })
  }
  return out
}
