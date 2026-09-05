import { Activity, Bell, Command, HeartHandshake, Moon, ShieldCheck, Sun } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { ConnectionStatus } from './ui'

const roles = [
  { to: '/civilian/sos', label: 'Civilian', icon: HeartHandshake },
  { to: '/field/scanner', label: 'Field team', icon: ShieldCheck },
  { to: '/command', label: 'Command', icon: Command },
]

export function AppShell({ children, mode = 'standard' }: { children: ReactNode; mode?: 'standard' | 'command' }) {
  const [dark, setDark] = useState(() => globalThis.localStorage?.getItem('sahayam-theme') === 'dark')
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    globalThis.localStorage?.setItem('sahayam-theme', dark ? 'dark' : 'light')
  }, [dark])

  return <div className={`app app--${mode}`}>
    <header className="topbar">
      <NavLink to="/" className="brand" aria-label="Sahayam home"><span className="brand__mark"><HeartHandshake size={20} /></span><span><strong>SAHAYAM</strong><small>Resilience network</small></span></NavLink>
      <nav className="role-nav" aria-label="Choose workspace">
        {roles.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `role-link ${isActive ? 'is-active' : ''}`}><Icon size={16} />{label}</NavLink>)}
      </nav>
      <div className="topbar__actions"><ConnectionStatus compact /><button className="icon-button" aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></button><button className="icon-button" onClick={() => setDark(value => !value)} aria-label={dark ? 'Use light theme' : 'Use dark theme'}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button></div>
    </header>
    {mode === 'command' && <div className="incident-strip"><span><Activity size={15} /> Active incident</span><strong>Wayanad Flood Response · Operational period 03</strong><time>Data updated 2 min ago</time></div>}
    {children}
  </div>
}
