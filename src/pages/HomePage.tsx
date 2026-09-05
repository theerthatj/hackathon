import { ArrowRight, Command, HeartHandshake, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'

const workspaces = [
  { to: '/civilian/sos', icon: HeartHandshake, eyebrow: 'Residents & families', title: 'Civilian safety', text: 'Emergency SOS, resilience passport, and safer evacuation routes.' },
  { to: '/field/scanner', icon: ShieldCheck, eyebrow: 'Volunteers & ASHA workers', title: 'Field operations', text: 'Scan passports, register arrivals, and manage priority needs offline.' },
  { to: '/command', icon: Command, eyebrow: 'Incident leadership', title: 'Command center', text: 'Investigate silent zones, understand score evidence, and dispatch teams.' },
]

export function HomePage() {
  return <AppShell><main className="home"><section className="hero"><div><p className="eyebrow">Disaster resilience · Offline coordination</p><h1>Find the people<br />the signal misses.</h1><p>Sahayam turns expected-versus-observed signals into an explainable triage queue while keeping residents and field teams connected through degraded conditions.</p></div><div className="hero-visual"><span className="pulse pulse--1" /><span className="pulse pulse--2" /><span className="pulse pulse--3" /><div><HeartHandshake size={42} /><strong>SAHAYAM</strong><small>Help remains visible</small></div></div></section><section className="workspace-grid">{workspaces.map(({ to, icon: Icon, eyebrow, title, text }) => <Link to={to} key={to}><Icon size={26} /><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><span>{text}</span><b>Open workspace <ArrowRight size={17} /></b></Link>)}</section><p className="disclaimer">Demo data is synthetic and illustrative. Algorithmic scores support human investigation and never replace field verification.</p></main></AppShell>
}
