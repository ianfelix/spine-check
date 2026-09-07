import type { BundleFiles, BundleVariant, FileRef, InputFile, SpineBundle } from './types'
import { parseAtlas } from './atlas'

export const VARIANT_DIR_RE = /^@(\d+(?:\.\d+)?)x$/
const IMAGE_EXTS = new Set(['png', 'webp', 'jpg', 'jpeg'])

export interface GroupResult { bundles: SpineBundle[]; ignored: InputFile[] }

export function splitPath(path: string): { dir: string; name: string; base: string; ext: string } {
  const norm = path.replace(/\\/g, '/').replace(/^\.?\//, '')
  const slash = norm.lastIndexOf('/')
  const dir = slash === -1 ? '' : norm.slice(0, slash)
  const name = slash === -1 ? norm : norm.slice(slash + 1)
  const dot = name.lastIndexOf('.')
  return { dir, name, base: dot <= 0 ? name : name.slice(0, dot), ext: dot <= 0 ? '' : name.slice(dot + 1).toLowerCase() }
}

export function toInputFile(file: File, path?: string): InputFile {
  const p = path || (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
  const { name, ext } = splitPath(p)
  return { path: p, name, ext, size: file.size, file }
}

const ref = (f: InputFile): FileRef => ({ path: f.path, name: f.name, size: f.size, file: f.file })

interface Group extends BundleFiles { base: string }

export function groupBundles(files: InputFile[], atlasTexts: Map<string, string>): GroupResult {
  const ignored: InputFile[] = []
  const imagesByDir = new Map<string, InputFile[]>()
  const groups = new Map<string, Group>()

  for (const f of files) {
    const { dir, base, ext } = splitPath(f.path)
    if (IMAGE_EXTS.has(ext)) {
      const list = imagesByDir.get(dir) ?? []
      list.push(f)
      imagesByDir.set(dir, list)
      continue
    }
    if (ext !== 'json' && ext !== 'skel' && ext !== 'atlas') { ignored.push(f); continue }
    const key = `${dir}/${base}`
    const g = groups.get(key) ?? { dir, base, textures: [] }
    if (ext === 'json') g.json = ref(f)
    else if (ext === 'skel') g.skel = ref(f)
    else g.atlas = ref(f)
    groups.set(key, g)
  }

  const referenced = new Map<string, Set<InputFile>>()
  for (const g of groups.values()) {
    if (!g.atlas) continue
    const images = imagesByDir.get(g.dir) ?? []
    for (const page of parseAtlas(atlasTexts.get(g.atlas.path) ?? '').pages) {
      const found = images.find((i) => i.name === page.name) ?? images.find((i) => i.name.toLowerCase() === page.name.toLowerCase())
      if (!found) continue
      g.textures.push(ref(found))
      const set = referenced.get(g.dir) ?? new Set<InputFile>()
      set.add(found)
      referenced.set(g.dir, set)
    }
  }

  const bundles = new Map<string, SpineBundle>()
  const pendingVariants: Array<{ parentKey: string; variant: BundleVariant; base: string }> = []
  const asFiles = (g: Group): BundleFiles => ({ dir: g.dir, json: g.json, skel: g.skel, atlas: g.atlas, textures: g.textures })

  for (const [key, g] of groups) {
    const last = g.dir.slice(g.dir.lastIndexOf('/') + 1)
    const m = last.match(VARIANT_DIR_RE)
    if (m) {
      const parentDir = g.dir.slice(0, Math.max(0, g.dir.length - last.length - 1))
      pendingVariants.push({ parentKey: `${parentDir}/${g.base}`, variant: { ...asFiles(g), factor: Number(m[1]), label: last }, base: g.base })
      continue
    }
    bundles.set(key, { ...asFiles(g), name: g.base, key, variants: [], unreferencedTextures: [] })
  }
  for (const { parentKey, variant, base } of pendingVariants) {
    const parent = bundles.get(parentKey)
    if (parent) { parent.variants.push(variant); continue }
    const key = `${variant.dir}/${base}`
    bundles.set(key, { dir: variant.dir, json: variant.json, skel: variant.skel, atlas: variant.atlas, textures: variant.textures, name: base, key, variants: [], unreferencedTextures: [] })
  }

  for (const [dir, images] of imagesByDir) {
    const used = referenced.get(dir) ?? new Set<InputFile>()
    const stray = images.filter((i) => !used.has(i))
    if (!stray.length) continue
    const owner = [...bundles.values()].filter((b) => b.dir === dir).sort((a, b) => a.name.localeCompare(b.name))[0]
    if (owner) owner.unreferencedTextures.push(...stray.map(ref))
    else ignored.push(...stray)
  }

  const list = [...bundles.values()].sort((a, b) => a.key.localeCompare(b.key))
  for (const b of list) b.variants.sort((a, c) => a.factor - c.factor)
  return { bundles: list, ignored }
}
