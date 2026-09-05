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

  it('renders the command center with uncertainty context', async () => {
    renderRoute('/command')
    expect(await screen.findByRole('heading', { name: 'Operational overview' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Selected cell'), { target: { value: 'WYD-09A' } })
    expect(screen.getByRole('heading', { name: 'Attamala East' })).toBeInTheDocument()
    expect(screen.getByText(/scores prioritize investigation/i)).toBeInTheDocument()
  })
})
