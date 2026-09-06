import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QrScanner, playSuccessChime, triggerHaptic } from './QrScanner'

describe('QrScanner Component', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders dual camera controls with photo capture and live video buttons', () => {
    const handleScan = vi.fn()
    render(<QrScanner onScan={handleScan} />)

    expect(screen.getByText('Optical Camera Standby')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /snap photo with camera/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start live video/i })).toBeInTheDocument()
    expect(screen.getByTestId('photo-capture-input')).toBeInTheDocument()
  })

  it('handles missing getUserMedia gracefully and advises on HTTPS', async () => {
    const handleScan = vi.fn()
    const handleError = vi.fn()

    // simulate insecure environment without mediaDevices
    const originalMediaDevices = navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      configurable: true,
      writable: true,
    })

    render(<QrScanner onScan={handleScan} onError={handleError} />)

    const startBtn = screen.getByRole('button', { name: /start live video/i })
    fireEvent.click(startBtn)

    expect(await screen.findByText(/live video stream requires https/i)).toBeInTheDocument()
    expect(handleError).toHaveBeenCalled()

    // restore
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
      writable: true,
    })
  })

  it('triggers haptic feedback and success chime safely', () => {
    expect(() => triggerHaptic()).not.toThrow()
    expect(() => playSuccessChime()).not.toThrow()
  })
})
