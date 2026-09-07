import type { SkeletonDoc } from '../types'

export const DOC: SkeletonDoc = {
  skeleton: { hash: 'abc', spine: '4.2.43', x: -50, y: 0, width: 100, height: 200, images: './images/' },
  bones: [
    { name: 'root' },
    { name: 'hip', parent: 'root' },
    { name: 'arm', parent: 'hip' },
    { name: 'stray', parent: 'root' },
    { name: 'ctrl', parent: 'root' },
  ],
  slots: [
    { name: 'body', bone: 'hip', attachment: 'body' },
    { name: 'arm', bone: 'arm', blend: 'additive' },
    { name: 'empty', bone: 'hip' },
  ],
  ik: [{ name: 'ik1', bones: ['arm'], target: 'ctrl' }],
  skins: [
    {
      name: 'default',
      attachments: {
        body: {
          body: { width: 10, height: 10 },
          sword: { type: 'mesh', path: 'weapons/sword', uvs: [0, 0, 1, 0, 1, 1, 0, 1], triangles: [0, 1, 2, 2, 3, 0] },
          mask: { type: 'clipping', end: 'arm', vertices: [0, 0, 1, 0, 1, 1] },
        },
        arm: {
          arm: { path: 'arm_img' },
          fx: { type: 'region', sequence: { count: 2, start: 1, digits: 2 } },
        },
      },
    },
    { name: 'ghost' },
  ],
  events: { hit: {}, never: {} },
  animations: {
    idle: {
      bones: { hip: { rotate: [{ value: 0 }, { time: 1, value: 10 }] } },
      events: [{ time: 0.5, name: 'hit' }],
      attachments: { default: { body: { sword: { deform: [{}] } } } },
    },
    'backup/old_walk': {},
  },
}
