import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

function renderRoute(route: string) {
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>)
}

describe('Sahayam routes', () => {
  it('renders the civilian emergency workflow', () => {
    renderRoute('/civilian/sos')
    expect(screen.getByRole('heading', { name: 'Emergency SOS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /trigger emergency sos/i })).toBeInTheDocument()
  })

  it('renders the field registry', () => {
    renderRoute('/field/registry')
    expect(screen.getByRole('heading', { name: 'Offline camp registry' })).toBeInTheDocument()
    expect(screen.getByText('Ammini K.')).toBeInTheDocument()
  })

  it('renders the safe evacuation route with navigable camps map', () => {
    renderRoute('/civilian/route')
    expect(screen.getByRole('heading', { name: 'Safe Evacuation Route' })).toBeInTheDocument()
    expect(screen.getAllByText('St. Thomas HSS').length).toBeGreaterThan(0)
    expect(screen.getByText('Govt. College Kalpetta')).toBeInTheDocument()
    expect(screen.getByText('Community Hall Meppadi')).toBeInTheDocument()
  })

  it('renders the command center with uncertainty context', async () => {
    renderRoute('/command')
    expect(await screen.findByRole('heading', { name: 'Operational overview' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Selected cell'), { target: { value: 'WYD-09A' } })
    expect(screen.getByRole('heading', { name: 'Attamala East' })).toBeInTheDocument()
    expect(screen.getByText(/scores prioritize investigation/i)).toBeInTheDocument()
  })

  it('renders the 3 landing page interfaces with prototype credentials', () => {
    renderRoute('/')
    expect(screen.getByRole('heading', { name: '1. Users' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '2. Volunteers / Rescue Team' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '3. Admin' })).toBeInTheDocument()
    expect(screen.getAllByText(/user@gmail\.com/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/volunteer@gmail\.com/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/admin@gmail\.com/i).length).toBeGreaterThan(0)
  })

  it('groups users under household name and generates QR code scan lookup', async () => {
    const { store } = await import('./data/store')
    
    // Test grouping under "Kuruvilla" -> "Kuruvilla House"
    const { member, household } = await store.addMemberToHousehold({
      householdName: 'Kuruvilla',
      name: 'Nihal Kuruvilla',
      age: 12,
      gender: 'Male',
      bloodGroup: 'O+',
      conditions: 'Peanut allergy',
      medication: 'EpiPen carry',
      disability: 'None',
      isElderly: false,
      isPregnant: false,
      isInfant: false,
      isBedridden: false,
      emergencyContact: '+91 94471 20492',
    })

    expect(household.name).toBe('Kuruvilla House')
    expect(member.householdName).toBe('Kuruvilla House')
    expect(member.qrToken).toContain('sahayam:user:')
    expect(member.qrDataUrl).toBeTruthy()

    // Test QR lookup
    const scanned = store.getMemberByQr(member.qrToken)
    expect(scanned).toBeDefined()
    expect(scanned?.name).toBe('Nihal Kuruvilla')
    expect(scanned?.householdName).toBe('Kuruvilla House')
    expect(scanned?.conditions).toBe('Peanut allergy')
    expect(scanned?.medication).toBe('EpiPen carry')
  })

  it('validates prototype login credentials', async () => {
    const { store } = await import('./data/store')
    
    const userRes = store.login('user@gmail.com', 'user')
    expect(userRes.success).toBe(true)
    expect(userRes.role).toBe('user')

    const volRes = store.login('volunteer@gmail.com', 'volunteer')
    expect(volRes.success).toBe(true)
    expect(volRes.role).toBe('volunteer')

    const adminRes = store.login('admin@gmail.com', 'admin')
    expect(adminRes.success).toBe(true)
    expect(adminRes.role).toBe('admin')

    const invalidRes = store.login('wrong@gmail.com', 'badpass')
    expect(invalidRes.success).toBe(false)
  })
})
