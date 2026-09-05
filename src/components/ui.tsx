import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, CircleAlert, Info, LoaderCircle, Wifi, WifiOff } from 'lucide-react'
import type { Severity } from '../data/fixtures'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'danger' | 'secondary' | 'quiet'
  icon?: ReactNode
  block?: boolean
}

export function Button({ variant = 'primary', icon, block, className = '', children, ...props }: ButtonProps) {
  return <button className={`button button--${variant} ${block ? 'button--block' : ''} ${className}`} {...props}>{icon}{children}</button>
}

export function StatusBadge({ severity, children }: { severity: Severity; children: ReactNode }) {
  const Icon = severity === 'safe' ? CheckCircle2 : severity === 'critical' ? CircleAlert : severity === 'info' ? Info : AlertTriangle
  return <span className={`status status--${severity}`}><Icon size={14} aria-hidden="true" />{children}</span>
}

export function ConnectionStatus({ offline = false, compact = false }: { offline?: boolean; compact?: boolean }) {
  const Icon = offline ? WifiOff : Wifi
  return <span className={`connection ${offline ? 'connection--offline' : ''}`}><Icon size={15} aria-hidden="true" />{compact ? (offline ? 'Offline' : 'Online') : (offline ? 'Offline · changes saved locally' : 'Online · synced 2 min ago')}</span>
}

export function Field({ label, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return <label className="field" htmlFor={id}><span>{label}</span><input id={id} {...props} /></label>
}

export function SelectField({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return <label className="field" htmlFor={id}><span>{label}</span><select id={id}>{children}</select></label>
}

export function Panel({ title, eyebrow, action, children, className = '' }: { title?: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>
    {(title || eyebrow || action) && <header className="panel__header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}{title && <h2>{title}</h2>}</div>{action}</header>}
    {children}
  </section>
}

export function SyncQueue({ count = 1 }: { count?: number }) {
  return <div className="notice notice--warning"><LoaderCircle size={20} aria-hidden="true" /><div><strong>{count} change{count === 1 ? '' : 's'} waiting to sync</strong><span>Stored securely on this device. We’ll retry automatically.</span></div></div>
}
