import type { BundleFiles, BundleResult, CheckContext, Finding, ImageInfo, PageInfo, SpineBundle, Thresholds, VariantContext } from '../core/types'
import { parseAtlas } from '../core/atlas'
import { parseSkeleton, summaryOf, versionMajorMinor } from '../core/skeleton'
import { runAllChecks, sortFindings } from '../core/checks'
import { finding } from '../core/checks/util'
import { decodeImages, type DecodeResult } from '../runtime/images'
import { loadSkeleton, summaryFromRuntime } from '../runtime/load'
import { probeSkeleton } from '../runtime/probe'
import type { DecodedImage, LoadedSkeleton } from '../runtime/types'

interface Read {
  skeletonText?: string
  parsed?: ReturnType<typeof parseSkeleton>
  atlasText?: string
  atlas?: ReturnType<typeof parseAtlas>
  decoded: DecodeResult
  /** Decoded images keyed by the page name declared in the atlas (case-insensitive match resolved). */
  byPage: Map<string, DecodedImage>
}

async function readFiles(files: BundleFiles): Promise<Read> {
  const skeletonText = files.json ? await files.json.file.text() : undefined
  const parsed = skeletonText !== undefined ? parseSkeleton(skeletonText) : undefined
  const atlasText = files.atlas ? await files.atlas.file.text() : undefined
  const atlas = atlasText !== undefined ? parseAtlas(atlasText) : undefined
  const decoded = await decodeImages(files.textures)
  const byPage = new Map<string, DecodedImage>()
  for (const page of atlas?.pages ?? []) {
    const img = decoded.images.get(page.name) ?? [...decoded.images.values()].find((d) => d.info.name.toLowerCase() === page.name.toLowerCase())
    if (img) byPage.set(page.name, img)
  }
  return { skeletonText, parsed, atlasText, atlas, decoded, byPage }
}

const infoMap = (r: Read): Map<string, ImageInfo> => new Map([...r.byPage].map(([k, v]) => [k, v.info]))
const bitmapMap = (r: Read) => new Map([...r.byPage].map(([k, v]) => [k, v.bitmap]))
const closeBitmaps = (r: Read) => { for (const d of r.decoded.images.values()) d.bitmap.close() }

async function tryLoad(r: Read, files: BundleFiles, pmaOverride?: boolean): Promise<LoadedSkeleton> {
  if (!r.atlasText) throw new Error('sem .atlas')
  const json = r.parsed?.doc
  const skel = !json && files.skel ? new Uint8Array(await files.skel.file.arrayBuffer()) : undefined
  if (!json && !skel) throw new Error(r.parsed?.error ? `JSON inválido: ${r.parsed.error}` : 'sem skeleton')
  return loadSkeleton({ atlasText: r.atlasText, json, skel, images: bitmapMap(r), pmaOverride })
}

/** Loads a fresh copy for the preview (PMA toggle). The returned skeleton owns its bitmaps. */
export async function loadForPreview(files: BundleFiles, pmaOverride?: boolean): Promise<LoadedSkeleton> {
  const r = await readFiles(files)
  try {
    return await tryLoad(r, files, pmaOverride)
  } catch (e) {
    closeBitmaps(r)
    throw e
  }
}

const pending = (bundle: SpineBundle): BundleResult => ({ bundle, status: 'checking', findings: [], animations: [], pages: [], runtime: { loaded: false, ms: 0 } })

export async function analyzeBundle(
  bundle: SpineBundle,
  settings: Thresholds,
  onUpdate: (r: BundleResult) => void,
): Promise<{ result: BundleResult; loaded: Map<string, LoadedSkeleton> }> {
  let result = pending(bundle)
  const emit = (patch: Partial<BundleResult>) => { result = { ...result, ...patch }; onUpdate(result) }
  const loaded = new Map<string, LoadedSkeleton>()
  const findings: Finding[] = []
  emit({})

  try {
    const root = await readFiles(bundle)
    const variantReads: Read[] = []
    const variants: VariantContext[] = []
    for (const v of bundle.variants) {
      const r = await readFiles(v)
      variantReads.push(r)
      variants.push({ label: v.label, factor: v.factor, files: v, skeletonText: r.skeletonText, skeleton: r.parsed?.doc, skeletonError: r.parsed?.error, atlas: r.atlas, images: infoMap(r) })
    }
    const ctx: CheckContext = {
      bundle, skeletonText: root.skeletonText, skeleton: root.parsed?.doc, skeletonError: root.parsed?.error, prettyRatio: root.parsed?.prettyRatio,
      atlas: root.atlas, images: infoMap(root), variants, settings,
    }
    try {
      findings.push(...runAllChecks(ctx))
    } catch (e) {
      findings.push(finding({ bundle }, 'runtime.check-failed', 'error', `Falha interna ao rodar os checks: ${(e as Error).message}`, { hint: 'JSON com estrutura inesperada. Reporte o arquivo.' }))
    }
    const undecodable = (label: string | undefined, r: Read) => {
      for (const e of r.decoded.errors) findings.unshift(finding({ bundle, variant: label }, 'files.texture-undecodable', 'error', `Não foi possível decodificar "${e.name}".`, { detail: e.error, hint: 'Imagem corrompida ou formato não suportado pelo browser.' }))
    }
    undecodable(undefined, root)
    bundle.variants.forEach((v, i) => undecodable(v.label, variantReads[i]))
    const pages: PageInfo[] = (root.atlas?.pages ?? []).map((p) => {
      const img = ctx.images.get(p.name)
      return { name: p.name, width: img?.width ?? 0, height: img?.height ?? 0, bytes: img?.bytes ?? 0, format: img?.format ?? 'unknown', pma: p.pma, scale: p.scale, declaredWidth: p.width, declaredHeight: p.height }
    })
    emit({ findings: sortFindings(findings), summary: root.parsed?.doc ? summaryOf(root.parsed.doc) : undefined, pages, status: 'loading' })

    const load = async (label: string, r: Read, files: BundleFiles): Promise<number | undefined> => {
      if (!r.atlasText || (!r.parsed?.doc && !files.skel)) { closeBitmaps(r); return undefined }
      const t0 = performance.now()
      try {
        loaded.set(label, await tryLoad(r, files))
        return performance.now() - t0
      } catch (e) {
        closeBitmaps(r)
        findings.unshift(finding({ bundle, variant: label || undefined }, 'runtime.load-failed', 'error', `Runtime não conseguiu carregar${label ? ` ${label}` : ''}: ${(e as Error).message}`, { hint: 'Mensagem exata do spine-pixi-v8. Corrija o export e reenvie.' }))
        return undefined
      }
    }
    const ms = await load('', root, bundle)
    for (let i = 0; i < bundle.variants.length; i++) await load(bundle.variants[i].label, variantReads[i], bundle.variants[i])

    const rootLoaded = loaded.get('')
    let summary = result.summary
    if (rootLoaded && !summary) {
      summary = summaryFromRuntime(rootLoaded.skeletonData)
      const v = versionMajorMinor(summary.version)
      if (v && v !== settings.runtimeVersion) findings.unshift(finding({ bundle }, 'skeleton.version-mismatch', 'error', `Exportado no Spine ${summary.version}; runtime alvo é ${settings.runtimeVersion}.`, { hint: 'Reexporte na versão do runtime ou atualize o runtime do jogo.' }))
    }
    emit({ findings: sortFindings(findings), summary, runtime: { loaded: !!rootLoaded, ms: ms ?? 0, error: rootLoaded ? undefined : findings.find((f) => f.code === 'runtime.load-failed')?.message }, status: 'probing' })

    if (rootLoaded) {
      try {
        const probe = await probeSkeleton(rootLoaded, bundle.name, settings)
        findings.push(...probe.findings)
        emit({ animations: probe.animations })
      } catch (e) {
        findings.push(finding({ bundle }, 'runtime.probe-failed', 'error', `Sonda de animações falhou: ${(e as Error).message}`, { hint: 'O skeleton carregou, mas alguma animação quebra o runtime ao ser aplicada.' }))
      }
    }
  } catch (e) {
    findings.push(finding({ bundle }, 'runtime.analysis-failed', 'error', `Falha ao analisar o bundle: ${(e as Error).message}`, { hint: 'Arquivo ilegível ou estrutura inesperada; tente reexportar.' }))
  }
  emit({ findings: sortFindings(findings), status: 'done' })
  return { result, loaded }
}
