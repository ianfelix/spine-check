import type { BundleResult } from '../core/types'
import { countBySeverity } from '../core/report'
import { S } from './strings'

interface Props { results: BundleResult[]; selectedKey: string | null; ignoredCount: number; onSelect: (key: string) => void }

export function Counts({ result }: { result: BundleResult }) {
  const c = countBySeverity(result.findings)
  return (
    <span className="counts">
      {(['error', 'warning', 'info'] as const).map((s) => <span key={s} className={`count ${s}${c[s] ? '' : ' zero'}`} title={S.sev[s]}>{c[s]}</span>)}
    </span>
  )
}

export function BundleList({ results, selectedKey, ignoredCount, onSelect }: Props) {
  return (
    <div>
      {results.map((r) => (
        <div key={r.bundle.key} className={`bundle-row${r.bundle.key === selectedKey ? ' selected' : ''}`} onClick={() => onSelect(r.bundle.key)}>
          <span className="name" title={r.bundle.key}>{r.bundle.name}</span>
          <Counts result={r} />
          <span className="meta">
            <span>{r.bundle.dir || '.'}</span>
            {r.bundle.variants.map((v) => <span key={v.label} className="chip">{v.label}</span>)}
            {r.status !== 'done' && <span className="chip"><i className="ph ph-spinner" /> {S.status[r.status]}</span>}
          </span>
        </div>
      ))}
      {ignoredCount > 0 && <div className="bundle-row"><span className="meta">{S.ignored(ignoredCount)}</span></div>}
    </div>
  )
}
