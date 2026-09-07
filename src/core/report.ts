import type { AnimationStats, BundleResult, Finding, Report, Severity } from './types'

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const out: Record<Severity, number> = { error: 0, warning: 0, info: 0 }
  for (const f of findings) out[f.severity]++
  return out
}

const TITLES: Record<Severity, string> = { error: 'Errors', warning: 'Warnings', info: 'Info' }

function line(f: Finding): string {
  const tag = f.variant ? ` [${f.variant}]` : ''
  const rows = [`- **${f.code}**${tag} — ${f.message}`]
  if (f.detail) rows.push(`  ${f.detail.replace(/\n/g, '\n  ')}`)
  if (f.hint) rows.push(`  Hint: ${f.hint}`)
  return rows.join('\n')
}

function animationRow(a: AnimationStats): string {
  const events = a.events.length ? a.events.map((e) => `${e.name} @ ${e.time.toFixed(2)} s`).join(', ') : '—'
  return `| ${a.name} | ${a.duration.toFixed(2)} s | ${events} | ${a.seamless ? '✓' : '✗'} | ${Math.round(a.bounds.width)}×${Math.round(a.bounds.height)} |`
}

function header(r: BundleResult): string {
  const b = r.bundle
  const parts = [b.json?.name ?? b.skel?.name ?? 'no skeleton', b.atlas?.name ?? 'no atlas', `${r.pages.length} page${r.pages.length === 1 ? '' : 's'}`]
  if (b.variants.length) parts.push(`variants: ${b.variants.map((v) => v.label).join(', ')}`)
  return `## ${b.name}  (${parts.join(' · ')})`
}

export function toMarkdown(report: Report): string {
  const d = new Date(report.generatedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const when = Number.isNaN(d.getTime()) ? report.generatedAt : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  const out = [`# Spine Check — report`, `Generated ${when} · target runtime spine-pixi-v8 ${report.runtimeVersion}`, '']
  for (const r of report.results) {
    const c = countBySeverity(r.findings)
    const rt = r.runtime.loaded ? `loaded in ${Math.round(r.runtime.ms)} ms` : `failed${r.runtime.error ? ` (${r.runtime.error})` : ''}`
    out.push(header(r), `Errors ${c.error} · Warnings ${c.warning} · Info ${c.info} · runtime: ${rt}`, '')
    for (const sev of ['error', 'warning', 'info'] as Severity[]) {
      const list = r.findings.filter((f) => f.severity === sev)
      if (!list.length) continue
      out.push(`### ${TITLES[sev]}`, ...list.map(line), '')
    }
    if (r.animations.length) {
      out.push('### Animations', '| Animation | Duration | Events | Seamless loop | Bounds (w×h) |', '|---|---|---|---|---|', ...r.animations.map(animationRow), '')
    }
  }
  return out.join('\n')
}

export function toJson(report: Report): string {
  return JSON.stringify(report, (key, value) => (key === 'file' ? undefined : value), 2)
}
