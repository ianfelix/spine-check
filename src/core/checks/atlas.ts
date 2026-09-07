import type { CheckContext, Finding } from '../types'
import { regionNamesUsed } from '../skeleton'
import { finding, fmtBytes, listPreview, pct } from './util'

export function atlasChecks(ctx: CheckContext): Finding[] {
  const s = { bundle: ctx.bundle }
  const out: Finding[] = []
  const atlas = ctx.atlas
  if (!atlas) return out
  const t = ctx.settings

  for (const e of atlas.errors) out.push(finding(s, 'atlas.parse-error', 'error', 'Could not read the .atlas.', { detail: e, hint: 'Re-export the atlas; the file is corrupted or in an unexpected format.' }))

  let pageArea = 0
  let regionArea = 0
  let gpu = 0
  atlas.pages.forEach((page, i) => {
    const img = ctx.images.get(page.name)
    if (img && page.width !== undefined && page.height !== undefined && (img.width !== page.width || img.height !== page.height)) {
      out.push(finding(s, 'atlas.page-size-mismatch', 'error', `Page "${page.name}" declares ${page.width}×${page.height} but the image is ${img.width}×${img.height}.`, { hint: 'Re-export atlas and image together; UVs are wrong at runtime.', subject: { kind: 'page', name: page.name } }))
    }
    const w = img?.width ?? page.width ?? 0
    const h = img?.height ?? page.height ?? 0
    const big = Math.max(w, h)
    if (big > t.pageMaxError) out.push(finding(s, 'atlas.page-too-large', 'error', `Page "${page.name}" is ${w}×${h}; above ${t.pageMaxError} px it fails on mobile GPUs.`, { hint: 'Lower the maximum page size in the packer.', subject: { kind: 'page', name: page.name } }))
    else if (big > t.pageMaxWarn) out.push(finding(s, 'atlas.page-too-large', 'warning', `Page "${page.name}" is ${w}×${h}; above ${t.pageMaxWarn} px it costs memory on mobile.`, { hint: 'Consider pages of up to 2048 px.', subject: { kind: 'page', name: page.name } }))
    for (const r of page.regions) {
      const rotated = r.rotate === 90 || r.rotate === 270
      const fw = rotated ? r.height : r.width
      const fh = rotated ? r.width : r.height
      if (r.x + fw > w || r.y + fh > h) out.push(finding(s, 'atlas.region-out-of-bounds', 'error', `Region "${r.name}" extends past page "${page.name}".`, { detail: `bounds ${r.x},${r.y} ${r.width}×${r.height}${rotated ? ` rotate ${r.rotate}` : ''} on ${w}×${h}`, hint: 'Atlas and image do not match; re-export both together.', subject: { kind: 'region', name: r.name } }))
    }
    pageArea += w * h
    regionArea += page.regions.reduce((n, r) => n + r.width * r.height, 0)
    gpu += w * h * 4
    if (img) out.push(finding(s, 'atlas.texture-format', 'info', `Page ${i + 1}: ${page.name} · ${img.format.toUpperCase()} · ${w}×${h} · ${fmtBytes(img.bytes)}.`, img.format === 'png' && img.bytes > t.pngWarnBytes ? { hint: 'Large PNG: WebP is usually 3–5× smaller at the same quality.' } : {}))
  })

  const seen = new Map<string, number>()
  for (const r of atlas.regions) { const k = `${r.name}#${r.index}`; seen.set(k, (seen.get(k) ?? 0) + 1) }
  for (const [k, n] of seen) {
    if (n <= 1) continue
    const name = k.slice(0, k.lastIndexOf('#'))
    out.push(finding(s, 'atlas.region-duplicate', 'warning', `Region "${name}" appears ${n} times.`, { hint: 'Duplicate names: the runtime uses the first and ignores the rest.', subject: { kind: 'region', name } }))
  }

  if (ctx.skeleton) {
    const used = regionNamesUsed(ctx.skeleton)
    const unused = atlas.regions.filter((r) => !used.has(r.name))
    if (unused.length) {
      const area = unused.reduce((n, r) => n + r.width * r.height, 0)
      out.push(finding(s, 'atlas.region-unused', 'warning', `${unused.length} atlas region(s) without an attachment (${pct(pageArea ? area / pageArea : 0)} of the area).`, { detail: listPreview(unused.map((r) => r.name)), hint: 'Remove unused images from the images folder before packing.' }))
    }
  }
  if (pageArea && regionArea / pageArea < t.occupancyWarn) out.push(finding(s, 'atlas.occupancy-low', 'warning', `Atlas uses only ${pct(regionArea / pageArea)} of its pages.`, { hint: 'Repack with smaller pages or "Power of two" disabled.' }))

  const first = atlas.pages[0]
  const manyPages = atlas.pages.length > t.pagesWarn
  out.push(finding(s, 'atlas.pages', manyPages ? 'warning' : 'info', `${atlas.pages.length} page(s) · filter ${first?.minFilter ?? '?'}/${first?.magFilter ?? '?'} · pma ${first?.pma ?? false}${first?.scale !== undefined ? ` · scale ${first.scale}` : ''}.`, manyPages ? { hint: 'Every page is one more texture and one more batch.' } : {}))
  if (gpu) {
    const heavy = gpu > t.gpuMemoryWarnBytes
    out.push(finding(s, 'atlas.gpu-memory', heavy ? 'warning' : 'info', `Estimated texture memory: ${fmtBytes(gpu)} (uncompressed RGBA).`, heavy ? { hint: 'Above the typical per-skeleton budget on mobile.' } : {}))
  }
  return out
}
