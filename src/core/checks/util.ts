import type { Finding, Severity, SpineBundle, SubjectKind } from '../types'

export interface Scope { bundle: SpineBundle; variant?: string }
export interface FindingExtra { detail?: string; hint?: string; subject?: { kind: SubjectKind; name: string } }

export function finding(scope: Scope, code: string, severity: Severity, message: string, extra: FindingExtra = {}): Finding {
  const f: Finding = { code, severity, message, bundle: scope.bundle.name }
  if (scope.variant) f.variant = scope.variant
  if (extra.detail) f.detail = extra.detail
  if (extra.hint) f.hint = extra.hint
  if (extra.subject) f.subject = extra.subject
  return f
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`
  return `${(n / (1024 * 1024)).toFixed(1)} MiB`
}

export function pct(x: number): string { return `${Math.round(x * 100)}%` }

export function listPreview(names: string[], max = 20): string {
  return names.length <= max ? names.join(', ') : `${names.slice(0, max).join(', ')} and ${names.length - max} more`
}
