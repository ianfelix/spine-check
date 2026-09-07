import { Application, Container, Graphics, Rectangle } from 'pixi.js'
import { Spine, SpineDebugRenderer } from '@esotericsoftware/spine-pixi-v8'
import type { Rect } from '../core/types'
import type { LoadedSkeleton } from './types'

export interface PreviewOverlays {
  bones: boolean; regions: boolean; meshHull: boolean; meshTriangles: boolean
  boundingBoxes: boolean; paths: boolean; clipping: boolean
  skeletonSize: boolean; animationBounds: boolean; grid: boolean
}
export const DEFAULT_OVERLAYS: PreviewOverlays = {
  bones: false, regions: false, meshHull: false, meshTriangles: false,
  boundingBoxes: false, paths: false, clipping: false,
  skeletonSize: false, animationBounds: false, grid: false,
}
export interface SequenceClip { animation: string; loop: boolean; mix: number; hold: number }
export interface ShowOptions { animation?: string; skin?: string; loop?: boolean; animationBounds?: Rect }
export type TimeListener = (time: number, duration: number) => void

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export class SpinePreview {
  private app?: Application
  private world = new Container()
  private grid = new Graphics()
  private overlay = new Graphics()
  private spine?: Spine
  private loaded?: LoadedSkeleton
  private debug?: SpineDebugRenderer
  private overlays: PreviewOverlays = { ...DEFAULT_OVERLAYS }
  private animationBounds?: Rect
  private animation?: string
  private loop = true
  private speed = 1
  private playing = true
  private listeners = new Set<TimeListener>()
  private sequence?: { total: number; elapsed: number; onProgress: (elapsed: number, total: number, done: boolean) => void }
  private drag?: { px: number; py: number; wx: number; wy: number }
  private detach: Array<() => void> = []
  private destroyed = false
  private savedMix?: { defaultMix: number; table: Record<string, number> }

  async mount(parent: HTMLElement): Promise<void> {
    const app = new Application()
    await app.init({ preference: 'webgl', backgroundAlpha: 0, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true, resizeTo: parent })
    if (this.destroyed) { app.destroy(true, { children: true }); return }
    this.app = app
    parent.appendChild(app.canvas)
    this.world.addChild(this.grid, this.overlay)
    app.stage.addChild(this.world)
    app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000))
    const ro = new ResizeObserver(() => app.resize())
    ro.observe(parent)
    this.detach.push(() => ro.disconnect())

    const canvas = app.canvas as HTMLCanvasElement
    const onWheel = (e: WheelEvent) => { e.preventDefault(); const r = canvas.getBoundingClientRect(); this.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top) }
    const onDown = (e: PointerEvent) => { this.drag = { px: e.clientX, py: e.clientY, wx: this.world.x, wy: this.world.y }; canvas.setPointerCapture(e.pointerId) }
    const onMove = (e: PointerEvent) => { if (!this.drag) return; this.world.position.set(this.drag.wx + e.clientX - this.drag.px, this.drag.wy + e.clientY - this.drag.py) }
    const onUp = () => { this.drag = undefined }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    this.detach.push(() => { canvas.removeEventListener('wheel', onWheel); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp) })
  }

  /** Removes the current skeleton from the stage (call before its textures are disposed). */
  clear(): void {
    this.sequence = undefined
    this.savedMix = undefined
    if (this.spine) { this.spine.debug = undefined; this.spine.destroy(); this.spine = undefined }
    this.loaded = undefined
    this.drawOverlay()
  }

  show(loaded: LoadedSkeleton, opts: ShowOptions): void {
    this.clear()
    this.loaded = loaded
    const spine = new Spine({ skeletonData: loaded.skeletonData, autoUpdate: false })
    this.world.addChildAt(spine, 1)
    this.spine = spine
    const data = loaded.skeletonData
    const wanted = opts.skin && data.findSkin(opts.skin) ? opts.skin : undefined
    const skin = wanted ?? data.skins.find((s) => s.name !== 'default')?.name ?? data.defaultSkin?.name
    if (skin) { spine.skeleton.setSkinByName(skin); spine.skeleton.setSlotsToSetupPose() }
    this.loop = opts.loop ?? this.loop
    this.animation = opts.animation && data.findAnimation(opts.animation) ? opts.animation : data.animations[0]?.name
    if (this.animation) spine.state.setAnimation(0, this.animation, this.loop)
    spine.update(0)
    this.animationBounds = opts.animationBounds
    this.applyDebug()
    this.drawOverlay()
    this.fit()
  }

  setAnimation(name: string, loop: boolean): void {
    this.sequence = undefined
    this.restoreMix()
    this.animation = name
    this.loop = loop
    if (!this.spine || !this.spine.skeleton.data.findAnimation(name)) return
    this.spine.state.setAnimation(0, name, loop)
    this.spine.update(0)
    this.emitTime()
  }

  setSkin(name: string): void {
    if (!this.spine || !this.spine.skeleton.data.findSkin(name)) return
    this.spine.skeleton.setSkinByName(name)
    this.spine.skeleton.setSlotsToSetupPose()
    this.spine.update(0)
  }

  setLoop(loop: boolean): void {
    this.loop = loop
    if (!this.spine || !this.animation) return
    const t = this.spine.state.getCurrent(0)?.trackTime ?? 0
    const entry = this.spine.state.setAnimation(0, this.animation, loop)
    entry.trackTime = t
    this.spine.update(0)
  }

  setSpeed(speed: number): void { this.speed = clamp(speed, 0, 3) }
  setPlaying(playing: boolean): void { this.playing = playing }

  seek(time: number): void {
    const entry = this.spine?.state.getCurrent(0)
    if (!this.spine || !entry) return
    entry.trackTime = Math.max(0, time)
    this.spine.update(0)
    this.emitTime()
  }

  getTime(): { time: number; duration: number } {
    const entry = this.spine?.state.getCurrent(0)
    if (!entry) return { time: 0, duration: 0 }
    const duration = entry.animation?.duration ?? 0
    const time = entry.loop && duration > 0 ? entry.trackTime % duration : Math.min(entry.trackTime, duration)
    return { time, duration }
  }

  onTime(listener: TimeListener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  setOverlays(overlays: Partial<PreviewOverlays>): void {
    Object.assign(this.overlays, overlays)
    this.applyDebug()
    this.drawOverlay()
  }

  setAnimationBounds(rect?: Rect): void { this.animationBounds = rect; this.drawOverlay() }

  fit(): void {
    if (!this.app || !this.spine || !this.loaded) return
    const data = this.loaded.skeletonData
    let rect: Rect
    if (data.width > 0 && data.height > 0) rect = { x: data.x, y: -(data.y + data.height), width: data.width, height: data.height }
    else { const b = this.spine.getLocalBounds(); rect = { x: b.minX, y: b.minY, width: Math.max(1, b.maxX - b.minX), height: Math.max(1, b.maxY - b.minY) } }
    const ab = this.animationBounds
    if (ab && ab.width > 0 && ab.height > 0) {
      const x0 = Math.min(rect.x, ab.x), y0 = Math.min(rect.y, -(ab.y + ab.height))
      const x1 = Math.max(rect.x + rect.width, ab.x + ab.width), y1 = Math.max(rect.y + rect.height, -ab.y)
      rect = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
    }
    const vw = this.app.screen.width, vh = this.app.screen.height
    const scale = clamp(Math.min(vw / (rect.width * 1.15), vh / (rect.height * 1.15)), 0.02, 20)
    this.world.scale.set(scale)
    this.world.position.set(vw / 2 - (rect.x + rect.width / 2) * scale, vh / 2 - (rect.y + rect.height / 2) * scale)
  }

  zoomBy(factor: number): void {
    if (!this.app) return
    this.zoomAt(factor, this.app.screen.width / 2, this.app.screen.height / 2)
  }

  playSequence(clips: SequenceClip[], onProgress: (elapsed: number, total: number, done: boolean) => void): void {
    if (!this.spine || !clips.length) return
    const state = this.spine.state
    const data = this.spine.skeleton.data
    if (!this.savedMix) this.savedMix = { defaultMix: state.data.defaultMix, table: state.data.animationToMixTime }
    state.data.animationToMixTime = {}
    state.data.defaultMix = 0
    for (let i = 1; i < clips.length; i++) state.data.setMix(clips[i - 1].animation, clips[i].animation, clips[i].mix)
    let total = 0
    clips.forEach((c, i) => {
      const anim = data.findAnimation(c.animation)
      total += c.loop ? c.hold : anim?.duration ?? 0
      if (i === 0) state.setAnimation(0, c.animation, c.loop)
      else state.addAnimation(0, c.animation, c.loop, clips[i - 1].loop ? clips[i - 1].hold : 0)
    })
    this.spine.update(0)
    this.playing = true
    this.sequence = { total, elapsed: 0, onProgress }
  }

  stopSequence(): void {
    this.sequence = undefined
    this.restoreMix()
    if (this.animation) this.setAnimation(this.animation, this.loop)
  }

  private restoreMix(): void {
    if (!this.spine || !this.savedMix) return
    this.spine.state.data.defaultMix = this.savedMix.defaultMix
    this.spine.state.data.animationToMixTime = this.savedMix.table
    this.savedMix = undefined
  }

  async capturePng(): Promise<Blob> {
    if (!this.app) throw new Error('preview não montado')
    const { width, height } = this.app.screen
    const canvas = this.app.renderer.extract.canvas({ target: this.app.stage, frame: new Rectangle(0, 0, width, height) }) as HTMLCanvasElement
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('captura falhou'))), 'image/png'))
  }

  canRecord(): boolean {
    return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm')
  }

  startRecording(): () => Promise<Blob> {
    if (!this.app) throw new Error('preview não montado')
    const stream = (this.app.canvas as HTMLCanvasElement).captureStream(60)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    recorder.start(250)
    return () => new Promise<Blob>((resolve) => {
      recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); resolve(new Blob(chunks, { type: 'video/webm' })) }
      recorder.stop()
    })
  }

  destroy(): void {
    this.destroyed = true
    for (const off of this.detach) off()
    this.detach = []
    this.listeners.clear()
    if (this.spine) { this.spine.debug = undefined; this.spine.destroy(); this.spine = undefined }
    this.app?.destroy(true, { children: true })
    this.app = undefined
  }

  private tick(dt: number): void {
    if (!this.spine) return
    if (this.playing) {
      this.spine.update(dt * this.speed)
      if (this.sequence) {
        this.sequence.elapsed += dt * this.speed
        const done = this.sequence.elapsed >= this.sequence.total
        this.sequence.onProgress(Math.min(this.sequence.elapsed, this.sequence.total), this.sequence.total, done)
        if (done) { this.sequence = undefined; this.restoreMix() }
      }
    }
    this.emitTime()
  }

  private emitTime(): void {
    const { time, duration } = this.getTime()
    for (const l of this.listeners) l(time, duration)
  }

  private zoomAt(factor: number, px: number, py: number): void {
    const w = this.world
    const next = clamp(w.scale.x * factor, 0.02, 20)
    const k = next / w.scale.x
    w.position.set(px - (px - w.x) * k, py - (py - w.y) * k)
    w.scale.set(next)
  }

  private applyDebug(): void {
    if (!this.spine) return
    const o = this.overlays
    const any = o.bones || o.regions || o.meshHull || o.meshTriangles || o.boundingBoxes || o.paths || o.clipping
    if (!any) { this.spine.debug = undefined; return }
    const d = this.debug ?? (this.debug = new SpineDebugRenderer())
    d.drawBones = o.bones
    d.drawRegionAttachments = o.regions
    d.drawMeshHull = o.meshHull
    d.drawMeshTriangles = o.meshTriangles
    d.drawBoundingBoxes = o.boundingBoxes
    d.drawPaths = o.paths
    d.drawClipping = o.clipping
    d.drawEvents = false
    this.spine.debug = d
  }

  private drawOverlay(): void {
    const g = this.overlay
    g.clear()
    this.grid.clear()
    if (this.overlays.grid) {
      const G = this.grid
      for (let v = -4000; v <= 4000; v += 100) { G.moveTo(v, -4000).lineTo(v, 4000); G.moveTo(-4000, v).lineTo(4000, v) }
      G.stroke({ color: 0x2a2d3d, width: 1, pixelLine: true })
      G.moveTo(-4000, 0).lineTo(4000, 0).moveTo(0, -4000).lineTo(0, 4000).stroke({ color: 0x4a4e66, width: 1, pixelLine: true })
    }
    const data = this.loaded?.skeletonData
    if (this.overlays.skeletonSize && data && data.width > 0) {
      g.rect(data.x, -(data.y + data.height), data.width, data.height).stroke({ color: 0x7a6fd0, width: 1, pixelLine: true })
    }
    const b = this.animationBounds
    if (this.overlays.animationBounds && b && b.width > 0) {
      g.rect(b.x, -(b.y + b.height), b.width, b.height).stroke({ color: 0xd8b45e, width: 1, pixelLine: true })
    }
  }
}
