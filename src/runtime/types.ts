import type { SkeletonData, TextureAtlas } from '@esotericsoftware/spine-core'
import type { ImageInfo } from '../core/types'

export interface DecodedImage { info: ImageInfo; bitmap: ImageBitmap }
export interface LoadInput {
  atlasText: string
  json?: unknown
  skel?: Uint8Array
  images: Map<string, ImageBitmap>
  pmaOverride?: boolean
}
export interface LoadedSkeleton {
  skeletonData: SkeletonData
  atlas: TextureAtlas
  pma: boolean
  dispose(): void
}
