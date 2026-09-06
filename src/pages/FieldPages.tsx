import { useState } from 'react'
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, HeartPulse, PackageCheck, PhoneCall, QrCode, Radio, Search, ShieldCheck, Siren, UserCheck, UserPlus, Users } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { QrScanner } from '../components/QrScanner'
import { Button, Field, Panel, SelectField, StatusBadge, SyncQueue } from '../components/ui'
import { useSahayamStore, type UserMember } from '../data/store'
import { useDtnMesh, type ADUBundle } from '../data/dtn'
import { useT } from '../i18n'

const nav = [
  { to: '/field/scanner', label: '1. Scan QR', icon: QrCode },
  { to: '/field/member', label: '2. Add Member', icon: UserPlus },
  { to: '/field/registry', label: '3. Registry', icon: Users },
  { to: '/field/dtn-relay', label: '4. SOS Relay', icon: Radio },
]

function FieldLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useT()
  return (
    <AppShell>
      <main className="mobile-workspace field-workspace">
        <header className="page-heading">
          <p className="eyebrow">{t('volunteerNav')}</p>
          <h1>{title}</h1>
        </header>
        {children}
      </main>
      <nav className="mobile-nav" aria-label="Field navigation">
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

export function ScannerPage() {
  const { members, getMemberByQr, updateMemberStatus } = useSahayamStore()
  const t = useT()
  const [tokenInput, setTokenInput] = useState('')
  const [scannedMember, setScannedMember] = useState<UserMember | null>(() => {
    // Default show Ammini Kuruvilla as ready demonstration
    return members.find(m => m.id === 'usr-kuru-1') || members[0] || null
  })
  const [scanMessage, setScanMessage] = useState('')

  const handleScanToken = (token: string) => {
    const found = getMemberByQr(token)
    if (found) {
      setScannedMember(found)
      setScanMessage(`Successfully retrieved record for ${found.name} (${found.householdName})`)
    } else {
      setScanMessage('No registered resident found for this QR token')
    }
  }

  const handleCheckIn = () => {
    if (!scannedMember) return
    updateMemberStatus(scannedMember.id, 'Checked in', 'St. Thomas HSS')
    setScannedMember(prev => prev ? { ...prev, status: 'Checked in', campName: 'St. Thomas HSS' } : null)
    setScanMessage(`${scannedMember.name} confirmed checked in at St. Thomas HSS`)
  }

  return (
    <FieldLayout title={t('scannerTitle')}>
      {/* Live Optical QR Scanner Hardware */}
      <QrScanner onScan={handleScanToken} />

      {/* Quick Test Picker for Demo */}
      <Panel title={t('quickScanTitle')} eyebrow={t('instantDemoEyebrow')}>
        <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--muted)' }}>
          Click any user below to simulate scanning their physical QR code:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {members.map(member => (
            <button
              key={member.id}
              onClick={() => handleScanToken(member.qrToken)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: scannedMember?.id === member.id ? 'var(--brand-soft)' : 'var(--surface-2)',
                border: scannedMember?.id === member.id ? '1px solid var(--brand)' : '1px solid var(--border)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <strong style={{ color: 'var(--fg-strong)' }}>{member.name}</strong>
                <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '6px' }}>
                  ({member.householdName} · {member.bloodGroup})
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--brand-strong)', fontWeight: 700 }}>
                Scan QR →
              </span>
            </button>
          ))}
        </div>

        {/* Manual Token Entry */}
        <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
          <input
            style={{
              flex: 1,
              minHeight: '40px',
              padding: '0 10px',
              fontSize: '12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg)',
            }}
            placeholder="e.g. sahayam:user:usr-kuru-1"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
          />
          <Button variant="secondary" onClick={() => handleScanToken(tokenInput)}>
            Lookup
          </Button>
        </div>
      </Panel>

      {scanMessage && (
        <div className="notice notice--safe" style={{ marginTop: '12px' }}>
          <CheckCircle2 size={18} />
          <div><strong>Scan Result</strong><span>{scanMessage}</span></div>
        </div>
      )}

      {/* Scanned Details Output Display */}
      {scannedMember && (
        <div className="scanned-profile-card">
          <div className="scanned-profile-card__header">
            <div>
              <div className="scanned-profile-card__household">
                <Users size={14} /> {scannedMember.householdName}
              </div>
              <h3>{scannedMember.name}</h3>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Age: <strong>{scannedMember.age}</strong> · Gender: <strong>{scannedMember.gender}</strong> · Blood Group: <strong style={{ color: 'var(--critical)' }}>{scannedMember.bloodGroup}</strong>
              </div>
            </div>
            <StatusBadge severity={scannedMember.status === 'Medical review' ? 'critical' : 'safe'}>
              {scannedMember.status}
            </StatusBadge>
          </div>

          {/* Critical Medical Alert Box */}
          <div className="medical-alert-box">
            <strong><HeartPulse size={17} /> Urgent Medical & Triage Record</strong>
            <div>
              <strong>Conditions:</strong> {scannedMember.conditions}
            </div>
            <div>
              <strong>Medication / Dosage:</strong> {scannedMember.medication}
            </div>
            {scannedMember.disability && scannedMember.disability !== 'None' && (
              <div>
                <strong>Mobility / Disability:</strong> {scannedMember.disability}
              </div>
            )}
          </div>

          {/* Vulnerability Badges */}
          <div className="vulnerability-tags">
            {scannedMember.isElderly && <span className="vulnerability-tag vulnerability-tag--critical">Elderly (60+)</span>}
            {scannedMember.isBedridden && <span className="vulnerability-tag vulnerability-tag--critical">Bedridden</span>}
            {scannedMember.isPregnant && <span className="vulnerability-tag vulnerability-tag--critical">Pregnant</span>}
            {scannedMember.isInfant && <span className="vulnerability-tag">Child Under 5</span>}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PhoneCall size={14} color="var(--brand)" />
            Emergency Contact: <strong>{scannedMember.emergencyContact}</strong>
          </div>

          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--muted)', background: 'var(--surface-2)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
            Verified QR Token: {scannedMember.qrToken}
          </div>

          <div style={{ display: 'grid', gap: '8px', marginTop: '6px' }}>
            <Button block icon={<ShieldCheck size={18} />} onClick={handleCheckIn}>
              Check-in to Camp (St. Thomas HSS)
            </Button>
            <NavLink to="/field/registry" style={{ textDecoration: 'none' }}>
              <Button block variant="secondary" icon={<Users size={16} />}>
                View in {scannedMember.householdName} Registry
              </Button>
            </NavLink>
          </div>
        </div>
      )}
    </FieldLayout>
  )
}

export function AddMemberPage() {
  const { addMemberToHousehold, households } = useSahayamStore()
  const navigate = useNavigate()

  // Form states
  const [householdInput, setHouseholdInput] = useState('Kuruvilla')
  const [wardInput, setWardInput] = useState('Ward 11 · Mundakkai North')
  const [cellInput, setCellInput] = useState('WYD-07C')
  const [nameInput, setNameInput] = useState('')
  const [ageInput, setAgeInput] = useState('')
  const [genderInput, setGenderInput] = useState('Female')
  const [bloodInput, setBloodInput] = useState('B+')
  const [conditionsInput, setConditionsInput] = useState('')
  const [medicationInput, setMedicationInput] = useState('')
  const [disabilityInput, setDisabilityInput] = useState('')
  const [contactInput, setContactInput] = useState('+91 94471 ')
  const [isElderly, setIsElderly] = useState(false)
  const [isPregnant, setIsPregnant] = useState(false)
  const [isInfant, setIsInfant] = useState(false)
  const [isBedridden, setIsBedridden] = useState(false)

  const [createdResult, setCreatedResult] = useState<{ member: UserMember; householdName: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return

    const { member, household } = await addMemberToHousehold({
      householdName: householdInput || 'Kuruvilla',
      ward: wardInput,
      cellId: cellInput,
      name: nameInput,
      age: parseInt(ageInput, 10) || 30,
      gender: genderInput,
      bloodGroup: bloodInput,
      conditions: conditionsInput,
      medication: medicationInput,
      disability: disabilityInput,
      isElderly,
      isPregnant,
      isInfant,
      isBedridden,
      emergencyContact: contactInput,
    })

    setCreatedResult({ member, householdName: household.name })
  }

  return (
    <FieldLayout title="Add Member to Household">
      {createdResult ? (
        <Panel className="section-card" title="Member Successfully Added!" eyebrow="Registration Complete">
          <div className="notice notice--safe" style={{ marginBottom: '16px' }}>
            <CheckCircle2 size={24} />
            <div>
              <strong>Grouped under {createdResult.householdName}</strong>
              <span>{createdResult.member.name} has been enrolled and an emergency QR code has been generated.</span>
            </div>
          </div>

          <div className="qr-container">
            {createdResult.member.qrDataUrl && (
              <img src={createdResult.member.qrDataUrl} alt="Generated QR" />
            )}
            <strong style={{ fontSize: '16px', color: '#111' }}>{createdResult.member.name}</strong>
            <span style={{ fontSize: '13px', color: '#666' }}>{createdResult.householdName}</span>
            <div className="qr-token-text">{createdResult.member.qrToken}</div>
          </div>

          <div style={{ display: 'grid', gap: '8px', marginTop: '14px' }}>
            <Button
              block
              icon={<QrCode size={18} />}
              onClick={() => navigate('/field/scanner')}
            >
              Test Scan This QR Code in Scanner
            </Button>
            <Button
              block
              variant="secondary"
              icon={<Users size={18} />}
              onClick={() => navigate('/field/registry')}
            >
              View {createdResult.householdName} in Registry
            </Button>
            <Button
              block
              variant="quiet"
              icon={<UserPlus size={18} />}
              onClick={() => {
                setCreatedResult(null)
                setNameInput('')
                setConditionsInput('')
                setMedicationInput('')
              }}
            >
              Add Another Member
            </Button>
          </div>
        </Panel>
      ) : (
        <form className="member-form" onSubmit={handleSubmit}>
          {/* Household Assignment Group */}
          <Panel title="Household Grouping" eyebrow="Requirement: Group by Household">
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--muted)' }}>
              Enter household name (e.g. <strong>Kuruvilla</strong>). The member will automatically be grouped under <strong>Kuruvilla House</strong>.
            </p>

            <Field
              id="hh-name"
              label="Household Name (e.g. Kuruvilla)"
              value={householdInput}
              onChange={e => setHouseholdInput(e.target.value)}
              placeholder="e.g. Kuruvilla"
              required
            />

            <div style={{ margin: '8px 0', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Existing households:</span>
              {households.map(hh => (
                <button
                  type="button"
                  key={hh.id}
                  className="proto-badge-btn"
                  onClick={() => {
                    setHouseholdInput(hh.name.replace(/\s+House$/i, ''))
                    setWardInput(hh.ward)
                    setCellInput(hh.cellId)
                  }}
                >
                  {hh.name} ({hh.members.length})
                </button>
              ))}
            </div>

            <div className="form-grid" style={{ marginTop: '10px' }}>
              <Field
                id="hh-ward"
                label="Ward & Location"
                value={wardInput}
                onChange={e => setWardInput(e.target.value)}
                placeholder="Ward 11 · Mundakkai North"
              />
              <Field
                id="hh-cell"
                label="Map Grid Cell"
                value={cellInput}
                onChange={e => setCellInput(e.target.value)}
                placeholder="WYD-07C"
              />
            </div>
          </Panel>

          {/* Resident Details */}
          <Panel title="Resident Personal & Medical Details" eyebrow="Resilience Record">
            <div className="form-grid">
              <Field
                id="name"
                label="Full name"
                placeholder="e.g. George Kuruvilla"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                required
              />
              <Field
                id="age"
                label="Age"
                type="number"
                placeholder="68"
                value={ageInput}
                onChange={e => {
                  const val = e.target.value
                  setAgeInput(val)
                  if (parseInt(val, 10) >= 60) setIsElderly(true)
                }}
                required
              />
              <SelectField
                id="gender"
                label="Gender"
                value={genderInput}
                onChange={e => setGenderInput(e.target.value)}
              >
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </SelectField>
              <SelectField
                id="blood"
                label="Blood group"
                value={bloodInput}
                onChange={e => setBloodInput(e.target.value)}
              >
                <option>B+</option>
                <option>O+</option>
                <option>A+</option>
                <option>AB+</option>
                <option>O-</option>
                <option>A-</option>
                <option>B-</option>
                <option>AB-</option>
                <option>Unknown</option>
              </SelectField>
            </div>

            <Field
              id="conditions"
              label="Medical conditions"
              placeholder="e.g. Type 2 Diabetes, Cardiac Arrhythmia"
              value={conditionsInput}
              onChange={e => setConditionsInput(e.target.value)}
            />
            <Field
              id="medication"
              label="Medication & dosage schedule"
              placeholder="e.g. Insulin 10 IU at night, Metformin 500mg"
              value={medicationInput}
              onChange={e => setMedicationInput(e.target.value)}
            />
            <Field
              id="disability"
              label="Disability / mobility needs"
              placeholder="e.g. Wheelchair user, blind, hearing impaired"
              value={disabilityInput}
              onChange={e => setDisabilityInput(e.target.value)}
            />

            <fieldset style={{ margin: '14px 0', border: 0, padding: 0 }}>
              <legend style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fg)', marginBottom: '8px' }}>
                Vulnerability Flags
              </legend>
              <div className="flag-grid">
                <label>
                  <input
                    type="checkbox"
                    checked={isElderly}
                    onChange={e => setIsElderly(e.target.checked)}
                  /> Elderly (60+)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={isPregnant}
                    onChange={e => setIsPregnant(e.target.checked)}
                  /> Pregnant
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={isInfant}
                    onChange={e => setIsInfant(e.target.checked)}
                  /> Child Under 5
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={isBedridden}
                    onChange={e => setIsBedridden(e.target.checked)}
                  /> Bedridden
                </label>
              </div>
            </fieldset>

            <Field
              id="contact"
              label="Emergency contact phone"
              type="tel"
              placeholder="+91 94471 20492"
              value={contactInput}
              onChange={e => setContactInput(e.target.value)}
            />
          </Panel>

          <Button type="submit" block icon={<PackageCheck size={18} />}>
            Generate QR & Save to {householdInput ? `${householdInput} House` : 'Household'}
          </Button>
        </form>
      )}
    </FieldLayout>
  )
}

export function RegistryPage() {
  const { households, members } = useSahayamStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'priority' | 'camp'>('all')

  const filteredHouseholds = households.map(hh => {
    const q = searchQuery.toLowerCase().trim()
    const matchingMembers = hh.members.filter(m => {
      const matchesSearch = !q ||
        m.name.toLowerCase().includes(q) ||
        hh.name.toLowerCase().includes(q) ||
        m.conditions.toLowerCase().includes(q) ||
        m.emergencyContact.includes(q)

      if (!matchesSearch) return false

      if (filterType === 'priority') {
        return m.isElderly || m.isBedridden || m.status === 'Medical review'
      }
      if (filterType === 'camp') {
        return m.status === 'Checked in'
      }
      return true
    })

    return { ...hh, matchingMembers }
  }).filter(hh => hh.matchingMembers.length > 0)

  return (
    <FieldLayout title="Offline camp registry">
      <div className="metric-grid">
        <article>
          <Users size={20} />
          <strong>{households.length}</strong>
          <span>Households</span>
        </article>
        <article>
          <UserCheck size={20} />
          <strong>{members.length}</strong>
          <span>Residents with QR</span>
        </article>
      </div>

      <SyncQueue count={members.length} />

      <label className="search-box">
        <Search size={18} />
        <input
          aria-label="Search registry"
          placeholder="Search by resident name, household (e.g. Kuruvilla), or phone"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </label>

      <div className="filter-row">
        <button
          className={filterType === 'all' ? 'is-active' : ''}
          onClick={() => setFilterType('all')}
        >
          All ({members.length})
        </button>
        <button
          className={filterType === 'priority' ? 'is-active' : ''}
          onClick={() => setFilterType('priority')}
        >
          Medical Priority
        </button>
        <button
          className={filterType === 'camp' ? 'is-active' : ''}
          onClick={() => setFilterType('camp')}
        >
          Checked in Camp
        </button>
      </div>

      {/* Grouped Households Output */}
      <div style={{ marginTop: '16px' }}>
        {filteredHouseholds.map(hh => (
          <div key={hh.id} className="household-group-card">
            <div className="household-group-card__header">
              <div className="household-group-card__title">
                <strong>{hh.name}</strong>
                <span>{hh.ward} · Head: {hh.head} · Phone: {hh.contact}</span>
              </div>
              <StatusBadge severity="safe">
                {hh.matchingMembers.length} member{hh.matchingMembers.length === 1 ? '' : 's'}
              </StatusBadge>
            </div>

            <div className="household-members-list">
              {hh.matchingMembers.map(person => (
                <div key={person.id} className="household-member-item">
                  <div>
                    <strong>{person.name}</strong>
                    {person.name === 'Ammini Kuruvilla' && (
                      <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--muted)' }}>
                        (<span>Ammini K.</span>)
                      </span>
                    )}
                    <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '6px' }}>
                      ({person.age}y · {person.gender} · {person.bloodGroup})
                    </span>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      {person.conditions !== 'None' ? person.conditions : 'No chronic conditions'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {person.isElderly && <span className="vulnerability-tag vulnerability-tag--critical">Elderly</span>}
                    {person.isBedridden && <span className="vulnerability-tag vulnerability-tag--critical">Bedridden</span>}
                    <StatusBadge severity={person.status === 'Medical review' ? 'warning' : 'safe'}>
                      {person.status}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </FieldLayout>
  )
}

export function DtnRelayPage() {
  const { auth } = useSahayamStore()
  const { bundles, isRelayConnected, acceptCustody, uplinkToGateway, publishSos, resetDemo } = useDtnMesh()
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'DELIVERED'>('ALL')
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const volunteerName = auth?.name || 'Ravi Kumar (Field Volunteer)'
  const volunteerId = auth?.email || 'vol-ravi-1'

  const filteredBundles = bundles.filter(b => {
    if (filter === 'PENDING') return b.status === 'PENDING_LOCAL'
    if (filter === 'IN_TRANSIT') return b.status === 'IN_TRANSIT'
    if (filter === 'DELIVERED') return b.status === 'DELIVERED_COMMAND'
    return true
  })

  const pendingCount = bundles.filter(b => b.status === 'PENDING_LOCAL').length
  const carryingCount = bundles.filter(b => b.status === 'IN_TRANSIT' && b.custodian?.id === volunteerId).length

  const handleTakeCustody = async (bundle: ADUBundle) => {
    const res = await acceptCustody({
      bundleId: bundle.bundleId,
      custodianId: volunteerId,
      custodianName: volunteerName,
      location: 'Mundakkai North · Sector 4 Trail',
    })
    if (!res) {
      setActionNotice(`Warning: Custody refused for ${bundle.originName}! SHA-256 payload integrity check failed (Tampered bundle).`)
      return
    }
    setActionNotice(`You have acquired physical custody of ${bundle.originName}'s SOS bundle. Proceed toward Base Camp gateway.`)
  }

  const handleGatewayUplink = async (bundle: ADUBundle) => {
    const res = await uplinkToGateway({
      bundleId: bundle.bundleId,
      gatewayName: 'St. Thomas HSS Relay Gateway',
    })
    if (!res) {
      setActionNotice(`Warning: Gateway uplink refused for ${bundle.originName}! Tampered bundle detected.`)
      return
    }
    setActionNotice(`ADU Bundle for ${bundle.originName} has been successfully uplinked to DEOC Command!`)
  }

  const handleSimulateCivilianSos = async () => {
    await publishSos({
      originNodeId: 'usr-demo-trapped',
      originName: 'Georgekutty Mathew',
      householdName: 'Mathew Villa',
      cellId: 'WYD-07C',
      emergencyType: 'Trapped or missing',
      coordinates: { lat: 11.554, lng: 76.105 },
      medicalSummary: 'Compound fracture, trapped under roof beam. 2 occupants.',
      priority: 'P0_CRITICAL',
    })
    setActionNotice('Generated new live civilian distress beacon in Cell WYD-07C!')
  }

  return (
    <FieldLayout title="DDD Mesh SOS Relay & Courier">
      {/* Real-Time Relay Radar Card */}
      <div className="section-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="live-dot" />
              <strong style={{ fontSize: '14px', color: 'var(--fg-strong)' }}>Wi-Fi Direct Discovery Active</strong>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              10–20m Proximity P2P Listener · Courier: <strong>{volunteerName}</strong>
            </span>
          </div>
          <span className={`status ${isRelayConnected ? 'status--safe' : 'status--warning'}`} style={{ fontSize: '11px' }}>
            {isRelayConnected ? 'Multi-Device Live' : 'Local Mesh'}
          </span>
        </div>

        {/* Visual Radar Container */}
        <div className="dtn-radar-box">
          <div className="dtn-radar-circle circle-1" />
          <div className="dtn-radar-circle circle-2" />
          <div className="dtn-radar-circle circle-3" />
          <div className="dtn-radar-center">
            <Radio size={22} color="var(--brand)" />
          </div>
          <div className="dtn-radar-stat">
            <strong>{pendingCount} Beacons Waiting</strong>
            <span>{carryingCount} In Your Custody</span>
          </div>
        </div>

        {actionNotice && (
          <div className="notice notice--info" style={{ marginTop: '12px', padding: '10px 14px', fontSize: '12px' }}>
            <CheckCircle2 size={16} />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>

      {/* Filter Chips & Test Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'PENDING', 'IN_TRANSIT', 'DELIVERED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="button button--quiet"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                background: filter === f ? 'var(--brand-soft)' : 'transparent',
                borderColor: filter === f ? 'var(--brand)' : 'var(--border)',
                fontWeight: filter === f ? 700 : 500,
              }}
            >
              {f === 'ALL' ? 'All Beacons' : f === 'PENDING' ? `Waiting (${pendingCount})` : f === 'IN_TRANSIT' ? 'Carrying' : 'Delivered'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              resetDemo()
              setActionNotice('All active and cached SOS relays cleared.')
            }}
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--critical)',
              fontWeight: 600,
            }}
            title="Clear all stored and relayed SOS bundles"
          >
            Clear All Relays
          </button>

          <button
            onClick={handleSimulateCivilianSos}
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              background: 'var(--surface-2)',
              border: '1px dashed var(--brand)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--brand)',
              fontWeight: 600,
            }}
          >
            + Simulate Civilian SOS
          </button>
        </div>
      </div>

      {/* Incoming SOS Beacons List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredBundles.length === 0 ? (
          <div className="notice notice--info" style={{ padding: '24px', textAlign: 'center' }}>
            <Radio size={32} style={{ margin: '0 auto 8px', color: 'var(--muted)' }} />
            <strong>No active SOS distress signals in range</strong>
            <span style={{ fontSize: '12px', display: 'block', marginTop: '4px', color: 'var(--muted)' }}>
              When a user triggers an SOS from another device (or via the test button above), it will appear here in real time.
            </span>
          </div>
        ) : (
          filteredBundles.map(bundle => {
            const isPending = bundle.status === 'PENDING_LOCAL'
            const isInTransit = bundle.status === 'IN_TRANSIT'
            const isDelivered = bundle.status === 'DELIVERED_COMMAND'
            const inMyCustody = isInTransit && bundle.custodian?.id === volunteerId

            return (
              <div
                key={bundle.bundleId}
                className="section-card"
                style={{
                  borderLeft: `4px solid ${isDelivered ? 'var(--safe)' : isPending ? 'var(--critical)' : 'var(--warning)'}`,
                  padding: '14px',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span className={`status ${bundle.priority === 'P0_CRITICAL' ? 'status--critical' : 'status--warning'}`} style={{ fontSize: '10px', marginRight: '6px' }}>
                      {bundle.priority === 'P0_CRITICAL' ? 'CRITICAL P0' : 'HIGH P1'}
                    </span>
                    <strong style={{ fontSize: '15px', color: 'var(--fg-strong)' }}>{bundle.originName}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>
                      {bundle.householdName} · Cell <strong>{bundle.cellId}</strong> (Mundakkai North)
                    </span>
                  </div>

                  <span
                    className={`status ${isDelivered ? 'status--safe' : isPending ? 'status--critical' : 'status--warning'}`}
                    style={{ fontSize: '11px' }}
                  >
                    {isDelivered ? 'Delivered' : isPending ? 'Waiting Courier' : inMyCustody ? 'In Your Custody' : 'In Transit'}
                  </span>
                </div>

                {/* Emergency & Medical Context */}
                <div style={{ background: 'var(--surface-1)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '10px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--critical)', fontWeight: 600, marginBottom: '4px' }}>
                    <Siren size={15} />
                    <span>{bundle.emergencyType}</span>
                    {bundle.bloodGroup && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· Blood: <strong>{bundle.bloodGroup}</strong></span>}
                  </div>
                  <div style={{ color: 'var(--fg-strong)' }}>
                    {bundle.medicalSummary}
                  </div>
                  {bundle.isBedridden && (
                    <span className="vulnerability-tag vulnerability-tag--critical" style={{ marginTop: '4px', display: 'inline-block' }}>
                      Bedridden Resident
                    </span>
                  )}
                </div>

                {/* Custody Chain Details */}
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    {bundle.tampered ? (
                      <span className="status status--critical" style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px' }}>
                        <AlertTriangle size={11} />
                        Tampered (SHA-256 Mismatch)
                      </span>
                    ) : (
                      <span className="status status--safe" style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px' }}>
                        <ShieldCheck size={11} />
                        Verified SHA-256
                      </span>
                    )}
                    <span>ADU Bundle: <code>{bundle.bundleId}</code></span>
                  </div>
                  {bundle.custodian && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock3 size={12} color="var(--brand)" />
                      <span>Courier: <strong>{bundle.custodian.name}</strong> ({bundle.custodian.location})</span>
                    </div>
                  )}
                </div>

                {/* Custody Action Handshake Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {bundle.tampered ? (
                    <div className="notice notice--critical" style={{ width: '100%', padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={14} />
                      <span>Cryptographic payload hash verification failed — custody rejected.</span>
                    </div>
                  ) : (
                    <>
                      {isPending && (
                        <button
                          onClick={() => handleTakeCustody(bundle)}
                          className="button button--primary"
                          style={{ flex: 1, padding: '9px 12px', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                        >
                          <Radio size={16} />
                          Take Courier Custody (Handshake)
                        </button>
                      )}

                      {inMyCustody && (
                        <button
                          onClick={() => handleGatewayUplink(bundle)}
                          className="button button--primary"
                          style={{ flex: 1, padding: '9px 12px', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', background: 'var(--safe)', borderColor: 'var(--safe)' }}
                        >
                          <ArrowUpRight size={16} />
                          Uplink to DEOC Gateway (Deliver)
                        </button>
                      )}

                      {isDelivered && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--safe)', fontSize: '12px', fontWeight: 600 }}>
                          <CheckCircle2 size={16} />
                          Delivered to DEOC Command · Confirmed
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </FieldLayout>
  )
}
