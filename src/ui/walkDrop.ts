import type { InputFile } from '../core/types'
import { toInputFile } from '../core/bundle'

function readAll(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const out: FileSystemEntry[] = []
    const next = () => reader.readEntries((batch) => { if (!batch.length) { resolve(out); return } out.push(...batch); next() }, reject)
    next()
  })
}

function fileOf(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

async function walk(entry: FileSystemEntry, prefix: string, out: InputFile[]): Promise<void> {
  if (entry.isFile) {
    out.push(toInputFile(await fileOf(entry as FileSystemFileEntry), prefix + entry.name))
    return
  }
  if (entry.isDirectory) {
    for (const e of await readAll((entry as FileSystemDirectoryEntry).createReader())) await walk(e, `${prefix}${entry.name}/`, out)
  }
}

/** Must be called synchronously inside the drop handler: DataTransfer items expire after the first await. */
export function filesFromDrop(dt: DataTransfer): Promise<InputFile[]> {
  const entries = [...dt.items].map((i) => (typeof i.webkitGetAsEntry === 'function' ? i.webkitGetAsEntry() : null))
  const plain = [...dt.files]
  return (async () => {
    const out: InputFile[] = []
    if (entries.some(Boolean)) { for (const e of entries) if (e) await walk(e, '', out); return out }
    for (const f of plain) out.push(toInputFile(f))
    return out
  })()
}

export function filesFromInput(list: FileList): InputFile[] {
  return [...list].map((f) => toInputFile(f))
}
