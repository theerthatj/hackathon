import { AlertTriangle, Camera, CheckCircle2, Database, PackageCheck, QrCode, Radio, Search, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button, Field, SelectField, StatusBadge, SyncQueue } from '../components/ui'
import { registry } from '../data/fixtures'

const nav = [
  { to: '/field/scanner', label: 'Scan', icon: QrCode },
  { to: '/field/registry', label: 'Registry', icon: Users },
  { to: '/field/member', label: 'Add member', icon: UserPlus },
]

function FieldLayout({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <AppShell><main className="mobile-workspace field-workspace"><header className="page-heading"><p className="eyebrow">Field operations · Camp C-12</p><h1>{title}</h1><p>{description}</p></header>{children}</main><nav className="mobile-nav" aria-label="Field navigation">{nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : ''}><Icon size={20} /><span>{label}</span></NavLink>)}</nav></AppShell>
}

export function ScannerPage() {
  return <FieldLayout title="Scan resilience passport" description="Scan a household QR or enter its code manually. No medical data is stored in the QR.">
    <div className="scanner"><div className="scan-frame"><i /><i /><i /><i /><Camera size={42} /><span>Align QR inside the frame</span></div></div>
    <Field id="household-code" label="Household code" placeholder="e.g. KH-0482" />
    <div className="notice notice--safe"><CheckCircle2 size={20} /><div><strong>Ready to scan</strong><span>Camera access stays on this device.</span></div></div>
    <div className="notice notice--critical"><AlertTriangle size={20} /><div><strong>Priority needs appear first</strong><span>Authorized field staff only.</span></div></div>
    <Button block icon={<ShieldCheck size={18} />}>Open household record</Button>
  </FieldLayout>
}

export function RegistryPage() {
  return <FieldLayout title="Offline camp registry" description="Live arrivals, reunification, and medical priority records for this camp.">
    <div className="metric-grid"><article><Radio size={20} /><strong>3</strong><span>Nearby nodes</span></article><article><Database size={20} /><strong>18</strong><span>Bundles stored</span></article></div>
    <SyncQueue count={18} />
    <label className="search-box"><Search size={18} /><input aria-label="Search registry" placeholder="Search name, house number, or phone" /></label>
    <div className="filter-row"><button className="is-active">All records</button><button>This camp</button><button>Priority</button></div>
    <div className="registry-list">{registry.map(person => <article key={person.name}><div className="avatar">{person.name.charAt(0)}</div><div><strong>{person.name} <small>({person.age})</small></strong><span>{person.detail}</span></div><StatusBadge severity={person.severity}>{person.state}</StatusBadge></article>)}</div>
  </FieldLayout>
}

export function AddMemberPage() {
  return <FieldLayout title="Add family member" description="Create a structured vulnerability profile. Changes are available offline and sync when connectivity returns.">
    <form className="member-form" onSubmit={event => event.preventDefault()}><div className="form-grid"><Field id="name" label="Full name" placeholder="e.g. Ammini K." /><Field id="age" label="Age" type="number" placeholder="68" /><SelectField id="gender" label="Gender"><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></SelectField><SelectField id="blood" label="Blood group"><option>O+</option><option>A+</option><option>B+</option><option>AB+</option><option>Unknown</option></SelectField></div><Field id="conditions" label="Medical conditions" placeholder="e.g. Diabetes, hypertension" /><Field id="medication" label="Medication and dosage schedule" placeholder="e.g. Insulin — 8 AM and 8 PM" /><Field id="disability" label="Disability or mobility needs" placeholder="e.g. Wheelchair user, hearing impaired" /><fieldset><legend>Vulnerability flags</legend><div className="flag-grid"><label><input type="checkbox" /> Elderly</label><label><input type="checkbox" /> Pregnant</label><label><input type="checkbox" /> Child under 5</label><label><input type="checkbox" /> Bedridden</label></div></fieldset><Field id="contact" label="Emergency contact" type="tel" placeholder="Name and phone number" /><Button type="submit" block icon={<PackageCheck size={18} />}>Save member to passport</Button></form>
  </FieldLayout>
}
