import { useMemo, useState } from 'react'
import type { BundleResult, Report } from '../core/types'
import { toJson, toMarkdown } from '../core/report'
import { RUNTIME_VERSION } from '../core/settings'
import { downloadText, stamp } from './download'
import { S } from './strings'

export function ReportDialog({ results, onClose }: { results: BundleResult[]; onClose: () => void }) {
  const [tab, setTab] = useState<'md' | 'json'>('md')
  const [copied, setCopied] = useState(false)
  const report = useMemo<Report>(() => ({ generatedAt: new Date().toISOString(), runtimeVersion: RUNTIME_VERSION, results }), [results])
  const text = useMemo(() => (tab === 'md' ? toMarkdown(report) : toJson(report)), [report, tab])
  const copy = async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const t = S.reportDialog
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="head">
          {t.title}
          <span className="seg" style={{ marginLeft: 12 }}>
            <button className={tab === 'md' ? 'on' : ''} onClick={() => setTab('md')}>{t.markdown}</button>
            <button className={tab === 'json' ? 'on' : ''} onClick={() => setTab('json')}>{t.json}</button>
          </span>
        </div>
        <div className="body"><pre>{text}</pre></div>
        <div className="foot">
          <button className="btn" onClick={() => void copy()}>{copied ? `✓ ${t.copied}` : t.copy}</button>
          <button className="btn" onClick={() => downloadText(text, `spine-check-${stamp()}.${tab === 'md' ? 'md' : 'json'}`, tab === 'md' ? 'text/markdown' : 'application/json')}>{t.download}</button>
          <button className="btn primary" onClick={onClose}>{t.close}</button>
        </div>
      </div>
    </div>
  )
}
