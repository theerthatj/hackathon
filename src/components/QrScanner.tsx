import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, CameraOff, RefreshCw, AlertCircle, Video, Image as ImageIcon } from 'lucide-react'
import jsQR from 'jsqr'

interface QrScannerProps {
  onScan: (token: string) => void
  onError?: (err: string) => void
  disabled?: boolean
}

export function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12) // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  } catch {
    // AudioContext blocked or not supported
  }
}

export function triggerHaptic() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([40, 30, 40])
    }
  } catch {
    // vibration not allowed
  }
}

export function QrScanner({ onScan, onError, disabled }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const animFrameId = useRef<number | null>(null)
  const lastScannedToken = useRef<string>('')
  const lastScannedTime = useRef<number>(0)

  const [isStreaming, setIsStreaming] = useState(false)
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  const stopStream = useCallback(() => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current)
      animFrameId.current = null
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
  }, [])

  const startStream = useCallback(async () => {
    stopStream()
    setCameraError(null)

    const isSecureContext = typeof window !== 'undefined'
      ? (window.isSecureContext ?? (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      : true

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const msg = !isSecureContext
        ? 'Live video stream requires HTTPS on mobile browsers. Use "Snap Photo with Camera" below or start Vite with HTTPS.'
        : 'Camera device is not available in this browser. Please use photo capture or manual input.'
      setCameraError(msg)
      onError?.(msg)
      return
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsStreaming(true)
      }
    } catch (err: any) {
      let message = 'Unable to access camera.'
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Please allow camera access in browser settings.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No optical camera device found on this system.'
      }
      setCameraError(message)
      onError?.(message)
    }
  }, [facingMode, onError, stopStream])

  // Native Photo Snap / File Upload handler (Works on HTTP without Secure Context restrictions)
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingPhoto(true)
    setCameraError(null)

    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let canvas = canvasRef.current
        if (!canvas) {
          canvas = document.createElement('canvas')
          canvasRef.current = canvas
        }
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          setIsProcessingPhoto(false)
          return
        }
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        setIsProcessingPhoto(false)
        if (code && code.data) {
          triggerHaptic()
          playSuccessChime()
          onScan(code.data)
        } else {
          const errMsg = 'No QR code detected in this photo. Please ensure good lighting, hold camera steady, and snap closer.'
          setCameraError(errMsg)
          onError?.(errMsg)
        }
      }
      img.onerror = () => {
        setIsProcessingPhoto(false)
        const errMsg = 'Failed to process selected image.'
        setCameraError(errMsg)
        onError?.(errMsg)
      }
      img.src = reader.result as string
    }
    reader.onerror = () => {
      setIsProcessingPhoto(false)
      const errMsg = 'Failed to read photo file.'
      setCameraError(errMsg)
      onError?.(errMsg)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Live video frame processing loop
  useEffect(() => {
    if (!isStreaming || disabled) return

    let isScanning = true

    // Check if native BarcodeDetector is available
    const hasNativeBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window
    const detector = hasNativeBarcodeDetector ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) : null

    const scanFrame = async () => {
      if (!isScanning) return

      const video = videoRef.current
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        let foundCode: string | null = null

        if (detector) {
          try {
            const barcodes = await detector.detect(video)
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              foundCode = barcodes[0].rawValue
            }
          } catch {
            // fallback to canvas
          }
        }

        if (!foundCode) {
          // Canvas fallback with jsQR
          let canvas = canvasRef.current
          if (!canvas) {
            canvas = document.createElement('canvas')
            canvasRef.current = canvas
          }

          if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
          if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            })
            if (code && code.data) {
              foundCode = code.data
            }
          }
        }

        if (foundCode) {
          const now = Date.now()
          // Debounce same token for 2.5 seconds
          if (foundCode !== lastScannedToken.current || now - lastScannedTime.current > 2500) {
            lastScannedToken.current = foundCode
            lastScannedTime.current = now
            triggerHaptic()
            playSuccessChime()
            onScan(foundCode)
          }
        }
      }

      if (isScanning) {
        animFrameId.current = requestAnimationFrame(scanFrame)
      }
    }

    animFrameId.current = requestAnimationFrame(scanFrame)

    return () => {
      isScanning = false
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current)
        animFrameId.current = null
      }
    }
  }, [isStreaming, disabled, onScan])

  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [stopStream])

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'))
  }

  return (
    <div className="qr-scanner-widget" style={{ width: '100%', marginBottom: '16px' }}>
      {/* Hidden Native Camera Photo Input (Works on HTTP without Secure Context restrictions) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhotoCapture}
        data-testid="photo-capture-input"
      />

      <div
        className="scanner-viewport"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          minHeight: '260px',
          margin: '0 auto',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: '#041512',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: isStreaming ? 'block' : 'none',
          }}
        />

        {/* Framing Crosshair Overlay */}
        <div className="scan-frame" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <i /><i /><i /><i />
          {!isStreaming && (
            <div style={{ textAlign: 'center', padding: '20px', pointerEvents: 'auto' }}>
              {cameraError ? (
                <div style={{ color: 'var(--critical)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={36} />
                  <span style={{ fontSize: '13px', maxWidth: '320px', lineHeight: 1.4 }}>{cameraError}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Camera size={42} color="var(--brand)" />
                  <span style={{ fontWeight: 600, color: 'var(--fg-strong)' }}>Optical Camera Standby</span>
                  <small style={{ color: 'var(--muted)', maxWidth: '280px' }}>
                    Tap "Snap Photo with Camera" or "Start Live Video" to scan resident QR pass
                  </small>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dual Scanner Controls: Snap Photo (Zero HTTP restrictions) + Live Video (HTTPS) */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="button button--primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingPhoto}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Camera size={16} /> {isProcessingPhoto ? 'Decoding Photo…' : 'Snap Photo with Camera'}
        </button>

        {!isStreaming ? (
          <button
            type="button"
            className="button button--secondary"
            onClick={startStream}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Video size={16} /> Start Live Video
          </button>
        ) : (
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={stopStream}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <CameraOff size={16} /> Stop Video
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={toggleFacingMode}
              title="Flip Camera"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={16} /> Flip
            </button>
          </>
        )}
      </div>
    </div>
  )
}
