import type { CheckContext, Finding } from '../types'
import { finding, listPreview } from './util'

export function filesChecks(ctx: CheckContext): Finding[] {
  const { bundle } = ctx
  const s = { bundle }
  const out: Finding[] = []
  const hasSkeleton = !!(bundle.json || bundle.skel)

  if (hasSkeleton && !bundle.atlas) out.push(finding(s, 'files.atlas-missing', 'error', 'Skeleton sem arquivo .atlas.', { hint: 'Exporte com "Pack texture atlas" ligado ou inclua o .atlas da entrega.' }))
  if (!hasSkeleton && bundle.atlas) out.push(finding(s, 'files.skeleton-missing', 'error', 'Arquivo .atlas sem skeleton (.json ou .skel).', { hint: 'Inclua o skeleton exportado com o mesmo nome do atlas.' }))
  if (bundle.json && bundle.skel) out.push(finding(s, 'files.json-and-skel', 'info', 'Entrega contém .json e .skel do mesmo skeleton.', { detail: 'O app analisa o .json.' }))
  if (!bundle.json && bundle.skel) out.push(finding(s, 'files.skel-only', 'info', 'Skeleton só em .skel: checks estruturais ficam limitados.', { hint: 'Exporte também o .json para análise completa.' }))

  for (const page of ctx.atlas?.pages ?? []) {
    if (bundle.textures.some((t) => t.name === page.name)) continue
    const loose = bundle.textures.find((t) => t.name.toLowerCase() === page.name.toLowerCase())
    if (loose) out.push(finding(s, 'files.texture-case-mismatch', 'warning', `Página "${page.name}" só encontrada como "${loose.name}" (diferença de maiúsculas).`, { hint: 'Renomeie para o nome exato: servidores Linux e CDNs diferenciam maiúsculas.', subject: { kind: 'page', name: page.name } }))
    else out.push(finding(s, 'files.texture-missing', 'error', `Imagem da página "${page.name}" não está na entrega.`, { hint: 'Inclua a imagem com o nome exato declarado no .atlas.', subject: { kind: 'page', name: page.name } }))
  }
  for (const t of bundle.unreferencedTextures) out.push(finding(s, 'files.texture-unreferenced', 'warning', `Imagem "${t.name}" não é referenciada por nenhum atlas da pasta.`, { hint: 'Remova do pacote ou confira se o atlas correto foi exportado.', subject: { kind: 'file', name: t.name } }))
  const unsafe = [bundle.name, ...[bundle.json, bundle.skel, bundle.atlas, ...bundle.textures].flatMap((f) => (f ? [f.name] : []))].filter((n) => /[^a-z0-9_\-.@]/.test(n))
  if (unsafe.length) out.push(finding(s, 'files.name-unsafe', 'info', `${unsafe.length} nome(s) com maiúsculas, espaços ou caracteres especiais.`, { detail: listPreview([...new Set(unsafe)]), hint: 'Nomes minúsculos sem espaço evitam problemas de URL e de caixa.' }))
  return out
}
