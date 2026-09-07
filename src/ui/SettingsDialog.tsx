import { Fragment, useState } from 'react'
import type { Thresholds } from '../core/types'
import { DEFAULT_THRESHOLDS, mergeThresholds } from '../core/settings'
import { S } from './strings'

type NumericKey = Exclude<keyof Thresholds, 'runtimeVersion' | 'suspiciousPatterns'>
const NUMERIC: NumericKey[] = ['pageMaxWarn', 'pageMaxError', 'pagesWarn', 'occupancyWarn', 'pngWarnBytes', 'gpuMemoryWarnBytes', 'meshVerticesWarn', 'trianglesWarn', 'deformWarn', 'skeletonSizeWarn', 'probeMaxSteps']

export function SettingsDialog({ settings, onSave, onClose }: { settings: Thresholds; onSave: (t: Thresholds) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Thresholds>({ ...settings, suspiciousPatterns: [...settings.suspiciousPatterns] })
  const [patterns, setPatterns] = useState(settings.suspiciousPatterns.join(', '))
  const t = S.settingsDialog
  const save = () => onSave(mergeThresholds({ ...draft, suspiciousPatterns: patterns.split(',').map((p) => p.trim()).filter(Boolean) }))
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 92vw)' }}>
        <div className="head">{t.title}</div>
        <div className="body">
          <div className="form">
            <label htmlFor="runtimeVersion">{t.fields.runtimeVersion}</label>
            <input id="runtimeVersion" type="text" value={draft.runtimeVersion} onChange={(e) => setDraft({ ...draft, runtimeVersion: e.target.value })} />
            {NUMERIC.map((k) => (
              <Fragment key={k}>
                <label htmlFor={k}>{t.fields[k]}</label>
                <input id={k} type="number" step={k === 'occupancyWarn' ? 0.05 : 1} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })} />
              </Fragment>
            ))}
            <label htmlFor="suspiciousPatterns">{t.fields.suspiciousPatterns}</label>
            <input id="suspiciousPatterns" type="text" value={patterns} onChange={(e) => setPatterns(e.target.value)} />
          </div>
        </div>
        <div className="foot">
          <button className="btn" onClick={() => { setDraft({ ...DEFAULT_THRESHOLDS }); setPatterns(DEFAULT_THRESHOLDS.suspiciousPatterns.join(', ')) }}>{t.reset}</button>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>{t.cancel}</button>
          <button className="btn primary" onClick={save}>{t.save}</button>
        </div>
      </div>
    </div>
  )
}
