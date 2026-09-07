export type Severity = 'error' | 'warning' | 'info'
export type SubjectKind =
  | 'file' | 'bone' | 'slot' | 'skin' | 'attachment' | 'animation' | 'event' | 'page' | 'region'

export interface Finding {
  code: string
  severity: Severity
  message: string
  detail?: string
  hint?: string
  bundle: string
  variant?: string
  subject?: { kind: SubjectKind; name: string }
}

export interface InputFile { path: string; name: string; ext: string; size: number; file: File }
export interface FileRef { path: string; name: string; size: number; file: File }

export type ImageFormat = 'png' | 'webp' | 'jpg' | 'unknown'
export interface ImageInfo { name: string; width: number; height: number; bytes: number; format: ImageFormat }

export interface BundleFiles {
  dir: string
  json?: FileRef
  skel?: FileRef
  atlas?: FileRef
  textures: FileRef[]
}
export interface BundleVariant extends BundleFiles { factor: number; label: string }
export interface SpineBundle extends BundleFiles {
  name: string
  key: string
  variants: BundleVariant[]
  unreferencedTextures: FileRef[]
}

export interface AtlasRegion {
  page: number
  name: string
  index: number
  x: number; y: number; width: number; height: number
  rotate: number
  offsetX: number; offsetY: number; originalWidth: number; originalHeight: number
}
export interface AtlasPage {
  name: string
  width?: number; height?: number
  format?: string
  minFilter?: string; magFilter?: string
  repeat?: string
  pma?: boolean
  scale?: number
  regions: AtlasRegion[]
}
export interface AtlasData { pages: AtlasPage[]; regions: AtlasRegion[]; errors: string[] }

export interface SkeletonHeader {
  hash?: string; spine?: string
  x?: number; y?: number; width?: number; height?: number
  fps?: number; images?: string; audio?: string
}
export interface SkeletonBone {
  name: string; parent?: string; length?: number
  x?: number; y?: number; rotation?: number; scaleX?: number; scaleY?: number; shearX?: number; shearY?: number
  inherit?: string; color?: string; icon?: string
}
export interface SkeletonSlot {
  name: string; bone: string; color?: string; dark?: string; attachment?: string
  blend?: 'normal' | 'additive' | 'multiply' | 'screen'
}
export interface SkeletonConstraint { name: string; bones?: string[]; target?: string; bone?: string; [k: string]: unknown }
export interface SkeletonSequence { count: number; start?: number; digits?: number; setup?: number }
export interface SkeletonAttachment {
  type?: 'region' | 'mesh' | 'linkedmesh' | 'boundingbox' | 'path' | 'point' | 'clipping'
  name?: string; path?: string
  sequence?: SkeletonSequence
  uvs?: number[]; triangles?: number[]; vertices?: number[]; hull?: number; vertexCount?: number
  parent?: string; skin?: string; end?: string
  [k: string]: unknown
}
export type SkinAttachments = Record<string, Record<string, SkeletonAttachment>>
export interface SkeletonSkin {
  name: string
  bones?: string[]; ik?: string[]; transform?: string[]; path?: string[]; physics?: string[]
  attachments?: SkinAttachments
}
export interface SkeletonEventDef { int?: number; float?: number; string?: string; audio?: string; volume?: number; balance?: number }
export interface SkeletonAnimation {
  slots?: Record<string, Record<string, unknown[]>>
  bones?: Record<string, Record<string, unknown[]>>
  ik?: Record<string, unknown[]>
  transform?: Record<string, unknown[]>
  path?: Record<string, unknown>
  physics?: Record<string, unknown>
  attachments?: Record<string, Record<string, Record<string, Record<string, unknown[]>>>>
  drawOrder?: unknown[]
  events?: Array<{ time?: number; name: string }>
}
export interface SkeletonDoc {
  skeleton?: SkeletonHeader
  bones?: SkeletonBone[]
  slots?: SkeletonSlot[]
  ik?: SkeletonConstraint[]; transform?: SkeletonConstraint[]; path?: SkeletonConstraint[]; physics?: SkeletonConstraint[]
  skins?: SkeletonSkin[] | Record<string, SkinAttachments>
  events?: Record<string, SkeletonEventDef>
  animations?: Record<string, SkeletonAnimation>
}

export interface Thresholds {
  runtimeVersion: string
  pageMaxWarn: number
  pageMaxError: number
  pagesWarn: number
  occupancyWarn: number
  pngWarnBytes: number
  gpuMemoryWarnBytes: number
  meshVerticesWarn: number
  trianglesWarn: number
  deformWarn: number
  skeletonSizeWarn: number
  suspiciousPatterns: string[]
  probeMaxSteps: number
}

export interface VariantContext {
  label: string
  factor: number
  files: BundleVariant
  skeletonText?: string
  skeleton?: SkeletonDoc
  skeletonError?: string
  atlas?: AtlasData
  images: Map<string, ImageInfo>
}
export interface CheckContext {
  bundle: SpineBundle
  skeletonText?: string
  skeleton?: SkeletonDoc
  skeletonError?: string
  prettyRatio?: number
  atlas?: AtlasData
  images: Map<string, ImageInfo>
  variants: VariantContext[]
  settings: Thresholds
}

export interface Rect { x: number; y: number; width: number; height: number }
export interface AnimationStats {
  name: string
  duration: number
  events: Array<{ name: string; time: number }>
  seamless: boolean
  seamDiff: string[]
  bounds: Rect
  nan: boolean
}
export interface SlotRow { name: string; bone: string; attachment?: string; blend: string }
export interface SkeletonSummary {
  version?: string; hash?: string
  bones: number; slots: number
  skins: string[]; animations: string[]; events: string[]
  size: Rect
  slotTable: SlotRow[]
}
export interface PageInfo {
  name: string; width: number; height: number; bytes: number; format: ImageFormat
  pma?: boolean; scale?: number; declaredWidth?: number; declaredHeight?: number
}
export type BundleStatus = 'pending' | 'checking' | 'loading' | 'probing' | 'done'
export interface RuntimeInfo { loaded: boolean; error?: string; ms: number }
export interface BundleResult {
  bundle: SpineBundle
  status: BundleStatus
  findings: Finding[]
  summary?: SkeletonSummary
  animations: AnimationStats[]
  pages: PageInfo[]
  runtime: RuntimeInfo
}
export interface Report { generatedAt: string; runtimeVersion: string; results: BundleResult[] }
