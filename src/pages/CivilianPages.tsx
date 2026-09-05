import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, MapPin, Navigation, PhoneCall, QrCode, Shield, Siren, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button, Panel, StatusBadge, SyncQueue } from '../components/ui'
import { camps } from '../data/fixtures'

const nav = [
  { to: '/civilian/sos', label: 'SOS', icon: Siren },
  { to: '/civilian/passport', label: 'Passport', icon: QrCode },
  { to: '/civilian/route', label: 'Safe route', icon: Navigation },
]

function CivilianLayout({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <AppShell><main className="mobile-workspace"><header className="page-heading"><p className="eyebrow">Civilian safety</p><h1>{title}</h1><p>{description}</p></header>{children}</main><nav className="mobile-nav" aria-label="Civilian navigation">{nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : ''}><Icon size={20} /><span>{label}</span></NavLink>)}</nav></AppShell>
}

export function SosPage() {
  return <CivilianLayout title="Emergency SOS" description="Send an urgent request for help. Your request is saved offline until delivery is confirmed.">
    <button className="sos-button"><Siren size={30} /><span><strong>Trigger emergency SOS</strong><small>Tap to review and send your location</small></span></button>
    <Panel title="What kind of help do you need?" className="section-card"><div className="choice-grid"><button><PhoneCall size={18} />Medical emergency</button><button><Users size={18} />Trapped or missing</button><button><MapPin size={18} />Food or water</button><button><AlertTriangle size={18} />Fire or landslide</button></div></Panel>
    <SyncQueue />
    <div className="notice notice--info"><Shield size={20} /><div><strong>Your SOS stays visible</strong><span>It remains active until a response team confirms delivery.</span></div></div>
  </CivilianLayout>
}

export function PassportPage() {
  return <CivilianLayout title="Community resilience passport" description="Show this code to an authorized relief worker to securely retrieve your household record.">
    <Panel className="passport-card"><div className="passport-top"><div className="qr-placeholder"><QrCode size={74} aria-label="Household QR code" /></div><div><StatusBadge severity="safe">Synced 2 hours ago</StatusBadge><h2>Household KH-0482</h2><p>Ward 11 · Meppadi</p></div></div><div className="passport-stats"><span><strong>4</strong> members</span><span><strong>1</strong> priority need</span><span><strong>2</strong> contacts</span></div></Panel>
    <div className="notice notice--info"><Shield size={20} /><div><strong>Privacy protected</strong><span>The QR contains only a secure lookup reference, never your medical information.</span></div></div>
    <div className="stack-actions"><Button block icon={<Navigation size={18} />}>View evacuation route</Button><Button block variant="danger" icon={<Siren size={18} />}>Emergency SOS</Button></div>
  </CivilianLayout>
}

export function RoutePage() {
  const camp = camps[0]
  return <CivilianLayout title="Evacuation route" description="Route selected using current hazard zones, road closures, elevation, and camp capacity.">
    <div className="notice notice--warning"><AlertTriangle size={20} /><div><strong>Flood warning active</strong><span>District hazard feed updated 12 min ago.</span></div></div>
    <div className="route-map" role="img" aria-label="Map preview showing safe route to St. Thomas HSS"><span className="map-label map-label--start">You</span><div className="route-line" /><span className="map-label map-label--end">Camp</span><span className="map-road">Kalpetta–Meppadi Road</span></div>
    <Panel eyebrow="Recommended destination" title={camp.name}><div className="camp-meta"><span><MapPin size={16} />{camp.distance}</span><span><Users size={16} />{camp.capacity}% occupied</span><span><CheckCircle2 size={16} />{camp.status}</span></div><div className="capacity"><span style={{ width: `${camp.capacity}%` }} /></div><p className="reason"><Shield size={17} />Safest available route avoids the river bridge closure.</p></Panel>
    <div className="route-summary"><span><Clock3 size={17} /><strong>18 min</strong> estimated</span><span><Navigation size={17} /><strong>2.1 km</strong> distance</span></div>
    <Button block icon={<ArrowRight size={18} />}>Start navigation</Button>
  </CivilianLayout>
}
