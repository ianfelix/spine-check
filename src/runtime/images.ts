import type { FileRef, ImageFormat } from '../core/types'
import type { DecodedImage } from './types'

export interface DecodeResult { images: Map<string, DecodedImage>; errors: Array<{ name: string; error: string }> }

export function formatOf(name: string): ImageFormat {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (ext === 'png') return 'png'
  if (ext === 'webp') return 'webp'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
  return 'unknown'
}

export async function decodeImages(refs: FileRef[]): Promise<DecodeResult> {
  const images = new Map<string, DecodedImage>()
  const errors: Array<{ name: string; error: string }> = []
  for (const ref of refs) {
    try {
      const bitmap = await createImageBitmap(ref.file, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
      images.set(ref.name, { bitmap, info: { name: ref.name, width: bitmap.width, height: bitmap.height, bytes: ref.size, format: formatOf(ref.name) } })
    } catch (e) {
      errors.push({ name: ref.name, error: (e as Error).message })
    }
  }
  return { images, errors }
}
