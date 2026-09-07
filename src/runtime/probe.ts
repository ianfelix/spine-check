import { Animation, AnimationState, AnimationStateData, Physics, Skeleton, SkeletonData, Vector2 } from '@esotericsoftware/spine-core'
import type { AnimationStats, Finding, Thresholds } from '../core/types'
import { diffPose, hasNaN, snapshotPose } from './pose'
import type { LoadedSkeleton } from './types'

export interface ProbeResult { animations: AnimationStats[]; findings: Finding[] }

export function probeOne(data: SkeletonData, anim: Animation, dt: number, skinName?: string): AnimationStats {
  const skeleton = new Skeleton(data)
  if (skinName) skeleton.setSkinByName(skinName)
  skeleton.setToSetupPose()
  const state = new AnimationState(new AnimationStateData(data))
  const events: Array<{ name: string; time: number }> = []
  state.addListener({ event: (_entry, ev) => events.push({ name: ev.data.name, time: ev.time }) })
  state.setAnimation(0, anim.name, false)

  const offset = new Vector2()
  const size = new Vector2()
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let nan = false
  const step = (delta: number) => {
    state.update(delta)
    state.apply(skeleton)
    skeleton.updateWorldTransform(Physics.update)
    if (hasNaN(skeleton)) nan = true
    skeleton.getBounds(offset, size)
    if (size.x > 0 || size.y > 0) {
      minX = Math.min(minX, offset.x); minY = Math.min(minY, offset.y)
      maxX = Math.max(maxX, offset.x + size.x); maxY = Math.max(maxY, offset.y + size.y)
    }
  }
  step(0)
  const first = snapshotPose(skeleton)
  let t = 0
  while (t < anim.duration) {
    const d = Math.min(dt, anim.duration - t)
    step(d)
    t += d
  }
  const seamDiff = anim.duration > 0 ? diffPose(first, snapshotPose(skeleton)) : []
  const bounds = Number.isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : { x: 0, y: 0, width: 0, height: 0 }
  return { name: anim.name, duration: anim.duration, events, seamless: seamDiff.length === 0, seamDiff: seamDiff.slice(0, 5), bounds, nan }
}

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

export async function probeSkeleton(loaded: LoadedSkeleton, bundleName: string, settings: Thresholds, onProgress?: (done: number, total: number) => void): Promise<ProbeResult> {
  const data = loaded.skeletonData
  const findings: Finding[] = []
  const animations: AnimationStats[] = []
  const totalSeconds = data.animations.reduce((n, a) => n + a.duration, 0)
  let dt = 1 / 60
  if (totalSeconds / dt > settings.probeMaxSteps) {
    dt = totalSeconds / settings.probeMaxSteps
    findings.push({ code: 'runtime.probe-subsampled', severity: 'info', message: `Probe step raised to ${(dt * 1000).toFixed(1)} ms to fit the budget of ${settings.probeMaxSteps} steps.`, bundle: bundleName })
  }
  const skinName = data.skins.find((s) => s.name !== 'default')?.name ?? data.defaultSkin?.name ?? undefined
  for (let i = 0; i < data.animations.length; i++) {
    animations.push(probeOne(data, data.animations[i], dt, skinName))
    onProgress?.(i + 1, data.animations.length)
    await yieldToUi()
  }
  for (const a of animations) {
    if (a.nan) findings.push({ code: 'runtime.nan', severity: 'error', message: `Animation "${a.name}" produces NaN in bone transforms.`, hint: 'A constraint or a bone with zero scale; check IK, transform and physics.', bundle: bundleName, subject: { kind: 'animation', name: a.name } })
  }
  return { animations, findings }
}
