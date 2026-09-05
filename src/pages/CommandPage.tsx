import { useCallback, useState } from 'react'
import { Activity, AlertTriangle, ArrowUpRight, Clock3, Layers3, Map, Radio, ShieldAlert, Truck, Users } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { SilenceMap } from '../components/SilenceMap'
import { Button, Panel, StatusBadge } from '../components/ui'
import { activity, silenceCells, silentZones, type Severity, type SilenceCell } from '../data/fixtures'

function scoreSeverity(score: number): Severity {
  return score >= 85 ? 'critical' : score >= 65 ? 'warning' : score >= 45 ? 'watch' : 'safe'
}

export function CommandPage() {
  const [selectedCell, setSelectedCell] = useState(() => silenceCells.find(cell => cell.id === 'WYD-07C') ?? silenceCells[0])
  const selectCell = useCallback((cell: SilenceCell) => setSelectedCell(cell), [])
  const severity = scoreSeverity(selectedCell.score)

  return <AppShell mode="command"><main className="command-workspace">
    <header className="command-heading">
      <div><p className="eyebrow">Incident command center</p><h1>Operational overview</h1><p>Silence anomaly triage, resources, and field verification.</p></div>
      <div className="clock"><span><Clock3 size={16} />Operational clock</span><strong>14:35 IST</strong></div>
    </header>

    <section className="kpi-grid">
      <article><span>Critical silent zones</span><strong>12</strong><small><ArrowUpRight size={14} /> 3 since last cycle</small></article>
      <article><span>Population at risk</span><strong>1,214</strong><small>Across 7 high-confidence cells</small></article>
      <article><span>Field units available</span><strong>8 / 14</strong><small>4 deployed · 2 returning</small></article>
      <article><span>Signal freshness</span><strong>82%</strong><small>Last aggregate 2 min ago</small></article>
    </section>

    <section className="command-grid">
      <Panel eyebrow="Expected vs actual signals" title="Disaster signal heatmap" className="map-panel" action={<StatusBadge severity="info">500 m cells</StatusBadge>}>
        <div className="map-toolbar">
          <span><Layers3 size={15} /> Silence-score layer</span>
          <label htmlFor="map-cell">Selected cell<select id="map-cell" value={selectedCell.id} onChange={event => selectCell(silenceCells.find(cell => cell.id === event.target.value) ?? selectedCell)}>{silenceCells.map(cell => <option key={cell.id} value={cell.id}>{cell.id} · {cell.place} · {cell.score}</option>)}</select></label>
        </div>
        <SilenceMap selectedId={selectedCell.id} onSelect={selectCell} />
        <div className="map-legend"><span><i className="safe" />0–44 Observed</span><span><i className="watch" />45–64 Watch</span><span><i className="warning" />65–84 High deficit</span><span><i className="critical" />85–100 Critical</span></div>
      </Panel>

      <Panel eyebrow={`Selected area · ${selectedCell.id}`} title={selectedCell.place} className="selected-panel" action={<StatusBadge severity={severity}>{severity === 'critical' ? 'Critical silence' : severity === 'warning' ? 'High deficit' : severity === 'watch' ? 'Watch' : 'Observed'}</StatusBadge>}>
        <div className={`score-display score-display--${severity}`}><span>Silence score</span><strong>{selectedCell.score}<small>/100</small></strong><p>Confidence {selectedCell.confidence}% · latest aggregate 2 min ago</p></div>
        <dl className="signal-breakdown"><div><dt>Registered population</dt><dd>{selectedCell.population}</dd></div><div><dt>Reports expected</dt><dd>{selectedCell.reportsExpected}</dd></div><div><dt>Reports observed</dt><dd className={selectedCell.reportsObserved === 0 ? 'critical-text' : ''}>{selectedCell.reportsObserved}</dd></div><div><dt>Last confirmed signal</dt><dd>{selectedCell.lastSignal}</dd></div></dl>
        <div className={`notice notice--${severity}`}><ShieldAlert size={20} /><div><strong>Why this area is ranked</strong><span>{selectedCell.reportsObserved} of {selectedCell.reportsExpected} expected reports observed; signal deficit is {selectedCell.score}%.</span></div></div>
        <Button variant={severity === 'critical' ? 'danger' : 'primary'} block icon={<Truck size={18} />}>Dispatch rescue / recon unit</Button>
      </Panel>
    </section>

    <section className="lower-grid">
      <Panel title="Priority silent zones" eyebrow="Ranked for investigation"><div className="zone-list">{silentZones.map(zone => <button key={zone.id} onClick={() => { const cell = silenceCells.find(item => item.id === zone.id); if (cell) selectCell(cell) }}><span className="zone-score">{zone.score}</span><span><strong>{zone.place}</strong><small>{zone.id} · Pop. {zone.population}</small></span><span><b>{zone.silent}</b><small>silent</small></span><StatusBadge severity={zone.severity}>{zone.confidence}% confidence</StatusBadge></button>)}</div></Panel>
      <Panel title="Network & transport" eyebrow="Degraded connectivity"><div className="network-stat"><Radio size={24} /><div><strong>7 outages</strong><span>12 of 19 gateways reachable</span></div></div><div className="transport-bar"><span style={{ width: '63%' }} /></div><div className="transport-row"><span>Queued bundles</span><strong>83</strong></div><div className="transport-row"><span>Median delivery</span><strong>42 min</strong></div></Panel>
      <Panel title="Recent activity" eyebrow="Immutable audit feed"><div className="activity-list">{activity.map(item => <div key={item.time}><StatusBadge severity={item.severity}>{item.time}</StatusBadge><span>{item.text}</span></div>)}</div><Button variant="secondary" block icon={<Activity size={17} />}>Open full audit log</Button></Panel>
    </section>

    <section className="command-footer"><span><Map size={16} />Map baseline v2026.09.03</span><span><Users size={16} />Human verification required before clearance</span><span><AlertTriangle size={16} />Scores prioritize investigation; they are not proof of presence</span></section>
  </main></AppShell>
}
