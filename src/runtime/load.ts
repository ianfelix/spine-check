import { AtlasAttachmentLoader, SkeletonBinary, SkeletonJson, TextureAtlas, type SkeletonData } from '@esotericsoftware/spine-core'
import { SpineTexture } from '@esotericsoftware/spine-pixi-v8'
import { ImageSource } from 'pixi.js'
import type { LoadInput, LoadedSkeleton } from './types'

export { summaryFromRuntime } from './summary'

/** The returned skeleton owns `input.images`: `dispose()` closes every bitmap. */
export function loadSkeleton(input: LoadInput): LoadedSkeleton {
  const atlas = new TextureAtlas(input.atlasText)
  const sources: ImageSource[] = []
  const destroySources = () => { for (const s of sources) if (!s.destroyed) s.destroy() }
  let pma = false
  try {
    for (const page of atlas.pages) {
      const bitmap = input.images.get(page.name)
      if (!bitmap) throw new Error(`image for page "${page.name}" not found`)
      const premultiplied = input.pmaOverride ?? page.pma
      pma = premultiplied
      const source = new ImageSource({
        resource: bitmap,
        alphaMode: premultiplied ? 'premultiplied-alpha' : 'premultiply-alpha-on-upload',
        label: page.name,
      })
      sources.push(source)
      page.setTexture(SpineTexture.from(source))
    }
    const loader = new AtlasAttachmentLoader(atlas)
    let skeletonData: SkeletonData
    if (input.json !== undefined) skeletonData = new SkeletonJson(loader).readSkeletonData(input.json)
    else if (input.skel) skeletonData = new SkeletonBinary(loader).readSkeletonData(input.skel)
    else throw new Error('skeleton missing')
    let disposed = false
    return {
      skeletonData,
      atlas,
      pma,
      dispose() {
        if (disposed) return
        disposed = true
        atlas.dispose()
        destroySources()
        for (const b of input.images.values()) b.close()
      },
    }
  } catch (e) {
    destroySources()
    throw e
  }
}
