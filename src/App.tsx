import { useEffect, useState } from 'react'
import { sampleInputFiles } from './runtime/sample'
import { useValidator } from './state/useValidator'
import { BundleList } from './ui/BundleList'
import { Details } from './ui/Details'
import { DropZone, useDropHandlers } from './ui/DropZone'
import { Findings } from './ui/Findings'
import { Preview } from './ui/Preview'
import { ReportDialog } from './ui/ReportDialog'
import { SettingsDialog } from './ui/SettingsDialog'
import { TopBar } from './ui/TopBar'
import { S } from './ui/strings'
import { useMediaQuery } from './ui/useMediaQuery'

type View = 'bundles' | 'preview' | 'findings' | 'details'
const VIEWS: View[] = ['bundles', 'preview', 'findings', 'details']

export function App() {
  const v = useValidator()
  const compact = useMediaQuery('(max-width: 900px)')
  const [view, setView] = useState<View>('preview')
  const [tab, setTab] = useState<'findings' | 'details'>('findings')
  const [report, setReport] = useState(false)
  const [settings, setSettings] = useState(false)
  const [focus, setFocus] = useState<{ name: string; nonce: number } | null>(null)
  const drop = useDropHandlers(v.addFiles)
  const hasResults = v.results.length > 0

  useEffect(() => { if (view === 'findings' || view === 'details') setTab(view) }, [view])

  const focusAnimation = (name: string) => { setFocus({ name, nonce: Date.now() }); if (compact) setView('preview') }
  const selectBundle = (key: string) => { v.select(key); if (compact) setView('preview') }
  const showLeft = !compact || view === 'bundles'
  const showPreview = !compact || view === 'preview'
  const showRight = !compact || view === 'findings' || view === 'details'

  return (
    <div className="app" {...(hasResults ? drop.handlers : {})}>
      <TopBar busy={v.busy} hasResults={hasResults} onFiles={v.addFiles} onReport={() => setReport(true)} onSettings={() => setSettings(true)} onClear={v.clear} />
      {!hasResults ? (
        <DropZone onFiles={v.addFiles} onSample={() => v.addFiles(sampleInputFiles())} />
      ) : (
        <div className={`main${compact ? ' compact' : ''}`}>
          {compact && (
            <nav className="viewbar">
              {VIEWS.map((k) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{S.views[k]}</button>)}
            </nav>
          )}
          <aside className={`panel panel-left${showLeft ? '' : ' hidden'}`}>
            <BundleList results={v.results} selectedKey={v.selectedKey} ignoredCount={v.ignored.length} onSelect={selectBundle} />
          </aside>
          <Preview result={v.selected} loadedFor={v.loadedFor} focusAnimation={focus} hidden={!showPreview} />
          <aside className={`panel panel-right${showRight ? '' : ' hidden'}`}>
            {!compact && (
              <div className="tabs">
                <button className={tab === 'findings' ? 'on' : ''} onClick={() => setTab('findings')}>{S.tabs.findings}</button>
                <button className={tab === 'details' ? 'on' : ''} onClick={() => setTab('details')}>{S.tabs.details}</button>
              </div>
            )}
            <div className="panel">
              {v.selected && tab === 'findings' && <Findings findings={v.selected.findings} onFocusAnimation={focusAnimation} />}
              {v.selected && tab === 'details' && <Details result={v.selected} onFocusAnimation={focusAnimation} />}
            </div>
          </aside>
        </div>
      )}
      {report && <ReportDialog results={v.results} onClose={() => setReport(false)} />}
      {settings && <SettingsDialog settings={v.settings} onSave={(t) => { v.applySettings(t); setSettings(false) }} onClose={() => setSettings(false)} />}
    </div>
  )
}
