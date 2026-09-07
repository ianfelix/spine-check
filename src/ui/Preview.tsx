import { useCallback, useEffect, useRef, useState } from 'react'
import type { BundleResult } from '../core/types'
import { DEFAULT_OVERLAYS, SpinePreview, type SequenceClip } from '../runtime/preview'
import type { LoadedSkeleton } from '../runtime/types'
import { loadForPreview } from '../state/pipeline'
import { downloadBlob, stamp } from './download'
import { PreviewControls, type ControlsState } from './PreviewControls'
import { SequencePanel } from './SequencePanel'
import { S } from './strings'

interface Props {
  result?: BundleResult
  loadedFor: (key: string, variant?: string) => LoadedSkeleton | undefined
  focusAnimation: { name: string; nonce: number } | null
  hidden?: boolean
}

const initial: ControlsState = {
  animation: '', skin: '', loop: true, speed: 1, playing: true, time: 0, duration: 0, variant: '',
  background: 'dark', pma: undefined, overlays: { ...DEFAULT_OVERLAYS }, recording: false,
}

const isTypingTarget = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null
  if (!el || !el.tagName) return false
  if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName) || el.isContentEditable) return true
  return document.querySelector('.backdrop') !== null
}

export function Preview({ result, loadedFor, focusAnimation, hidden = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<SpinePreview>()
  const stopRecordRef = useRef<() => Promise<Blob>>()
  const pmaLoadedRef = useRef<LoadedSkeleton>()
  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<ControlsState>(initial)
  const [progress, setProgress] = useState<{ elapsed: number; total: number } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const key = result?.bundle.key
  const ready = result?.status === 'done'
  const baseLoaded = key && ready ? loadedFor(key, state.variant) : undefined
  const summary = result?.summary
  const animations = summary?.animations ?? []
  const skins = summary?.skins ?? []
  const variants = result?.bundle.variants.map((v) => v.label) ?? []

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const p = new SpinePreview()
    previewRef.current = p
    let alive = true
    p.mount(host).then(() => { if (alive) setMounted(true) }).catch((e: Error) => { if (alive) setPreviewError(e.message) })
    const off = p.onTime((time, duration) => setState((s) => (s.time === time && s.duration === duration ? s : { ...s, time, duration })))
    return () => {
      alive = false
      off()
      void stopRecordRef.current?.()
      stopRecordRef.current = undefined
      p.destroy()
      previewRef.current = undefined
      pmaLoadedRef.current?.dispose()
      pmaLoadedRef.current = undefined
    }
  }, [])

  useEffect(() => {
    setState((s) => ({ ...initial, background: s.background, overlays: s.overlays, animation: animations[0] ?? '', skin: skins.find((x) => x !== 'default') ?? skins[0] ?? '' }))
    setProgress(null)
    setPreviewError(null)
    pmaLoadedRef.current?.dispose()
    pmaLoadedRef.current = undefined
  }, [key])

  const animationKey = animations.join('|')
  const skinKey = skins.join('|')
  useEffect(() => {
    setState((s) => {
      const animation = animations.includes(s.animation) ? s.animation : animations[0] ?? ''
      const skin = skins.includes(s.skin) ? s.skin : skins.find((x) => x !== 'default') ?? skins[0] ?? ''
      return animation === s.animation && skin === s.skin ? s : { ...s, animation, skin }
    })
  }, [animationKey, skinKey])

  useEffect(() => {
    const p = previewRef.current
    if (!p || !mounted) return
    if (!baseLoaded || !result) { p.clear(); return }
    let cancelled = false
    const show = (loaded: LoadedSkeleton) => {
      if (cancelled) return
      const stats = result.animations.find((a) => a.name === state.animation)
      try {
        p.show(loaded, { animation: state.animation || undefined, skin: state.skin || undefined, loop: state.loop, animationBounds: stats?.bounds })
        p.setOverlays(state.overlays)
        p.setSpeed(state.speed)
        p.setPlaying(state.playing)
        setPreviewError(null)
      } catch (e) {
        setPreviewError((e as Error).message)
      }
    }
    if (state.pma === undefined) { show(baseLoaded); return () => { cancelled = true } }
    const files = state.variant ? result.bundle.variants.find((v) => v.label === state.variant) : result.bundle
    if (!files) return
    loadForPreview(files, state.pma)
      .then((l) => {
        if (cancelled) { l.dispose(); return }
        pmaLoadedRef.current?.dispose()
        pmaLoadedRef.current = l
        show(l)
      })
      .catch(() => show(baseLoaded))
    return () => { cancelled = true }
  }, [mounted, baseLoaded, state.variant, state.pma, result?.bundle])

  useEffect(() => { if (!state.animation) return; previewRef.current?.setAnimation(state.animation, state.loop); previewRef.current?.setAnimationBounds(result?.animations.find((a) => a.name === state.animation)?.bounds) }, [state.animation])
  useEffect(() => { previewRef.current?.setLoop(state.loop) }, [state.loop])
  useEffect(() => { if (state.skin) previewRef.current?.setSkin(state.skin) }, [state.skin])
  useEffect(() => { previewRef.current?.setSpeed(state.speed) }, [state.speed])
  useEffect(() => { previewRef.current?.setPlaying(state.playing) }, [state.playing])
  useEffect(() => { previewRef.current?.setOverlays(state.overlays) }, [state.overlays])
  useEffect(() => { if (focusAnimation && animations.includes(focusAnimation.name)) setState((s) => ({ ...s, animation: focusAnimation.name, playing: true })) }, [focusAnimation])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const p = previewRef.current
      if (!p) return
      if (e.code === 'Space') { e.preventDefault(); setState((s) => ({ ...s, playing: !s.playing })) }
      else if (e.key === 'f' || e.key === 'F') p.fit()
      else if (e.key === 'l' || e.key === 'L') setState((s) => ({ ...s, loop: !s.loop }))
      else if (e.key === 'b' || e.key === 'B') setState((s) => ({ ...s, overlays: { ...s.overlays, bones: !s.overlays.bones } }))
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const { time } = p.getTime(); setState((s) => ({ ...s, playing: false })); p.seek(Math.max(0, time + (e.key === 'ArrowRight' ? 1 / 30 : -1 / 30))) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onChange = useCallback((patch: Partial<ControlsState>) => setState((s) => ({ ...s, ...patch })), [])
  const capture = async () => {
    const p = previewRef.current
    if (!p) return
    try { downloadBlob(await p.capturePng(), `${result?.bundle.name ?? 'spine'}-${state.animation}-${stamp()}.png`) }
    catch (e) { setPreviewError((e as Error).message) }
  }
  const record = async () => {
    const p = previewRef.current
    if (!p) return
    if (stopRecordRef.current) {
      const blob = await stopRecordRef.current()
      stopRecordRef.current = undefined
      setState((s) => ({ ...s, recording: false }))
      downloadBlob(blob, `${result?.bundle.name ?? 'spine'}-${state.animation}-${stamp()}.webm`)
      return
    }
    stopRecordRef.current = p.startRecording()
    setState((s) => ({ ...s, recording: true }))
  }
  const playSequence = (clips: SequenceClip[]) => { setState((s) => ({ ...s, playing: true })); previewRef.current?.playSequence(clips, (elapsed, total, done) => setProgress(done ? null : { elapsed, total })) }
  const stopSequence = () => { previewRef.current?.stopSequence(); setProgress(null) }

  const message = !result ? S.preview.empty : !ready ? S.preview.pending : !baseLoaded ? S.preview.noRuntime : previewError
  return (
    <div className={`preview${hidden ? ' hidden' : ''}`}>
      <div ref={hostRef} className={`preview-canvas bg-${state.background}`}>
        {state.variant && <span className="preview-tag">{state.variant}</span>}
        {message && <div className="preview-msg">{message}</div>}
      </div>
      <PreviewControls state={state} animations={animations} skins={skins} variants={variants} stats={result?.animations ?? []} canRecord={previewRef.current?.canRecord() ?? false}
        onChange={onChange} onSeek={(t) => { setState((s) => ({ ...s, playing: false })); previewRef.current?.seek(t) }}
        onFit={() => previewRef.current?.fit()} onZoom={(f) => previewRef.current?.zoomBy(f)} onCapture={() => void capture()} onRecord={() => void record()} />
      <SequencePanel animations={animations} progress={progress} onPlay={playSequence} onStop={stopSequence} />
    </div>
  )
}
