import type { CheckContext, Finding } from '../types'
import { finding, listPreview } from './util'

export function filesChecks(ctx: CheckContext): Finding[] {
  const { bundle } = ctx
  const s = { bundle }
  const out: Finding[] = []
  const hasSkeleton = !!(bundle.json || bundle.skel)

  if (hasSkeleton && !bundle.atlas) out.push(finding(s, 'files.atlas-missing', 'error', 'Skeleton has no .atlas file.', { hint: 'Export with "Pack texture atlas" enabled or include the .atlas in the delivery.' }))
  if (!hasSkeleton && bundle.atlas) out.push(finding(s, 'files.skeleton-missing', 'error', '.atlas file without a skeleton (.json or .skel).', { hint: 'Include the exported skeleton with the same base name as the atlas.' }))
  if (bundle.json && bundle.skel) out.push(finding(s, 'files.json-and-skel', 'info', 'Delivery contains both .json and .skel for the same skeleton.', { detail: 'The .json is the one analysed.' }))
  if (!bundle.json && bundle.skel) out.push(finding(s, 'files.skel-only', 'info', 'Skeleton only as .skel: structural checks are limited.', { hint: 'Also export the .json for a full analysis.' }))

  for (const page of ctx.atlas?.pages ?? []) {
    if (bundle.textures.some((t) => t.name === page.name)) continue
    const loose = bundle.textures.find((t) => t.name.toLowerCase() === page.name.toLowerCase())
    if (loose) out.push(finding(s, 'files.texture-case-mismatch', 'warning', `Page "${page.name}" only found as "${loose.name}" (letter case differs).`, { hint: 'Rename to the exact name: Linux servers and CDNs are case-sensitive.', subject: { kind: 'page', name: page.name } }))
    else out.push(finding(s, 'files.texture-missing', 'error', `Image for page "${page.name}" is not in the delivery.`, { hint: 'Include the image with the exact name declared in the .atlas.', subject: { kind: 'page', name: page.name } }))
  }
  for (const t of bundle.unreferencedTextures) out.push(finding(s, 'files.texture-unreferenced', 'warning', `Image "${t.name}" is not referenced by any atlas in the folder.`, { hint: 'Remove it from the package or check that the right atlas was exported.', subject: { kind: 'file', name: t.name } }))
  const unsafe = [bundle.name, ...[bundle.json, bundle.skel, bundle.atlas, ...bundle.textures].flatMap((f) => (f ? [f.name] : []))].filter((n) => /[^a-z0-9_\-.@]/.test(n))
  if (unsafe.length) out.push(finding(s, 'files.name-unsafe', 'info', `${unsafe.length} name(s) with uppercase letters, spaces or special characters.`, { detail: listPreview([...new Set(unsafe)]), hint: 'Lowercase names without spaces avoid URL and case-sensitivity problems.' }))
  return out
}
