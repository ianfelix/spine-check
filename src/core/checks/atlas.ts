import type { CheckContext, Finding } from '../types'
import { regionNamesUsed } from '../skeleton'
import { finding, fmtBytes, listPreview, pct } from './util'

export function atlasChecks(ctx: CheckContext): Finding[] {
  const s = { bundle: ctx.bundle }
  const out: Finding[] = []
  const atlas = ctx.atlas
  if (!atlas) return out
  const t = ctx.settings

  for (const e of atlas.errors) out.push(finding(s, 'atlas.parse-error', 'error', 'Erro ao ler o .atlas.', { detail: e, hint: 'Reexporte o atlas; o arquivo está corrompido ou em formato inesperado.' }))

  let pageArea = 0
  let regionArea = 0
  let gpu = 0
  atlas.pages.forEach((page, i) => {
    const img = ctx.images.get(page.name)
    if (img && page.width !== undefined && page.height !== undefined && (img.width !== page.width || img.height !== page.height)) {
      out.push(finding(s, 'atlas.page-size-mismatch', 'error', `Página "${page.name}" declara ${page.width}×${page.height} mas a imagem tem ${img.width}×${img.height}.`, { hint: 'Reexporte o atlas junto com a imagem; UVs ficam erradas em runtime.', subject: { kind: 'page', name: page.name } }))
    }
    const w = img?.width ?? page.width ?? 0
    const h = img?.height ?? page.height ?? 0
    const big = Math.max(w, h)
    if (big > t.pageMaxError) out.push(finding(s, 'atlas.page-too-large', 'error', `Página "${page.name}" tem ${w}×${h}; acima de ${t.pageMaxError} px falha em GPUs mobile.`, { hint: 'Reduza o tamanho máximo de página no packer.', subject: { kind: 'page', name: page.name } }))
    else if (big > t.pageMaxWarn) out.push(finding(s, 'atlas.page-too-large', 'warning', `Página "${page.name}" tem ${w}×${h}; acima de ${t.pageMaxWarn} px custa memória em mobile.`, { hint: 'Considere páginas de até 2048 px.', subject: { kind: 'page', name: page.name } }))
    for (const r of page.regions) {
      const rotated = r.rotate === 90 || r.rotate === 270
      const fw = rotated ? r.height : r.width
      const fh = rotated ? r.width : r.height
      if (r.x + fw > w || r.y + fh > h) out.push(finding(s, 'atlas.region-out-of-bounds', 'error', `Região "${r.name}" sai da página "${page.name}".`, { detail: `bounds ${r.x},${r.y} ${r.width}×${r.height}${rotated ? ` rotate ${r.rotate}` : ''} em ${w}×${h}`, hint: 'Atlas e imagem não batem; reexporte os dois juntos.', subject: { kind: 'region', name: r.name } }))
    }
    pageArea += w * h
    regionArea += page.regions.reduce((n, r) => n + r.width * r.height, 0)
    gpu += w * h * 4
    if (img) out.push(finding(s, 'atlas.texture-format', 'info', `Página ${i + 1}: ${page.name} · ${img.format.toUpperCase()} · ${w}×${h} · ${fmtBytes(img.bytes)}.`, img.format === 'png' && img.bytes > t.pngWarnBytes ? { hint: 'PNG grande: WebP costuma ficar 3–5× menor com a mesma qualidade.' } : {}))
  })

  const seen = new Map<string, number>()
  for (const r of atlas.regions) { const k = `${r.name}#${r.index}`; seen.set(k, (seen.get(k) ?? 0) + 1) }
  for (const [k, n] of seen) {
    if (n <= 1) continue
    const name = k.slice(0, k.lastIndexOf('#'))
    out.push(finding(s, 'atlas.region-duplicate', 'warning', `Região "${name}" aparece ${n} vezes.`, { hint: 'Nomes repetidos: o runtime usa o primeiro e ignora os outros.', subject: { kind: 'region', name } }))
  }

  if (ctx.skeleton) {
    const used = regionNamesUsed(ctx.skeleton)
    const unused = atlas.regions.filter((r) => !used.has(r.name))
    if (unused.length) {
      const area = unused.reduce((n, r) => n + r.width * r.height, 0)
      out.push(finding(s, 'atlas.region-unused', 'warning', `${unused.length} região(ões) do atlas sem attachment (${pct(pageArea ? area / pageArea : 0)} da área).`, { detail: listPreview(unused.map((r) => r.name)), hint: 'Remova imagens não usadas da pasta de imagens antes de empacotar.' }))
    }
  }
  if (pageArea && regionArea / pageArea < t.occupancyWarn) out.push(finding(s, 'atlas.occupancy-low', 'warning', `Atlas ocupa só ${pct(regionArea / pageArea)} das páginas.`, { hint: 'Reempacote com páginas menores ou "Power of two" desligado.' }))

  const first = atlas.pages[0]
  const manyPages = atlas.pages.length > t.pagesWarn
  out.push(finding(s, 'atlas.pages', manyPages ? 'warning' : 'info', `${atlas.pages.length} página(s) · filtro ${first?.minFilter ?? '?'}/${first?.magFilter ?? '?'} · pma ${first?.pma ?? false}${first?.scale !== undefined ? ` · scale ${first.scale}` : ''}.`, manyPages ? { hint: 'Cada página é uma textura e um batch a mais.' } : {}))
  if (gpu) {
    const heavy = gpu > t.gpuMemoryWarnBytes
    out.push(finding(s, 'atlas.gpu-memory', heavy ? 'warning' : 'info', `Memória de textura estimada: ${fmtBytes(gpu)} (RGBA descomprimido).`, heavy ? { hint: 'Acima do orçamento típico de um skeleton em mobile.' } : {}))
  }
  return out
}
