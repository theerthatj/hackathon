import { useState } from 'react'
import { ArrowRight, Command, HeartHandshake, KeyRound, QrCode, ShieldAlert, ShieldCheck, Truck, UserCheck, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui'
import { PROTOTYPE_CREDENTIALS, useSahayamStore, type Role } from '../data/store'

export function HomePage() {
  const { auth, login, setRole } = useSahayamStore()
  const navigate = useNavigate()

  const [emailInput, setEmailInput] = useState('user@gmail.com')
  const [passInput, setPassInput] = useState('user')
  const [errorMsg, setErrorMsg] = useState('')

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    const result = login(emailInput, passInput)
    if (result.success) {
      if (result.role === 'user') navigate('/civilian/passport')
      else if (result.role === 'volunteer') navigate('/field/dtn-relay')
      else if (result.role === 'admin') navigate('/command')
    } else {
      setErrorMsg(result.message || 'Invalid credentials')
    }
  }

  const handleQuickLaunch = (role: Role) => {
    setRole(role)
    if (role === 'user') navigate('/civilian/passport')
    else if (role === 'volunteer') navigate('/field/dtn-relay')
    else if (role === 'admin') navigate('/command')
  }

  return (
    <AppShell>
      <main className="home">
        {/* Prototype Credential & Quick Switcher Strip */}
        <section className="proto-auth-strip" aria-label="Prototype accounts">
          <div className="proto-auth-strip__header">
            <h3>
              <KeyRound size={16} color="var(--brand)" />
              Prototype Login Credentials
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Currently active: <strong>{auth?.email || 'Guest'}</strong> ({auth?.role?.toUpperCase() || 'None'})
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>1-Click Launch:</span>
            {PROTOTYPE_CREDENTIALS.map(cred => (
              <button
                key={cred.email}
                className={`proto-badge-btn ${auth?.role === cred.role ? 'is-active' : ''}`}
                onClick={() => handleQuickLaunch(cred.role)}
              >
                <UserCheck size={14} />
                <b>{cred.role.toUpperCase()}:</b> {cred.email} / {cred.pass}
              </button>
            ))}
          </div>

          <form className="proto-login-inline" onSubmit={handleLoginSubmit}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Manual Login:</span>
            <input
              type="email"
              placeholder="user@gmail.com"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              aria-label="Email"
              required
            />
            <input
              type="password"
              placeholder="password"
              value={passInput}
              onChange={e => setPassInput(e.target.value)}
              aria-label="Password"
              required
            />
            <Button type="submit" variant="secondary" style={{ minHeight: '38px', padding: '0 14px' }}>
              Sign In
            </Button>
            {errorMsg && <span style={{ color: 'var(--critical)', fontSize: '12px' }}>{errorMsg}</span>}
          </form>
        </section>

        {/* 3 Core Interfaces */}
        <section className="workspace-grid" aria-label="The 3 system interfaces">
          {/* 1. USERS */}
          <article className="portal-card portal-card--user">
            <div className="portal-card__icon">
              <Users size={28} />
            </div>
            <p className="eyebrow">Interface 1</p>
            <h2>1. Users</h2>
            <p>
              Civilians and household members access their personal <strong>Resilience Passport</strong>, view their generated
              <strong> QR code</strong> (encoding offline medical & vulnerability tokens), review family members (e.g. Kuruvilla House),
              and navigate hazard-safe evacuation routes.
            </p>
            <div className="portal-card__creds">
              Login: <strong>user@gmail.com</strong> / <strong>user</strong>
            </div>
            <Button
              block
              icon={<QrCode size={18} />}
              onClick={() => handleQuickLaunch('user')}
            >
              Enter User Interface <ArrowRight size={16} />
            </Button>
          </article>

          {/* 2. VOLUNTEERS / RESCUE TEAM */}
          <article className="portal-card portal-card--volunteer">
            <div className="portal-card__icon">
              <ShieldCheck size={28} />
            </div>
            <p className="eyebrow">Interface 2</p>
            <h2>2. Volunteers / Rescue Team</h2>
            <p>
              Register households and residents grouped by house name (e.g. <strong>Kuruvilla House</strong>).
              Scan civilian QR codes to immediately receive entered medical conditions, dosages, and vulnerability needs, and manage camp intake.
            </p>
            <div className="portal-card__creds">
              Login: <strong>volunteer@gmail.com</strong> / <strong>volunteer</strong>
            </div>
            <Button
              block
              variant="secondary"
              icon={<Truck size={18} />}
              onClick={() => handleQuickLaunch('volunteer')}
            >
              Enter Volunteer Interface <ArrowRight size={16} />
            </Button>
          </article>

          {/* 3. ADMIN */}
          <article className="portal-card portal-card--admin">
            <div className="portal-card__icon">
              <Command size={28} />
            </div>
            <p className="eyebrow">Interface 3</p>
            <h2>3. Admin</h2>
            <p>
              Incident leadership and DEOC command. Inspect the 500m Wayanad silence anomaly heatmap, review mathematical
              evidence for dark zones like Mundakkai, track field units, and dispatch rescue teams with uncertainty-aware scores.
            </p>
            <div className="portal-card__creds">
              Login: <strong>admin@gmail.com</strong> / <strong>admin</strong>
            </div>
            <Button
              block
              variant="quiet"
              icon={<ShieldAlert size={18} />}
              onClick={() => handleQuickLaunch('admin')}
            >
              Enter Admin Interface <ArrowRight size={16} />
            </Button>
          </article>
        </section>

        <p className="disclaimer">
          Sahayam Prototype · Tested with accounts <code>user@gmail.com</code>, <code>volunteer@gmail.com</code>, and <code>admin@gmail.com</code>.
          Changes and registered users persist across sessions in browser storage.
        </p>
      </main>
    </AppShell>
  )
}
