import type { AtlasData, AtlasPage, AtlasRegion } from './types'

function nums(values: string[], line: number, key: string, errors: string[]): number[] {
  const out = values.map((v) => Number(v))
  if (out.some((n) => Number.isNaN(n))) errors.push(`linha ${line}: valor inválido em "${key}: ${values.join(',')}"`)
  return out
}

function newRegion(page: number, name: string): AtlasRegion {
  return { page, name, index: -1, x: 0, y: 0, width: 0, height: 0, rotate: 0, offsetX: 0, offsetY: 0, originalWidth: 0, originalHeight: 0 }
}

function pageProp(page: AtlasPage, key: string, values: string[], line: number, errors: string[]): void {
  switch (key) {
    case 'size': { const [w, h] = nums(values, line, key, errors); page.width = w; page.height = h; break }
    case 'format': page.format = values[0]; break
    case 'filter': page.minFilter = values[0]; page.magFilter = values[1] ?? values[0]; break
    case 'repeat': page.repeat = values[0]; break
    case 'pma': page.pma = values[0] === 'true'; break
    case 'scale': page.scale = nums(values, line, key, errors)[0]; break
    default: break
  }
}

function regionProp(r: AtlasRegion, key: string, values: string[], line: number, errors: string[]): void {
  switch (key) {
    case 'bounds': { const [x, y, w, h] = nums(values, line, key, errors); r.x = x; r.y = y; r.width = w; r.height = h; break }
    case 'xy': { const [x, y] = nums(values, line, key, errors); r.x = x; r.y = y; break }
    case 'size': { const [w, h] = nums(values, line, key, errors); r.width = w; r.height = h; break }
    case 'offsets': { const [ox, oy, ow, oh] = nums(values, line, key, errors); r.offsetX = ox; r.offsetY = oy; r.originalWidth = ow; r.originalHeight = oh; break }
    case 'offset': { const [ox, oy] = nums(values, line, key, errors); r.offsetX = ox; r.offsetY = oy; break }
    case 'orig': { const [ow, oh] = nums(values, line, key, errors); r.originalWidth = ow; r.originalHeight = oh; break }
    case 'rotate': r.rotate = values[0] === 'true' ? 90 : values[0] === 'false' ? 0 : nums(values, line, key, errors)[0]; break
    case 'index': r.index = nums(values, line, key, errors)[0]; break
    default: break
  }
}

export function parseAtlas(text: string): AtlasData {
  const pages: AtlasPage[] = []
  const regions: AtlasRegion[] = []
  const errors: string[] = []
  let page: AtlasPage | undefined
  let region: AtlasRegion | undefined
  const lines = text.split(/\r\n|\r|\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') { page = undefined; region = undefined; continue }
    if (!page) { page = { name: line, regions: [] }; pages.push(page); continue }
    const colon = line.indexOf(':')
    if (colon === -1) {
      region = newRegion(pages.length - 1, line)
      page.regions.push(region)
      regions.push(region)
      continue
    }
    const key = line.slice(0, colon).trim()
    const values = line.slice(colon + 1).split(',').map((s) => s.trim())
    if (region) regionProp(region, key, values, i + 1, errors)
    else pageProp(page, key, values, i + 1, errors)
  }
  for (const r of regions) {
    if (!r.originalWidth) r.originalWidth = r.width
    if (!r.originalHeight) r.originalHeight = r.height
  }
  if (text.trim() === '') errors.push('atlas vazio')
  return { pages, regions, errors }
}
