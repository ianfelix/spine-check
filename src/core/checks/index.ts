import type { CheckContext, Finding, Severity } from '../types'
import { atlasChecks } from './atlas'
import { filesChecks } from './files'
import { skeletonChecks } from './skeleton'
import { variantsChecks } from './variants'

export const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 }

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

export function runAllChecks(ctx: CheckContext): Finding[] {
  return sortFindings([...filesChecks(ctx), ...skeletonChecks(ctx), ...atlasChecks(ctx), ...variantsChecks(ctx)])
}
