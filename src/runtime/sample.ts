import type { InputFile } from '../core/types'

const PNG_COIN = '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'

const ATLAS = 'sample.png\nsize: 64,64\nfilter: Linear,Linear\npma: false\ncoin\n\tbounds: 0, 0, 64, 64\nunused_shine\n\tbounds: 0, 0, 16, 16\n'

const SKELETON = {
  skeleton: { hash: 'sample', spine: '4.2.43', x: -32, y: -32, width: 64, height: 64, images: './images/' },
  bones: [{ name: 'root' }, { name: 'coin', parent: 'root' }, { name: 'stray', parent: 'root' }],
  slots: [{ name: 'coin', bone: 'coin', attachment: 'coin' }],
  skins: [{ name: 'default', attachments: { coin: { coin: { width: 64, height: 64 } } } }],
  events: { flip: {} },
  animations: {
    spin: { bones: { coin: { scale: [{ x: 1, y: 1 }, { time: 0.5, x: -1, y: 1 }, { time: 1, x: 1, y: 1 }] } }, events: [{ time: 0.5, name: 'flip' }] },
    bounce: { bones: { coin: { translate: [{ x: 0, y: 0 }, { time: 0.5, x: 0, y: 40 }, { time: 1, x: 0, y: 0 }] } } },
    drift: { bones: { coin: { translate: [{ x: 0, y: 0 }, { time: 1, x: 80, y: 0 }] } } },
    'backup/old_spin': {},
  },
}

/** Built-in sample: a coin with a few deliberate delivery defects (stray texture, unused region and bone, leftover animation, nonessential data). */
export function sampleInputFiles(): InputFile[] {
  const png = Uint8Array.from(atob(PNG_COIN), (c) => c.charCodeAt(0))
  const mk = (name: string, data: BlobPart, type: string): InputFile => {
    const file = new File([data], name, { type })
    return { path: `sample/${name}`, name, ext: name.slice(name.lastIndexOf('.') + 1), size: file.size, file }
  }
  return [
    mk('sample.json', JSON.stringify(SKELETON, null, 2), 'application/json'),
    mk('sample.atlas', ATLAS, 'text/plain'),
    mk('sample.png', png, 'image/png'),
    mk('stray.png', png, 'image/png'),
  ]
}
