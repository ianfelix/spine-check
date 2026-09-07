import { useCallback, useMemo, useRef, useState } from 'react'
import type { BundleResult, InputFile, Thresholds } from '../core/types'
import { groupBundles } from '../core/bundle'
import type { LoadedSkeleton } from '../runtime/types'
import { analyzeBundle } from './pipeline'
import { loadSettings, saveSettings } from './settingsStore'

const pendingResult = (bundle: BundleResult['bundle']): BundleResult => ({ bundle, status: 'pending', findings: [], animations: [], pages: [], runtime: { loaded: false, ms: 0 } })

export function useValidator() {
  const [results, setResults] = useState<BundleResult[]>([])
  const [ignored, setIgnored] = useState<InputFile[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [settings, setSettings] = useState<Thresholds>(loadSettings)
  const [busy, setBusy] = useState(false)
  const loadedRef = useRef(new Map<string, Map<string, LoadedSkeleton>>())
  const filesRef = useRef<InputFile[]>([])
  const queue = useRef(Promise.resolve())
  const generation = useRef(0)

  const disposeAll = () => {
    generation.current++
    for (const m of loadedRef.current.values()) for (const l of m.values()) l.dispose()
    loadedRef.current.clear()
  }

  const analyze = useCallback((files: InputFile[], current: Thresholds) => {
    queue.current = queue.current
      .then(async () => {
        const gen = generation.current
        setBusy(true)
        try {
          const atlasTexts = new Map<string, string>()
          for (const f of files) if (f.ext === 'atlas') atlasTexts.set(f.path, await f.file.text())
          const { bundles, ignored: skipped } = groupBundles(files, atlasTexts)
          if (generation.current !== gen) return
          setIgnored((prev) => [...prev, ...skipped])
          setResults((prev) => [...prev.filter((r) => !bundles.some((b) => b.key === r.bundle.key)), ...bundles.map(pendingResult)])
          if (bundles[0]) setSelectedKey((k) => k ?? bundles[0].key)
          for (const bundle of bundles) {
            if (generation.current !== gen) return
            loadedRef.current.get(bundle.key)?.forEach((l) => l.dispose())
            loadedRef.current.delete(bundle.key)
            const { loaded } = await analyzeBundle(bundle, current, (r) => setResults((prev) => prev.map((p) => (p.bundle.key === r.bundle.key ? r : p))))
            if (generation.current !== gen) { loaded.forEach((l) => l.dispose()); return }
            loadedRef.current.set(bundle.key, loaded)
          }
        } finally {
          setBusy(false)
        }
      })
      .catch(() => { setBusy(false) })
    return queue.current
  }, [])

  const addFiles = useCallback((files: InputFile[]) => {
    if (!files.length) return
    filesRef.current = [...filesRef.current.filter((f) => !files.some((n) => n.path === f.path)), ...files]
    void analyze(files, settings)
  }, [analyze, settings])

  const clear = useCallback(() => {
    disposeAll()
    filesRef.current = []
    setResults([])
    setIgnored([])
    setSelectedKey(null)
  }, [])

  const applySettings = useCallback((next: Thresholds) => {
    saveSettings(next)
    setSettings(next)
    if (!filesRef.current.length) return
    disposeAll()
    setResults([])
    setIgnored([])
    void analyze(filesRef.current, next)
  }, [analyze])

  const loadedFor = useCallback((key: string, variant = ''): LoadedSkeleton | undefined => loadedRef.current.get(key)?.get(variant), [])

  const selected = useMemo(() => results.find((r) => r.bundle.key === selectedKey), [results, selectedKey])

  return { results, ignored, selectedKey, selected, settings, busy, addFiles, clear, select: setSelectedKey, applySettings, loadedFor }
}
