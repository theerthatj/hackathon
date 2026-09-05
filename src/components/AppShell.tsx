import { Activity, Command, HeartHandshake, LogOut, Moon, ShieldCheck, Sun, UserCheck, Users } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { ConnectionStatus } from './ui'
import { useSahayamStore, type Role } from '../data/store'

export function AppShell({ children, mode = 'standard' }: { children: ReactNode; mode?: 'standard' | 'command' }) {
  const [dark, setDark] = useState(() => globalThis.localStorage?.getItem('sahayam-theme') === 'dark')
  const { auth, setRole, logout } = useSahayamStore()
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    globalThis.localStorage?.setItem('sahayam-theme', dark ? 'dark' : 'light')
  }, [dark])

  const handleRoleSwitch = (newRole: Role) => {
    setRole(newRole)
    if (newRole === 'user') navigate('/civilian/passport')
    else if (newRole === 'volunteer') navigate('/field/scanner')
    else if (newRole === 'admin') navigate('/command')
  }

  return (
    <div className={`app app--${mode}`}>
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Sahayam home">
          <span className="brand__mark"><HeartHandshake size={20} /></span>
          <span><strong>SAHAYAM</strong><small>Resilience network</small></span>
        </NavLink>

        <nav className="role-nav" aria-label="Choose workspace">
          <NavLink
            to="/civilian/passport"
            className={({ isActive }) => `role-link ${isActive ? 'is-active' : ''}`}
            title="User / Household interface"
          >
            <Users size={16} />
            <span>1. Users</span>
          </NavLink>

          <NavLink
            to="/field/scanner"
            className={({ isActive }) => `role-link ${isActive ? 'is-active' : ''}`}
            title="Volunteers & Rescue Teams"
          >
            <ShieldCheck size={16} />
            <span>2. Volunteers / Rescue</span>
          </NavLink>

          <NavLink
            to="/command"
            className={({ isActive }) => `role-link ${isActive ? 'is-active' : ''}`}
            title="Incident Command / Admin"
          >
            <Command size={16} />
            <span>3. Admin</span>
          </NavLink>
        </nav>

        <div className="topbar__actions">
          {auth && (
            <div className="proto-badges" style={{ alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  color: 'var(--muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <UserCheck size={13} />
                <b>{auth.email}</b>
              </span>
              <button
                className="proto-badge-btn"
                onClick={() => {
                  const nextRole = auth.role === 'user' ? 'volunteer' : auth.role === 'volunteer' ? 'admin' : 'user'
                  handleRoleSwitch(nextRole)
                }}
                title="Click to cycle prototype role"
              >
                Switch Role
              </button>
            </div>
          )}

          <ConnectionStatus compact />
          <button className="icon-button" onClick={() => setDark(value => !value)} aria-label={dark ? 'Use light theme' : 'Use dark theme'}>
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>

      {mode === 'command' && (
        <div className="incident-strip">
          <span><Activity size={15} /> Active incident</span>
          <strong>Wayanad Landslide & Flood Response · Sector WYD-07C Mundakkai</strong>
          <time>Silence model aggregate: 2 min ago</time>
        </div>
      )}

      {children}
    </div>
  )
}
