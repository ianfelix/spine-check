import type { BundleResult } from '../core/types'
import { fmtBytes } from '../core/checks/util'
import { S } from './strings'

interface Props { result: BundleResult; onFocusAnimation: (name: string) => void }

export function Details({ result, onFocusAnimation }: Props) {
  const d = S.details
  const s = result.summary
  const r = result.runtime
  return (
    <div className="details">
      <section>
        <h3>{d.skeleton}</h3>
        <dl className="kv">
          <dt>{d.version}</dt><dd>{s?.version ?? d.none}</dd>
          <dt>{d.hash}</dt><dd>{s?.hash ?? d.none}</dd>
          <dt>{d.size}</dt><dd>{s ? `${Math.round(s.size.width)}×${Math.round(s.size.height)} (x ${Math.round(s.size.x)}, y ${Math.round(s.size.y)})` : d.none}</dd>
          <dt>{d.bones}</dt><dd>{s?.bones ?? d.none}</dd>
          <dt>{d.slots}</dt><dd>{s?.slots ?? d.none}</dd>
          <dt>{d.skins}</dt><dd>{s?.skins.join(', ') || d.none}</dd>
          <dt>{d.events}</dt><dd>{s?.events.join(', ') || d.none}</dd>
          <dt>{d.runtime}</dt><dd>{r.loaded ? d.loadedIn(r.ms) : `${d.failed}${r.error ? ` — ${r.error}` : ''}`}</dd>
        </dl>
      </section>
      <section>
        <h3>{d.animations}</h3>
        <table className="grid">
          <thead><tr><th>{d.animations}</th><th>{d.duration}</th><th>{d.events}</th><th>{d.seamless}</th><th>{d.bounds}</th></tr></thead>
          <tbody>
            {result.animations.map((a) => (
              <tr key={a.name} className="clickable" onClick={() => onFocusAnimation(a.name)} title={a.seamDiff.join(', ')}>
                <td>{a.name}</td><td>{a.duration.toFixed(2)} s</td>
                <td>{a.events.length ? a.events.map((e) => `${e.name} @ ${e.time.toFixed(2)}`).join(', ') : d.none}</td>
                <td>{a.seamless ? '✓' : '✗'}</td><td>{Math.round(a.bounds.width)}×{Math.round(a.bounds.height)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3>{d.pages}</h3>
        <table className="grid">
          <thead><tr><th>{d.page}</th><th>{d.dims}</th><th>{d.declared}</th><th>{d.format}</th><th>{d.bytes}</th><th>{d.pma}</th><th>{d.scale}</th></tr></thead>
          <tbody>
            {result.pages.map((p) => (
              <tr key={p.name}><td>{p.name}</td><td>{p.width}×{p.height}</td><td>{p.declaredWidth ?? '?'}×{p.declaredHeight ?? '?'}</td><td>{p.format}</td><td>{fmtBytes(p.bytes)}</td><td>{p.pma ? d.yes : d.no}</td><td>{p.scale ?? d.none}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      {s && (
        <section>
          <h3>{d.slots}</h3>
          <table className="grid">
            <thead><tr><th>{d.slot}</th><th>{d.bone}</th><th>{d.attachment}</th><th>{d.blend}</th></tr></thead>
            <tbody>{s.slotTable.map((row) => <tr key={row.name}><td>{row.name}</td><td>{row.bone}</td><td>{row.attachment ?? d.none}</td><td>{row.blend}</td></tr>)}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
