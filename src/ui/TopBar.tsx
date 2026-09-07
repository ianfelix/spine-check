import type { InputFile } from '../core/types'
import { RUNTIME_VERSION } from '../core/settings'
import { useFilePickers } from './DropZone'
import { S } from './strings'

interface Props {
  busy: boolean
  hasResults: boolean
  onFiles: (files: InputFile[]) => void
  onReport: () => void
  onSettings: () => void
  onClear: () => void
}

export function TopBar({ busy, hasResults, onFiles, onReport, onSettings, onClear }: Props) {
  const pick = useFilePickers(onFiles)
  return (
    <header className="topbar">
      <span className="title">{S.appName}</span>
      <span className="badge">{S.runtime(RUNTIME_VERSION)}</span>
      {busy && <span className="chip">{S.busy}</span>}
      <span className="spacer" />
      <button className="btn" onClick={pick.openFolder} title={S.selectFolder}><i className="ph ph-folder-open" /><span className="btn-label">{S.add}</span></button>
      <button className="btn icon" onClick={pick.openFiles} title={S.selectFiles}><i className="ph ph-files" /></button>
      <button className="btn" onClick={onClear} disabled={!hasResults} title={S.clearAll}><i className="ph ph-trash" /><span className="btn-label">{S.clearAll}</span></button>
      <button className="btn primary" onClick={onReport} disabled={!hasResults} title={S.report}><i className="ph ph-file-text" /><span className="btn-label">{S.report}</span></button>
      <button className="btn icon" onClick={onSettings} title={S.settings}><i className="ph ph-gear" /></button>
      {pick.inputs}
    </header>
  )
}
