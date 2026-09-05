import { useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Download, HeartPulse, MapPin, Navigation, PhoneCall, QrCode, Shield, Siren, User, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button, Panel, StatusBadge } from '../components/ui'
import { camps, type Camp } from '../data/fixtures'
import { CampsMap } from '../components/CampsMap'
import { useSahayamStore, type UserMember } from '../data/store'

const nav = [
  { to: '/civilian/passport', label: '1. Passport & QR', icon: QrCode },
  { to: '/civilian/sos', label: 'Emergency SOS', icon: Siren },
  { to: '/civilian/route', label: 'Safe Evacuation Route', icon: Navigation },
]

function CivilianLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AppShell>
      <main className="mobile-workspace">
        <header className="page-heading">
          <p className="eyebrow">User / Household Interface</p>
          <h1>{title}</h1>
        </header>
        {children}
      </main>
      <nav className="mobile-nav" aria-label="Civilian navigation">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : ''}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </AppShell>
  )
}

export function PassportPage() {
  const { households, auth } = useSahayamStore()

  // Find the household (defaults to Kuruvilla House or user's associated household)
  const defaultHousehold = households.find(h => h.id === auth?.associatedHouseholdId) ||
    households.find(h => h.name.toLowerCase().includes('kuruvilla')) ||
    households[0]

  const [selectedHouseholdId, setSelectedHouseholdId] = useState(defaultHousehold?.id || '')
  const activeHousehold = households.find(h => h.id === selectedHouseholdId) || defaultHousehold

  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    return activeHousehold?.members[0]?.id || ''
  })

  const currentMember = activeHousehold?.members.find(m => m.id === selectedMemberId) || activeHousehold?.members[0]

  const handleDownloadQr = () => {
    if (!currentMember?.qrDataUrl) return
    const link = document.createElement('a')
    link.download = `${currentMember.name.replace(/\s+/g, '_')}_Resilience_QR.png`
    link.href = currentMember.qrDataUrl
    link.click()
  }

  return (
    <CivilianLayout title="Resilience Passport & QR">
      {/* Household Selector / Info */}
      <Panel className="passport-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--brand)', fontWeight: 800 }}>
              Household Profile
            </span>
            <h2 style={{ margin: '2px 0 0', fontSize: '22px', color: 'var(--fg-strong)' }}>
              {activeHousehold?.name || 'Kuruvilla House'}
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
              {activeHousehold?.ward} · Cell {activeHousehold?.cellId}
            </p>
          </div>
          <StatusBadge severity="safe">Synced to Cloud</StatusBadge>
        </div>

        {/* Member Selector Tabs */}
        <div style={{ margin: '12px 0', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {activeHousehold?.members.map(member => (
            <button
              key={member.id}
              onClick={() => setSelectedMemberId(member.id)}
              className={`proto-badge-btn ${currentMember?.id === member.id ? 'is-active' : ''}`}
            >
              <User size={13} />
              {member.name} {member.isElderly && '(Elderly)'}
            </button>
          ))}
        </div>

        {currentMember && (
          <div>
            {/* Generated QR Code Card */}
            <div className="qr-container">
              {currentMember.qrDataUrl ? (
                <img
                  src={currentMember.qrDataUrl}
                  alt={`QR code for ${currentMember.name}`}
                />
              ) : (
                <div style={{ padding: '40px', color: 'var(--muted)' }}>Generating QR Code…</div>
              )}
              <div>
                <strong style={{ fontSize: '15px', color: '#111' }}>{currentMember.name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {activeHousehold?.name} · Age {currentMember.age} · Blood {currentMember.bloodGroup}
                </div>
                <div className="qr-token-text" style={{ marginTop: '6px' }}>
                  Token: {currentMember.qrToken}
                </div>
              </div>
              <Button variant="secondary" onClick={handleDownloadQr} icon={<Download size={15} />}>
                Save QR to Phone
              </Button>
            </div>

            {/* Medical & Vulnerability Details */}
            <div style={{ display: 'grid', gap: '8px', marginTop: '14px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {currentMember.isElderly && <span className="vulnerability-tag vulnerability-tag--critical">Elderly (60+)</span>}
                {currentMember.isBedridden && <span className="vulnerability-tag vulnerability-tag--critical">Bedridden</span>}
                {currentMember.isPregnant && <span className="vulnerability-tag vulnerability-tag--critical">Pregnant</span>}
                {currentMember.isInfant && <span className="vulnerability-tag">Child Under 5</span>}
                <span className="vulnerability-tag">Blood: {currentMember.bloodGroup}</span>
              </div>

              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-strong)', fontWeight: 700, marginBottom: '4px' }}>
                  <HeartPulse size={16} /> Medical Conditions
                </div>
                <p style={{ margin: '0 0 6px', color: 'var(--fg)' }}>{currentMember.conditions}</p>
                <div style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '12px' }}>Medication & Schedule:</div>
                <p style={{ margin: 0, color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{currentMember.medication}</p>
              </div>

              {currentMember.disability && currentMember.disability !== 'None' && (
                <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
                  <strong>Mobility / Disability:</strong> {currentMember.disability}
                </div>
              )}

              <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PhoneCall size={14} color="var(--brand)" />
                <span>Emergency Contact: <strong>{currentMember.emergencyContact}</strong></span>
              </div>
            </div>
          </div>
        )}

        <div className="passport-stats" style={{ marginTop: '18px' }}>
          <span><strong>{activeHousehold?.members.length || 0}</strong> members in house</span>
          <span><strong>{activeHousehold?.members.filter(m => m.isElderly || m.isBedridden).length || 0}</strong> priority needs</span>
          <span><strong>{activeHousehold?.ward.split('·')[0]}</strong> ward</span>
        </div>
      </Panel>

      {/* Household Members List */}
      <Panel title={`All Members of ${activeHousehold?.name || 'Kuruvilla House'}`} eyebrow="Household Roster">
        <div style={{ display: 'grid', gap: '8px' }}>
          {activeHousehold?.members.map(m => (
            <div
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: currentMember?.id === m.id ? 'var(--brand-soft)' : 'var(--surface-2)',
                border: currentMember?.id === m.id ? '1px solid var(--brand)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <div>
                <strong>{m.name}</strong> <small style={{ color: 'var(--muted)' }}>({m.age}y · {m.gender} · {m.bloodGroup})</small>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{m.conditions}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <StatusBadge severity={m.status === 'Medical review' ? 'warning' : 'safe'}>{m.status}</StatusBadge>
                <QrCode size={16} color="var(--brand)" />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="stack-actions">
        <NavLink to="/civilian/route" style={{ textDecoration: 'none' }}>
          <Button block icon={<Navigation size={18} />}>View Safe Evacuation Route</Button>
        </NavLink>
        <NavLink to="/civilian/sos" style={{ textDecoration: 'none' }}>
          <Button block variant="danger" icon={<Siren size={18} />}>Emergency SOS</Button>
        </NavLink>
      </div>
    </CivilianLayout>
  )
}

import { useDtnMesh } from '../data/dtn'

export function SosPage() {
  const { auth, getMemberById } = useSahayamStore()
  const { publishSos, bundles, isRelayConnected } = useDtnMesh()
  const [selectedType, setSelectedType] = useState('Medical emergency')
  const [activeBundleId, setActiveBundleId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentMember = auth?.associatedUserId ? getMemberById(auth.associatedUserId) : null
  const activeBundle = activeBundleId ? bundles.find(b => b.bundleId === activeBundleId) : null

  const handleTriggerSos = async () => {
    setIsSubmitting(true)
    try {
      const bundle = await publishSos({
        originNodeId: currentMember?.id || 'usr-kuru-1',
        originName: currentMember?.name || 'Ammini Kuruvilla',
        householdName: currentMember?.householdName || 'Kuruvilla House',
        cellId: 'WYD-07C',
        emergencyType: selectedType,
        coordinates: { lat: 11.552, lng: 76.102 },
        medicalSummary: currentMember ? `${currentMember.conditions} · Blood ${currentMember.bloodGroup}` : 'Type 2 Diabetes, Severe Hypertension',
        bloodGroup: currentMember?.bloodGroup || 'B+',
        conditions: currentMember?.conditions || 'Type 2 Diabetes, Severe Hypertension',
        medication: currentMember?.medication || 'Insulin glargine (10 IU at 8 PM)',
        isBedridden: currentMember?.isBedridden || false,
      })
      setActiveBundleId(bundle.bundleId)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <CivilianLayout title="Emergency SOS">
      {activeBundle ? (
        <div className="section-card" style={{ marginBottom: '16px' }}>
          <div className={`notice ${activeBundle.status === 'DELIVERED_COMMAND' ? 'notice--safe' : activeBundle.status === 'IN_TRANSIT' ? 'notice--warning' : 'notice--critical'}`} style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Siren size={24} className={activeBundle.status === 'PENDING_LOCAL' ? 'pulse-alert' : ''} />
              <div>
                <strong>SOS Distress Beacon Active</strong>
                <span style={{ display: 'block', fontSize: '12px', marginTop: '2px' }}>
                  ADU Bundle: <code>{activeBundle.bundleId}</code> · Cell <strong>{activeBundle.cellId}</strong>
                </span>
              </div>
            </div>

            {/* Live Custody Tracking Progress */}
            <div style={{ marginTop: '14px', background: 'var(--surface-1)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                DDD Delay-Tolerant Delivery Pipeline:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--fg-strong)' }}>
                  <CheckCircle2 size={16} color="var(--safe)" />
                  <span><strong>1. Stored On Device:</strong> Encrypted atomic ADU saved locally (SHA-256 protected).</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: activeBundle.status === 'IN_TRANSIT' || activeBundle.status === 'DELIVERED_COMMAND' ? 'var(--fg-strong)' : 'var(--muted)' }}>
                  {activeBundle.status === 'IN_TRANSIT' || activeBundle.status === 'DELIVERED_COMMAND' ? (
                    <CheckCircle2 size={16} color="var(--safe)" />
                  ) : (
                    <Clock3 size={16} color="var(--brand)" className="pulse-alert" />
                  )}
                  <span>
                    <strong>2. Wi-Fi Direct Courier:</strong>{' '}
                    {activeBundle.custodian ? (
                      <span style={{ color: 'var(--brand)' }}>
                        In custody of <strong>{activeBundle.custodian.name}</strong> ({activeBundle.custodian.location})
                      </span>
                    ) : (
                      <span>Awaiting passing volunteer/vehicle transport node within 10–20m range</span>
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: activeBundle.status === 'DELIVERED_COMMAND' ? 'var(--safe)' : 'var(--muted)' }}>
                  {activeBundle.status === 'DELIVERED_COMMAND' ? (
                    <CheckCircle2 size={16} color="var(--safe)" />
                  ) : (
                    <Clock3 size={16} />
                  )}
                  <span>
                    <strong>3. DEOC Command Ingest:</strong>{' '}
                    {activeBundle.status === 'DELIVERED_COMMAND' ? (
                      <strong>Uplinked & Confirmed at Incident Command! Rescue team dispatched.</strong>
                    ) : (
                      'Pending gateway reach'
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--muted)' }}>
              <span>Multi-device relay: <strong>{isRelayConnected ? 'Connected (Live)' : 'Local Mesh Mode'}</strong></span>
              <button 
                onClick={handleTriggerSos} 
                disabled={isSubmitting}
                style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Retrigger / Update Beacon
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="sos-circular-container">
          <div className="sos-ripple sos-ripple--1" />
          <div className="sos-ripple sos-ripple--2" />
          <button
            className="sos-button--circular"
            onClick={handleTriggerSos}
            disabled={isSubmitting}
            aria-label="Trigger Emergency SOS"
          >
            <Siren size={44} />
            <strong>SOS</strong>
            <small>{isSubmitting ? 'Transmitting…' : 'Trigger SOS'}</small>
          </button>
          <p style={{ marginTop: '14px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
            Tap the button to broadcast your GPS coordinate and medical passport to nearby rescue nodes
          </p>
        </div>
      )}

      <Panel title="What kind of help do you need?" className="section-card">
        <div className="choice-grid">
          {['Medical emergency', 'Trapped or missing', 'Food or water', 'Landslide / Flood debris'].map(type => (
            <button
              key={type}
              style={{
                borderColor: selectedType === type ? 'var(--brand)' : 'var(--border)',
                background: selectedType === type ? 'var(--brand-soft)' : 'var(--surface-2)',
              }}
              onClick={() => setSelectedType(type)}
            >
              {type === 'Medical emergency' && <PhoneCall size={18} />}
              {type === 'Trapped or missing' && <Users size={18} />}
              {type === 'Food or water' && <MapPin size={18} />}
              {type === 'Landslide / Flood debris' && <AlertTriangle size={18} />}
              {type}
            </button>
          ))}
        </div>
      </Panel>
    </CivilianLayout>
  )
}

export function RoutePage() {
  const [selectedCamp, setSelectedCamp] = useState<Camp>(camps[0])
  const [navigating, setNavigating] = useState(false)

  return (
    <CivilianLayout title="Safe Evacuation Route">
      {/* Navigable Map with Relief Camps and Route */}
      <CampsMap selectedCamp={selectedCamp} onSelectCamp={setSelectedCamp} />

      {/* Selected Camp Destination Panel */}
      <Panel eyebrow="Hazard-Aware Recommended Destination" title={selectedCamp.name}>
        <div className="camp-meta">
          <span><MapPin size={16} />{selectedCamp.distance}</span>
          <span><Users size={16} />{selectedCamp.capacity}% occupied</span>
          <span><CheckCircle2 size={16} />{selectedCamp.status}</span>
        </div>
        <div className="capacity">
          <span
            style={{
              width: `${selectedCamp.capacity}%`,
              background: selectedCamp.capacity > 85 ? 'var(--critical)' : selectedCamp.capacity > 65 ? 'var(--warning)' : 'var(--safe)',
            }}
          />
        </div>
        <p className="reason">
          <Shield size={17} />
          {selectedCamp.safetyNote} Elevation is {selectedCamp.elevation} above flash flood line.
        </p>
      </Panel>

      <div className="route-summary">
        <span><Clock3 size={17} /><strong>{selectedCamp.estimatedTime}</strong> estimated</span>
        <span><Navigation size={17} /><strong>{selectedCamp.distance}</strong> distance</span>
      </div>

      {navigating ? (
        <div className="notice notice--safe" style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={20} color="var(--safe)" />
            <div>
              <strong>Offline GPS Guidance Active</strong>
              <span style={{ display: 'block', fontSize: '12px', marginTop: '2px' }}>
                Navigating via {selectedCamp.routeDescription} · Cached topology
              </span>
            </div>
          </div>
        </div>
      ) : (
        <Button block icon={<ArrowRight size={18} />} onClick={() => setNavigating(true)}>
          Start Offline Navigation to {selectedCamp.name}
        </Button>
      )}

      {/* Interactive List of Nearby Camps */}
      <div style={{ marginTop: '16px' }}>
        <Panel title="Nearby Relief Camps" eyebrow="Select Destination" className="section-card">
        <div className="camps-list">
          {camps.map(camp => {
            const isSelected = camp.id === selectedCamp.id
            return (
              <div
                key={camp.id}
                className={`camp-list-item ${isSelected ? 'camp-list-item--active' : ''}`}
                onClick={() => {
                  setSelectedCamp(camp)
                  setNavigating(false)
                }}
                role="button"
                tabIndex={0}
              >
                <div className="camp-list-info">
                  <div className="camp-list-title-row">
                    <strong>{camp.name}</strong>
                    <StatusBadge severity={camp.capacity > 85 ? 'warning' : 'safe'}>
                      {camp.status}
                    </StatusBadge>
                  </div>
                  <div className="camp-list-details">
                    <span><MapPin size={12} /> {camp.distance}</span>
                    <span><Clock3 size={12} /> {camp.estimatedTime}</span>
                    <span>{camp.elevation}</span>
                  </div>
                  <div className="camp-list-capacity-bar">
                    <div
                      className="camp-list-capacity-fill"
                      style={{
                        width: `${camp.capacity}%`,
                        backgroundColor: camp.capacity > 85 ? 'var(--critical)' : camp.capacity > 65 ? 'var(--warning)' : 'var(--safe)',
                      }}
                    />
                  </div>
                </div>
                <div className="camp-list-action">
                  <span className={`camp-select-pill ${isSelected ? 'camp-select-pill--active' : ''}`}>
                    {isSelected ? 'Active' : 'Select'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  </CivilianLayout>
)
}
