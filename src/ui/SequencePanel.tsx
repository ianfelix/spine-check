import { useState } from 'react'
import type { SequenceClip } from '../runtime/preview'
import { S } from './strings'

interface Props {
  animations: string[]
  progress: { elapsed: number; total: number } | null
  onPlay: (clips: SequenceClip[]) => void
  onStop: () => void
}

export function SequencePanel({ animations, progress, onPlay, onStop }: Props) {
  const [open, setOpen] = useState(false)
  const [clips, setClips] = useState<SequenceClip[]>([])
  const update = (i: number, patch: Partial<SequenceClip>) => setClips((c) => c.map((clip, j) => (j === i ? { ...clip, ...patch } : clip)))
  const move = (i: number, d: -1 | 1) => setClips((c) => { const n = [...c]; const j = i + d; if (j < 0 || j >= n.length) return c; [n[i], n[j]] = [n[j], n[i]]; return n })
  return (
    <div className="sequence">
      <div className="head" onClick={() => setOpen((o) => !o)}>
        <i className={`ph ${open ? 'ph-caret-down' : 'ph-caret-right'}`} />{S.sequence.title}
        {clips.length > 0 && <span className="chip">{clips.length}</span>}
      </div>
      {open && (
        <div className="body">
          {clips.map((clip, i) => (
            <div key={i} className="clip">
              <label className="field"><select value={clip.animation} onChange={(e) => update(i, { animation: e.target.value })}>{animations.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
              <label className="field"><input type="checkbox" checked={clip.loop} onChange={(e) => update(i, { loop: e.target.checked })} />{S.sequence.loop}</label>
              <label className="field">{S.sequence.mix}<input type="number" min={0} max={5} step={0.05} value={clip.mix} style={{ width: 60 }} onChange={(e) => update(i, { mix: Number(e.target.value) })} /></label>
              {clip.loop && <label className="field">{S.sequence.hold}<input type="number" min={0} max={60} step={0.5} value={clip.hold} style={{ width: 60 }} onChange={(e) => update(i, { hold: Number(e.target.value) })} /></label>}
              <button className="btn icon" title={S.sequence.up} onClick={() => move(i, -1)}><i className="ph ph-arrow-up" /></button>
              <button className="btn icon" title={S.sequence.down} onClick={() => move(i, 1)}><i className="ph ph-arrow-down" /></button>
              <button className="btn icon" title={S.sequence.remove} onClick={() => setClips((c) => c.filter((_, j) => j !== i))}><i className="ph ph-x" /></button>
            </div>
          ))}
          <div className="clip">
            <button className="btn" disabled={!animations.length} onClick={() => setClips((c) => [...c, { animation: animations[0], loop: false, mix: 0.2, hold: 2 }])}><i className="ph ph-plus" />{S.sequence.add}</button>
            <button className="btn primary" disabled={!clips.length} onClick={() => onPlay(clips)}><i className="ph ph-play" />{S.sequence.play}</button>
            <button className="btn" disabled={!progress} onClick={onStop}><i className="ph ph-stop" />{S.sequence.stop}</button>
            {progress && <span className="time">{progress.elapsed.toFixed(1)} / {progress.total.toFixed(1)} s {S.sequence.total}</span>}
          </div>
          {progress && <progress value={progress.elapsed} max={progress.total || 1} />}
        </div>
      )}
    </div>
  )
}
