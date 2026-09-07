import { useState } from 'react'
import type { AnimationStats } from '../core/types'
import type { PreviewOverlays } from '../runtime/preview'
import { S } from './strings'

export type Background = 'dark' | 'light' | 'checker'

export interface ControlsState {
  animation: string; skin: string; loop: boolean; speed: number; playing: boolean
  time: number; duration: number; variant: string; background: Background; pma: boolean | undefined
  overlays: PreviewOverlays; recording: boolean
}
interface Props {
  state: ControlsState
  animations: string[]; skins: string[]; variants: string[]; stats: AnimationStats[]
  canRecord: boolean
  onChange: (patch: Partial<ControlsState>) => void
  onSeek: (t: number) => void
  onFit: () => void; onZoom: (f: number) => void
  onCapture: () => void; onRecord: () => void
}

const fmt = (t: number) => t.toFixed(2)

export function PreviewControls({ state, animations, skins, variants, stats, canRecord, onChange, onSeek, onFit, onZoom, onCapture, onRecord }: Props) {
  const [menu, setMenu] = useState(false)
  const stat = stats.find((s) => s.name === state.animation)
  return (
    <>
      <div className="controls">
        <label className="field">{S.preview.animation}
          <select value={state.animation} onChange={(e) => onChange({ animation: e.target.value })}>
            {animations.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="field">{S.preview.skin}
          <select value={state.skin} onChange={(e) => onChange({ skin: e.target.value })}>
            {skins.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button className={`btn icon${state.playing ? '' : ' on'}`} title={state.playing ? S.preview.pause : S.preview.play} onClick={() => onChange({ playing: !state.playing })}>
          <i className={`ph ${state.playing ? 'ph-pause' : 'ph-play'}`} />
        </button>
        <button className={`btn${state.loop ? ' on' : ''}`} onClick={() => onChange({ loop: !state.loop })}><i className="ph ph-repeat" />{S.preview.loop}</button>
        <label className="field">{S.preview.speed}
          <input type="range" min={0} max={3} step={0.05} value={state.speed} onChange={(e) => onChange({ speed: Number(e.target.value) })} />
          <input type="number" min={0} max={3} step={0.05} value={state.speed} style={{ width: 56 }} onChange={(e) => onChange({ speed: Number(e.target.value) })} />
        </label>
        <div className="scrub">
          <input type="range" min={0} max={state.duration || 0} step={1 / 60} value={Math.min(state.time, state.duration || 0)} onChange={(e) => onSeek(Number(e.target.value))} />
          <span className="time">{fmt(state.time)} / {fmt(state.duration)} s{stat && !stat.seamless ? ' · ✗ seam' : ''}</span>
        </div>
        {variants.length > 0 && (
          <span className="seg" title={S.preview.variant}>
            <button className={state.variant === '' ? 'on' : ''} onClick={() => onChange({ variant: '' })}>{S.preview.root}</button>
            {variants.map((v) => <button key={v} className={state.variant === v ? 'on' : ''} onClick={() => onChange({ variant: v })}>{v}</button>)}
          </span>
        )}
      </div>
      <div className="controls">
        <button className="btn icon" title={S.preview.fit} onClick={onFit}><i className="ph ph-arrows-in" /></button>
        <button className="btn icon" title={S.preview.zoomOut} onClick={() => onZoom(1 / 1.25)}><i className="ph ph-minus" /></button>
        <button className="btn icon" title={S.preview.zoomIn} onClick={() => onZoom(1.25)}><i className="ph ph-plus" /></button>
        <span className="seg">
          {(['dark', 'light', 'checker'] as Background[]).map((b) => <button key={b} className={state.background === b ? 'on' : ''} onClick={() => onChange({ background: b })}>{S.preview.bg[b]}</button>)}
        </span>
        <button className={`btn${state.pma ? ' on' : ''}`} title="Premultiplied alpha" onClick={() => onChange({ pma: !state.pma })}>{S.preview.pma}</button>
        <button className={`btn${state.overlays.grid ? ' on' : ''}`} onClick={() => onChange({ overlays: { ...state.overlays, grid: !state.overlays.grid } })}><i className="ph ph-grid-four" />{S.preview.grid}</button>
        <span className="menu">
          <button className="btn" onClick={() => setMenu((m) => !m)}><i className="ph ph-eye" />{S.preview.overlays}</button>
          {menu && (
            <>
              <div className="menu-scrim" onClick={() => setMenu(false)} />
              <div className="pop" role="dialog" aria-label={S.preview.overlays}>
                {(Object.keys(S.overlays) as Array<keyof PreviewOverlays>).map((k) => (
                  <label key={k}><input type="checkbox" checked={state.overlays[k]} onChange={(e) => onChange({ overlays: { ...state.overlays, [k]: e.target.checked } })} />{S.overlays[k]}</label>
                ))}
                <button className="btn pop-close" onClick={() => setMenu(false)}>{S.preview.close}</button>
              </div>
            </>
          )}
        </span>
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn" onClick={onCapture}><i className="ph ph-camera" />{S.preview.capture}</button>
        <button className={`btn${state.recording ? ' on' : ''}`} disabled={!canRecord} onClick={onRecord}><i className={`ph ${state.recording ? 'ph-stop' : 'ph-record'}`} />{state.recording ? S.preview.stopRecord : S.preview.record}</button>
      </div>
    </>
  )
}
