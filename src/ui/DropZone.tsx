import { useRef, useState, type DragEvent } from 'react'
import type { InputFile } from '../core/types'
import { S } from './strings'
import { filesFromDrop, filesFromInput } from './walkDrop'

export function useFilePickers(onFiles: (files: InputFile[]) => void) {
  const folderRef = useRef<HTMLInputElement | null>(null)
  const filesRef = useRef<HTMLInputElement | null>(null)
  const inputs = (
    <>
      <input ref={(el) => { folderRef.current = el; el?.setAttribute('webkitdirectory', '') }} type="file" multiple hidden onChange={(e) => { if (e.target.files) onFiles(filesFromInput(e.target.files)); e.target.value = '' }} />
      <input ref={filesRef} type="file" multiple hidden accept=".json,.skel,.atlas,.png,.webp,.jpg,.jpeg" onChange={(e) => { if (e.target.files) onFiles(filesFromInput(e.target.files)); e.target.value = '' }} />
    </>
  )
  return { inputs, openFolder: () => folderRef.current?.click(), openFiles: () => filesRef.current?.click() }
}

export function useDropHandlers(onFiles: (files: InputFile[]) => void) {
  const [over, setOver] = useState(false)
  const handlers = {
    onDragOver: (e: DragEvent) => { e.preventDefault(); setOver(true) },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent) => { e.preventDefault(); setOver(false); void filesFromDrop(e.dataTransfer).then(onFiles) },
  }
  return { over, handlers }
}

export function DropZone({ onFiles, onSample }: { onFiles: (files: InputFile[]) => void; onSample: () => void }) {
  const pick = useFilePickers(onFiles)
  const { over, handlers } = useDropHandlers(onFiles)
  return (
    <div className="dropzone" {...handlers}>
      <div className={`card${over ? ' over' : ''}`}>
        <h2>{S.dropTitle}</h2>
        <p>{S.dropHint}</p>
        <div className="actions">
          <button className="btn primary" onClick={pick.openFolder}><i className="ph ph-folder-open" />{S.selectFolder}</button>
          <button className="btn" onClick={pick.openFiles}><i className="ph ph-files" />{S.selectFiles}</button>
        </div>
        <div className="sample"><a href="#" onClick={(e) => { e.preventDefault(); onSample() }}>{S.loadSample}</a></div>
        {pick.inputs}
      </div>
    </div>
  )
}
