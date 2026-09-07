import type { Thresholds } from './types'

export const RUNTIME_VERSION_FULL: string =
  typeof __SPINE_RUNTIME_VERSION__ === 'string' ? __SPINE_RUNTIME_VERSION__ : '4.2.0'
export const RUNTIME_VERSION: string = RUNTIME_VERSION_FULL.split('.').slice(0, 2).join('.')

export const DEFAULT_THRESHOLDS: Thresholds = {
  runtimeVersion: RUNTIME_VERSION,
  pageMaxWarn: 2048,
  pageMaxError: 4096,
  pagesWarn: 2,
  occupancyWarn: 0.5,
  pngWarnBytes: 1024 * 1024,
  gpuMemoryWarnBytes: 64 * 1024 * 1024,
  meshVerticesWarn: 1000,
  trianglesWarn: 20000,
  deformWarn: 50,
  skeletonSizeWarn: 4096,
  suspiciousPatterns: ['backup', 'old', 'test', 'tmp', 'temp', 'copy', 'wip', 'unused'],
  probeMaxSteps: 20000,
}

export function mergeThresholds(partial: Partial<Thresholds> | null | undefined): Thresholds {
  const out: Thresholds = { ...DEFAULT_THRESHOLDS, suspiciousPatterns: [...DEFAULT_THRESHOLDS.suspiciousPatterns] }
  if (!partial) return out
  for (const key of Object.keys(DEFAULT_THRESHOLDS) as Array<keyof Thresholds>) {
    const v = partial[key]
    if (v === undefined || v === null) continue
    if (key === 'suspiciousPatterns') { if (Array.isArray(v)) out.suspiciousPatterns = v.map(String).filter(Boolean) }
    else if (key === 'runtimeVersion') { if (typeof v === 'string' && /^\d+\.\d+$/.test(v)) out.runtimeVersion = v }
    else if (typeof v === 'number' && Number.isFinite(v) && v > 0) (out as unknown as Record<string, number>)[key] = v
  }
  return out
}
