import { useMemo, useState } from 'react'
import type { Finding, Severity } from '../core/types'
import { countBySeverity } from '../core/report'
import { S } from './strings'

interface Props { findings: Finding[]; onFocusAnimation: (name: string) => void }

export function Findings({ findings, onFocusAnimation }: Props) {
  const [active, setActive] = useState<Record<Severity, boolean>>({ error: true, warning: true, info: true })
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const counts = countBySeverity(findings)
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return findings.map((f, i) => ({ f, i })).filter(({ f }) => active[f.severity] && (!q || `${f.code} ${f.message} ${f.detail ?? ''} ${f.variant ?? ''}`.toLowerCase().includes(q)))
  }, [findings, active, query])
  return (
    <div>
      <div className="filters">
        {(['error', 'warning', 'info'] as Severity[]).map((s) => (
          <button key={s} className={`btn${active[s] ? ' on' : ''}`} onClick={() => setActive((a) => ({ ...a, [s]: !a[s] }))}>{S.sev[s]} <span className={`count ${s}`}>{counts[s]}</span></button>
        ))}
        <input className="field" type="text" placeholder={S.search} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {list.length === 0 && <div className="finding"><span className="code">{S.noFindings}</span></div>}
      {list.map(({ f, i }) => (
        <div key={i} className={`finding ${f.severity}`} onClick={() => { setOpen(open === i ? null : i); if (f.subject?.kind === 'animation') onFocusAnimation(f.subject.name) }}>
          <div className="row">
            <span className="dot" />
            <div className="msg">
              <div>{f.message}</div>
              <div className="code">{f.code}{f.variant ? ` · ${f.variant}` : ''}{f.subject ? ` · ${f.subject.kind}: ${f.subject.name}` : ''}</div>
            </div>
          </div>
          {open === i && (f.detail || f.hint) && (
            <div className="extra">
              {f.detail && <div>{f.detail}</div>}
              {f.hint && <div className="hint">{S.hint}: {f.hint}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
