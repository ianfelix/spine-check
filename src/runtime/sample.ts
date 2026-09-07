import type { InputFile } from '../core/types'

const PNG_8X8 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVR4nGP4fyLgPz7MMDIUAADr88WB+e1yAwAAAABJRU5ErkJggg=='

const ATLAS = 'sample.png\nsize: 8,8\nfilter: Linear,Linear\npma: false\ndot\n\tbounds: 0, 0, 8, 8\nunused_dot\n\tbounds: 0, 0, 4, 4\n'

const SKELETON = {
  skeleton: { hash: 'sample', spine: '4.2.43', x: -40, y: -40, width: 80, height: 80, images: './images/' },
  bones: [{ name: 'root' }, { name: 'dot', parent: 'root', scaleX: 10, scaleY: 10 }, { name: 'stray', parent: 'root' }],
  slots: [{ name: 'dot', bone: 'dot', attachment: 'dot' }],
  skins: [{ name: 'default', attachments: { dot: { dot: { width: 8, height: 8 } } } }],
  events: { beat: {} },
  animations: {
    pulse: { bones: { dot: { scale: [{ x: 1, y: 1 }, { time: 0.5, x: 1.4, y: 1.4 }, { time: 1, x: 1, y: 1 }] } }, events: [{ time: 0.5, name: 'beat' }] },
    slide: { bones: { dot: { translate: [{ x: 0, y: 0 }, { time: 1, x: 60, y: 0 }] } } },
    'backup/old_pulse': {},
  },
}

export function sampleInputFiles(): InputFile[] {
  const png = Uint8Array.from(atob(PNG_8X8), (c) => c.charCodeAt(0))
  const mk = (name: string, data: BlobPart, type: string): InputFile => {
    const file = new File([data], name, { type })
    return { path: `exemplo/${name}`, name, ext: name.slice(name.lastIndexOf('.') + 1), size: file.size, file }
  }
  return [
    mk('sample.json', JSON.stringify(SKELETON, null, 2), 'application/json'),
    mk('sample.atlas', ATLAS, 'text/plain'),
    mk('sample.png', png, 'image/png'),
    mk('stray.png', png, 'image/png'),
  ]
}
