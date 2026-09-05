import { useCallback, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Layers3, Map, Radio, ShieldAlert, ShieldCheck, Siren, Sparkles, Truck, Users } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { SilenceMap } from '../components/SilenceMap'
import { Button, Panel, StatusBadge } from '../components/ui'
import { useDtnMesh } from '../data/dtn'
import {
  activity,
  geographicSilenceData,
  silenceCells,
  silentZones,
  type Severity,
  type SilenceCell,
  type SilentZone
} from '../data/fixtures'

function scoreSeverity(score: number): Severity {
  return score >= 85 ? 'critical' : score >= 65 ? 'warning' : score >= 45 ? 'watch' : 'safe'
}

export function CommandPage() {
  const { bundles, isRelayConnected } = useDtnMesh()
  const [activeScenario, setActiveScenario] = useState<string>('severe_silence')
  const [selectedCell, setSelectedCell] = useState(() => silenceCells.find(cell => cell.id === 'WYD-07C') ?? silenceCells[0])
  const selectCell = useCallback((cell: SilenceCell) => setSelectedCell(cell), [])

  const latestSos = bundles[0]

  // Live score for selected cell in the active disaster scenario
  const currentScore = selectedCell.scoresByScenario?.[activeScenario] ?? selectedCell.score
  const severity = scoreSeverity(currentScore)

  // Dynamic ranking of top silent zones for this scenario
  const scenarioSilentZones: SilentZone[] = useMemo(() => {
    return [...silenceCells]
      .sort((a, b) => {
        const scoreB = b.scoresByScenario?.[activeScenario] ?? b.score
        const scoreA = a.scoresByScenario?.[activeScenario] ?? a.score
        return scoreB - scoreA
      })
      .slice(0, 6)
      .map(c => {
        const score = c.scoresByScenario?.[activeScenario] ?? c.score
        return {
          id: c.id,
          place: c.place,
          score,
          population: c.population,
          silent: score >= 90 ? '9h 45m' : score >= 80 ? '6h 20m' : score >= 60 ? '3h 40m' : '45m',
          confidence: c.confidence,
          severity: scoreSeverity(score),
          latitude: c.latitude,
          longitude: c.longitude,
        }
      })
  }, [activeScenario])

  // Count critical cells for current scenario
  const criticalCount = useMemo(() => {
    return silenceCells.filter(c => (c.scoresByScenario?.[activeScenario] ?? c.score) >= 85).length
  }, [activeScenario])

  const atRiskPopulation = useMemo(() => {
    return silenceCells
      .filter(c => (c.scoresByScenario?.[activeScenario] ?? c.score) >= 65)
      .reduce((sum, c) => sum + c.population, 0)
  }, [activeScenario])

  // Signal breakdown details for selected cell
  const breakdown = selectedCell.breakdownsByScenario?.[activeScenario]

  return (
    <AppShell mode="command">
      <main className="command-workspace">
        <header className="command-heading">
          <div>
            <h1>Operational overview</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
              100 Geographic Sectors · Real-time Silence Telemetry · Kerala Disaster Network
            </p>
          </div>
          <div className="clock">
            <span><Clock3 size={16} />Operational clock</span>
            <strong>14:35 IST</strong>
          </div>
        </header>

        {/* Live Multi-Device DDD SOS Alert Banner */}
        {latestSos && (
          <section className="live-sos-alert-banner" style={{ marginBottom: '18px' }}>
            <div
              className={`notice ${latestSos.status === 'DELIVERED_COMMAND' ? 'notice--safe' : latestSos.status === 'IN_TRANSIT' ? 'notice--warning' : 'notice--critical'}`}
              style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'var(--surface-1)', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Siren size={28} className={latestSos.status !== 'DELIVERED_COMMAND' ? 'pulse-alert' : ''} color={latestSos.status === 'DELIVERED_COMMAND' ? 'var(--safe)' : 'var(--critical)'} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '16px', color: 'var(--fg-strong)' }}>
                      DISTRESS SIGNAL: {latestSos.originName} ({latestSos.householdName})
                    </strong>
                    <span className={`status ${latestSos.priority === 'P0_CRITICAL' ? 'status--critical' : 'status--warning'}`} style={{ fontSize: '10px' }}>
                      {latestSos.priority}
                    </span>
                    <span className={`status ${latestSos.status === 'DELIVERED_COMMAND' ? 'status--safe' : latestSos.status === 'IN_TRANSIT' ? 'status--warning' : 'status--critical'}`} style={{ fontSize: '10px' }}>
                      {latestSos.status === 'DELIVERED_COMMAND' ? 'Uplinked to DEOC' : latestSos.status === 'IN_TRANSIT' ? 'In Courier Custody' : 'Awaiting Courier'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--fg-strong)' }}>
                    <strong>{latestSos.emergencyType}:</strong> {latestSos.medicalSummary} · Origin Cell <strong>{latestSos.cellId}</strong> (11.552° N, 76.102° E)
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                    ADU Bundle: <code>{latestSos.bundleId}</code> · Custody: {latestSos.custodian ? `${latestSos.custodian.name} (${latestSos.custodian.location})` : 'Victim local node'} · Multi-device relay: <strong>{isRelayConnected ? 'Online (Live)' : 'Local Mesh'}</strong>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="primary"
                  onClick={() => {
                    const targetCell = silenceCells.find(c => c.id === latestSos.cellId || c.cell_code === latestSos.cellId)
                    if (targetCell) selectCell(targetCell)
                  }}
                  icon={<Map size={16} />}
                >
                  Locate Cell ({latestSos.cellId})
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Dynamic Scenario and Telemetry KPIs */}
        <section className="kpi-grid">
          <article>
            <span>Critical silent zones</span>
            <strong>{criticalCount}</strong>
            <small><ArrowUpRight size={14} /> In active scenario</small>
          </article>
          <article>
            <span>Population at risk</span>
            <strong>{atRiskPopulation.toLocaleString()}</strong>
            <small>Across high-deficit cells</small>
          </article>
          <article>
            <span>Field units available</span>
            <strong>8 / 14</strong>
            <small>4 deployed · 2 returning</small>
          </article>
          <article>
            <span>Signal freshness</span>
            <strong>88%</strong>
            <small>100 sectors analyzed</small>
          </article>
        </section>

        <section className="command-grid">
          <Panel
            eyebrow="Expected vs actual signals · Kerala telemetry"
            title="Geographic Disaster Thermal Map"
            className="map-panel"
            action={<StatusBadge severity="info">100 Geographic Cells (1 km²)</StatusBadge>}
          >
            <div className="map-toolbar">
              {/* Scenario switcher */}
              <label htmlFor="disaster-scenario" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} style={{ color: 'var(--brand)' }} />
                <span>Scenario</span>
                <select
                  id="disaster-scenario"
                  value={activeScenario}
                  onChange={e => setActiveScenario(e.target.value)}
                  style={{ minWidth: '170px' }}
                >
                  <option value="severe_silence">Disaster Peak (Severe)</option>
                  <option value="complete_silence">Catastrophic Blackout</option>
                  <option value="disaster_progression">Disaster Progression</option>
                  <option value="partial_silence">Early Incident (Partial)</option>
                  <option value="normal">Nominal Operations</option>
                </select>
              </label>

              {/* Cell selector */}
              <label htmlFor="map-cell">
                Selected cell
                <select
                  id="map-cell"
                  value={selectedCell.id}
                  onChange={event => {
                    const found = silenceCells.find(
                      cell => cell.id === event.target.value || cell.cell_code === event.target.value
                    )
                    if (found) selectCell(found)
                  }}
                >
                  {silenceCells.map(cell => {
                    const score = cell.scoresByScenario?.[activeScenario] ?? cell.score
                    return (
                      <option key={cell.id} value={cell.id}>
                        {cell.id} · {cell.place} · {score}
                      </option>
                    )
                  })}
                </select>
              </label>
            </div>

            {/* True Geographic Silence Map with Continuous Thermal Gradient */}
            <SilenceMap selectedId={selectedCell.id} onSelect={selectCell} activeScenario={activeScenario} />

            {/* Thermal Scale Legend matching Image 2 */}
            <div className="map-legend">
              <div className="map-legend__bar" aria-hidden="true" />
              <div className="map-legend__ticks">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>90</span>
                <span>100</span>
              </div>
              <div className="map-legend__labels">
                <span>Observed (Cool)</span>
                <span>Watch</span>
                <span>Moderate</span>
                <span>High Deficit</span>
                <span>Severe</span>
                <span>Total Blackout</span>
              </div>
            </div>
          </Panel>

          {/* Detailed Sector Analytics Panel */}
          <Panel
            eyebrow={`Selected area · ${selectedCell.id}${selectedCell.cell_code ? ` (${selectedCell.cell_code})` : ''}`}
            title={selectedCell.place}
            className="selected-panel"
            action={
              <StatusBadge severity={severity}>
                {severity === 'critical'
                  ? 'Critical silence'
                  : severity === 'warning'
                  ? 'High deficit'
                  : severity === 'watch'
                  ? 'Watch'
                  : 'Observed'}
              </StatusBadge>
            }
          >
            <div className={`score-display score-display--${severity}`}>
              <span>Silence score</span>
              <strong>
                {currentScore}
                <small>/100</small>
              </strong>
              <p>Confidence {selectedCell.confidence}% · {geographicSilenceData.scenarios[activeScenario as keyof typeof geographicSilenceData.scenarios]?.label ?? activeScenario}</p>
            </div>

            <dl className="signal-breakdown">
              <div>
                <dt>Registered population</dt>
                <dd>{selectedCell.population.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Sector type</dt>
                <dd style={{ textTransform: 'capitalize' }}>{selectedCell.cell_type ?? 'Residential'}</dd>
              </div>
              <div>
                <dt>Reports expected</dt>
                <dd>{selectedCell.reportsExpected}</dd>
              </div>
              <div>
                <dt>Reports observed</dt>
                <dd className={selectedCell.reportsObserved === 0 || currentScore >= 85 ? 'critical-text' : ''}>
                  {Math.max(0, Math.round(selectedCell.reportsExpected * (1 - currentScore / 100)))}
                </dd>
              </div>
              {breakdown && (
                <>
                  <div>
                    <dt>Comms Deficit</dt>
                    <dd className={breakdown.communication_signal?.deficit_pct > 70 ? 'critical-text' : ''}>
                      {breakdown.communication_signal?.deficit_pct ?? 0}%
                    </dd>
                  </div>
                  <div>
                    <dt>Mobility Deficit</dt>
                    <dd className={breakdown.mobility_signal?.deficit_pct > 70 ? 'critical-text' : ''}>
                      {breakdown.mobility_signal?.deficit_pct ?? 0}%
                    </dd>
                  </div>
                </>
              )}
            </dl>

            <div className={`notice notice--${severity}`}>
              <ShieldAlert size={20} />
              <div>
                <strong>Why this area is ranked</strong>
                <span>
                  Signal deficit is {currentScore}%. Computed from {breakdown ? '8 multi-dimensional telemetry channels' : 'expected vs observed field reports'}.
                </span>
              </div>
            </div>

            <Button variant={severity === 'critical' ? 'danger' : 'primary'} block icon={<Truck size={18} />}>
              Dispatch rescue / recon unit
            </Button>
          </Panel>
        </section>

        {/* Lower Grid: Priority Silent Zones & Recent Audit Feed */}
        <section className="lower-grid">
          <Panel title="Priority silent zones" eyebrow={`Ranked for investigation · ${activeScenario}`}>
            <div className="zone-list">
              {scenarioSilentZones.map(zone => (
                <button
                  key={zone.id}
                  onClick={() => {
                    const cell = silenceCells.find(item => item.id === zone.id || item.cell_code === zone.id)
                    if (cell) selectCell(cell)
                  }}
                >
                  <span className="zone-score">{zone.score}</span>
                  <span>
                    <strong>{zone.place}</strong>
                    <small>{zone.id} · Pop. {zone.population.toLocaleString()}</small>
                  </span>
                  <span>
                    <b>{zone.silent}</b>
                    <small>silent</small>
                  </span>
                  <StatusBadge severity={zone.severity}>{zone.confidence}% confidence</StatusBadge>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Recent activity" eyebrow="Immutable audit feed">
            <div className="activity-list">
              {activity.map(item => (
                <div key={item.time}>
                  <StatusBadge severity={item.severity}>{item.time}</StatusBadge>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" block icon={<Activity size={17} />}>
              Open full audit log
            </Button>
          </Panel>

          {/* Live DDD DTN Mesh Ingest Telemetry Panel */}
          <Panel
            title="DDD Delay-Tolerant Ingest Feed"
            eyebrow="Real-time multi-device sneakernet mesh"
            action={<StatusBadge severity={isRelayConnected ? 'safe' : 'watch'}>{isRelayConnected ? 'Network Live' : 'Local Mesh'}</StatusBadge>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bundles.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No active DTN bundles received.</p>
              ) : (
                bundles.map(b => (
                  <div
                    key={b.bundleId}
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`status ${b.priority === 'P0_CRITICAL' ? 'status--critical' : 'status--warning'}`} style={{ fontSize: '10px' }}>
                          {b.priority}
                        </span>
                        <strong style={{ fontSize: '13px', color: 'var(--fg-strong)' }}>{b.originName}</strong>
                      </div>
                      <span className={`status ${b.status === 'DELIVERED_COMMAND' ? 'status--safe' : b.status === 'IN_TRANSIT' ? 'status--warning' : 'status--critical'}`} style={{ fontSize: '10px' }}>
                        {b.status === 'DELIVERED_COMMAND' ? 'Uplinked' : b.status === 'IN_TRANSIT' ? 'In Transit' : 'Local Node'}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--fg-strong)', marginBottom: '4px' }}>
                      <strong>{b.emergencyType}:</strong> {b.medicalSummary} · Cell <strong>{b.cellId}</strong>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Radio size={12} color="var(--brand)" />
                        <span>ADU: <code>{b.bundleId.slice(0, 18)}…</code></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock3 size={12} color="var(--safe)" />
                        <span>Hops: {b.custodyReceipts.map(r => r.custodianName.split(' ')[0]).join(' → ')}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </section>

        <section className="command-footer">
          <span><Map size={16} />Map baseline v2026.09.06 (Kerala 100 Geographic Sectors)</span>
          <span><Users size={16} />Human verification required before clearance</span>
          <span><AlertTriangle size={16} />Scores prioritize investigation; they are not proof of presence</span>
        </section>
      </main>
    </AppShell>
  )
}
