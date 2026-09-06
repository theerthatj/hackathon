import { useSyncExternalStore } from 'react'
import { hashBundlePayload } from './canonical'

export interface CustodyReceipt {
  custodianId: string
  custodianName: string
  timestamp: string
  location: string
  action: 'CREATED' | 'CUSTODY_ACQUIRED' | 'GATEWAY_UPLINKED' | 'ACKNOWLEDGED'
}

export interface ADUBundle {
  bundleId: string
  originNodeId: string
  originName: string
  householdName: string
  cellId: string
  emergencyType: string
  coordinates: { lat: number; lng: number }
  medicalSummary: string
  bloodGroup?: string
  conditions?: string
  medication?: string
  isBedridden?: boolean
  priority: 'P0_CRITICAL' | 'P1_HIGH' | 'P2_ROUTINE'
  integrityHash: string
  encryptedHash?: string
  hashAlgo?: string
  status: 'PENDING_LOCAL' | 'IN_TRANSIT' | 'DELIVERED_COMMAND'
  createdAt: string
  custodian?: { id: string; name: string; location: string }
  custodyReceipts: CustodyReceipt[]
  deliveredAt?: string
  tampered?: boolean
}

const STORAGE_KEY_DTN = 'sahayam_dtn_bundles_v2'

// Initial seed bundle for realistic demonstration if none exists yet
const SEED_BUNDLES: ADUBundle[] = []

function playEmergencyChime() {
  if (typeof window === 'undefined' || !window.AudioContext) return
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now) // A5
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15) // D6
    gain1.gain.setValueAtTime(0.15, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)
  } catch {
    // AudioContext permission may be restricted until user gesture
  }
}

class DtnStore {
  private bundles: ADUBundle[] = []
  private listeners: Array<() => void> = []
  private broadcastChannel: BroadcastChannel | null = null
  private eventSource: EventSource | null = null
  private connectedToRelay = false
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0

  constructor() {
    this.init()
  }

  private init() {
    if (typeof window === 'undefined') return

    // 1. Load from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DTN)
      if (stored) {
        this.bundles = JSON.parse(stored)
      } else {
        this.bundles = SEED_BUNDLES
        this.saveLocally()
      }
    } catch {
      this.bundles = SEED_BUNDLES
    }

    // 2. Setup BroadcastChannel for instant local cross-tab / cross-window sync
    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('sahayam_dtn_mesh')
        this.broadcastChannel.onmessage = (event) => {
          const { type, bundle } = event.data || {}
          if (type === 'DEMO_RESET' || type === 'CLEAR_BUNDLES') {
            this.bundles = []
            this.saveLocally()
            this.notify()
            return
          }
          if (bundle) {
            this.upsertBundle(bundle, false)
            if (type === 'NEW_SOS') {
              playEmergencyChime()
            }
          }
        }
      }
    } catch {
      // ignore broadcast channel error
    }

    // 3. Connect to Vite Multi-Device SSE Relay
    this.connectSse()

    // 4. Initial fetch of active bundles from server relay
    this.fetchServerBundles()
  }

  private connectSse() {
    if (typeof window === 'undefined' || !window.EventSource) return

    try {
      if (this.eventSource) {
        this.eventSource.close()
      }

      this.eventSource = new EventSource('/api/dtn/events')

      this.eventSource.addEventListener('init', async (e: MessageEvent) => {
        this.connectedToRelay = true
        this.reconnectAttempts = 0
        try {
          const serverBundles = JSON.parse(e.data) as ADUBundle[]
          if (Array.isArray(serverBundles)) {
            if (serverBundles.length === 0) {
              this.bundles = []
              this.saveLocally()
            } else {
              for (const b of serverBundles) {
                const valid = await this.verifyBundle(b as unknown as Record<string, unknown>)
                if (!valid) b.tampered = true
                this.upsertBundle(b, false)
              }
            }
          }
        } catch {
          // ignore parse error
        }
        this.notify()
      })

      this.eventSource.addEventListener('new_bundle', async (e: MessageEvent) => {
        try {
          const bundle = JSON.parse(e.data) as ADUBundle
          const valid = await this.verifyBundle(bundle as unknown as Record<string, unknown>)
          if (!valid) bundle.tampered = true
          this.upsertBundle(bundle, true)
          playEmergencyChime()
        } catch {
          // ignore error
        }
      })

      this.eventSource.addEventListener('custody_updated', async (e: MessageEvent) => {
        try {
          const bundle = JSON.parse(e.data) as ADUBundle
          const valid = await this.verifyBundle(bundle as unknown as Record<string, unknown>)
          if (!valid) bundle.tampered = true
          this.upsertBundle(bundle, true)
          playEmergencyChime()
        } catch {
          // ignore error
        }
      })

      this.eventSource.addEventListener('bundle_delivered', async (e: MessageEvent) => {
        try {
          const bundle = JSON.parse(e.data) as ADUBundle
          const valid = await this.verifyBundle(bundle as unknown as Record<string, unknown>)
          if (!valid) bundle.tampered = true
          this.upsertBundle(bundle, true)
          playEmergencyChime()
        } catch {
          // ignore error
        }
      })

      this.eventSource.onerror = () => {
        this.connectedToRelay = false
        this.notify()
        this.scheduleReconnect()
      }
    } catch {
      this.connectedToRelay = false
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return
    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10_000)
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      if (!this.connectedToRelay) {
        this.connectSse()
      }
    }, delay)
  }

  private async fetchServerBundles() {
    try {
      const res = await fetch('/api/dtn/bundles')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          for (const b of data) {
            const valid = await this.verifyBundle(b)
            if (!valid) b.tampered = true
            this.upsertBundle(b, false)
          }
        }
      }
    } catch {
      // server relay might be offline, relies on local storage & broadcast channel
    }
  }

  public async verifyBundle(bundle: Record<string, unknown>): Promise<boolean> {
    const hash = (bundle.integrityHash || bundle.encryptedHash) as string | undefined
    if (!hash || typeof hash !== 'string') return false
    const computed = await hashBundlePayload(bundle)
    return hash.toLowerCase() === computed.toLowerCase()
  }

  private upsertBundle(bundle: ADUBundle, shouldSave = true) {
    const existingIndex = this.bundles.findIndex(b => b.bundleId === bundle.bundleId)
    if (existingIndex >= 0) {
      this.bundles[existingIndex] = bundle
    } else {
      this.bundles = [bundle, ...this.bundles]
    }
    if (shouldSave) {
      this.saveLocally()
    }
    this.notify()
  }

  private saveLocally() {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      localStorage.setItem(STORAGE_KEY_DTN, JSON.stringify(this.bundles))
    } catch {
      // storage quota or permission
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach(cb => cb())
  }

  public getBundles(): ADUBundle[] {
    return this.bundles
  }

  public getBundleById(id: string): ADUBundle | undefined {
    return this.bundles.find(b => b.bundleId === id)
  }

  public isRelayConnected(): boolean {
    return this.connectedToRelay
  }

  // Publish a new SOS from a Civilian device
  public async publishSos(params: {
    originNodeId: string
    originName: string
    householdName: string
    cellId: string
    emergencyType: string
    coordinates?: { lat: number; lng: number }
    medicalSummary?: string
    bloodGroup?: string
    conditions?: string
    medication?: string
    isBedridden?: boolean
    priority?: 'P0_CRITICAL' | 'P1_HIGH' | 'P2_ROUTINE'
  }): Promise<ADUBundle> {
    const now = new Date().toISOString()
    const bundleId = `adu-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const preliminaryBundle: ADUBundle = {
      bundleId,
      originNodeId: params.originNodeId,
      originName: params.originName,
      householdName: params.householdName,
      cellId: params.cellId || 'WYD-07C',
      emergencyType: params.emergencyType,
      coordinates: params.coordinates || { lat: 11.552, lng: 76.102 },
      medicalSummary: params.medicalSummary || 'None reported',
      bloodGroup: params.bloodGroup || 'Unknown',
      conditions: params.conditions || 'None',
      medication: params.medication || 'None',
      isBedridden: !!params.isBedridden,
      priority: params.isBedridden || params.emergencyType.toLowerCase().includes('medical') || params.emergencyType.toLowerCase().includes('trapped')
        ? 'P0_CRITICAL'
        : 'P1_HIGH',
      integrityHash: '',
      hashAlgo: 'SHA-256',
      status: 'PENDING_LOCAL',
      createdAt: now,
      custodyReceipts: [
        {
          custodianId: params.originNodeId,
          custodianName: `${params.originName} (Victim Node)`,
          timestamp: now,
          location: `${params.householdName} · Cell ${params.cellId || 'WYD-07C'}`,
          action: 'CREATED',
        },
      ],
    }

    const calculatedHash = await hashBundlePayload(preliminaryBundle as unknown as Record<string, unknown>)
    const newBundle: ADUBundle = {
      ...preliminaryBundle,
      integrityHash: calculatedHash,
      encryptedHash: calculatedHash,
    }

    this.upsertBundle(newBundle, true)

    // Notify local tabs
    this.broadcastChannel?.postMessage({ type: 'NEW_SOS', bundle: newBundle })

    // Send to Vite relay for multi-device broadcast
    try {
      await fetch('/api/dtn/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBundle),
      })
    } catch {
      // offline transmission queued
    }

    playEmergencyChime()
    return newBundle
  }

  // Volunteer takes courier custody
  public async acceptCustody(params: {
    bundleId: string
    custodianId: string
    custodianName: string
    location?: string
  }): Promise<ADUBundle | undefined> {
    const bundle = this.bundles.find(b => b.bundleId === params.bundleId)
    if (!bundle) return undefined

    // Verify bundle integrity prior to accepting physical custody
    const isValid = await this.verifyBundle(bundle as unknown as Record<string, unknown>)
    if (!isValid) {
      bundle.tampered = true
      this.saveLocally()
      this.notify()
      return undefined
    }

    const now = new Date().toISOString()
    bundle.status = 'IN_TRANSIT'
    bundle.custodian = {
      id: params.custodianId,
      name: params.custodianName,
      location: params.location || 'Mundakkai Trail · Sector 4',
    }
    bundle.custodyReceipts.push({
      custodianId: params.custodianId,
      custodianName: params.custodianName,
      timestamp: now,
      location: params.location || 'Mundakkai Trail · Sector 4',
      action: 'CUSTODY_ACQUIRED',
    })

    this.upsertBundle(bundle, true)
    this.broadcastChannel?.postMessage({ type: 'CUSTODY_UPDATED', bundle })

    try {
      await fetch('/api/dtn/custody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleId: params.bundleId,
          custodianId: params.custodianId,
          custodianName: params.custodianName,
          location: params.location,
        }),
      })
    } catch {
      // ignore relay error
    }

    return bundle
  }

  // Volunteer or transport courier reaches gateway and flushes to DEOC command
  public async uplinkToGateway(params: {
    bundleId: string
    gatewayName?: string
  }): Promise<ADUBundle | undefined> {
    const bundle = this.bundles.find(b => b.bundleId === params.bundleId)
    if (!bundle) return undefined

    // Verify bundle integrity prior to uplink delivery
    const isValid = await this.verifyBundle(bundle as unknown as Record<string, unknown>)
    if (!isValid) {
      bundle.tampered = true
      this.saveLocally()
      this.notify()
      return undefined
    }

    const now = new Date().toISOString()
    bundle.status = 'DELIVERED_COMMAND'
    bundle.deliveredAt = now
    bundle.custodyReceipts.push({
      custodianId: 'deoc-gateway-kalpetta',
      custodianName: params.gatewayName || 'St. Thomas HSS Relay Gateway',
      timestamp: now,
      location: 'Kalpetta District Emergency Ops Centre',
      action: 'GATEWAY_UPLINKED',
    })

    this.upsertBundle(bundle, true)
    this.broadcastChannel?.postMessage({ type: 'BUNDLE_DELIVERED', bundle })

    try {
      await fetch('/api/dtn/uplink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleId: params.bundleId,
          gatewayName: params.gatewayName,
        }),
      })
    } catch {
      // ignore relay error
    }

    return bundle
  }

  // Clear or reset demo data across local storage, tabs, and server
  public resetDemo() {
    this.bundles = []
    this.saveLocally()
    this.notify()
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_DTN, '[]')
        localStorage.removeItem('sahayam_dtn_bundles')
        localStorage.removeItem('sahayam_dtn_bundles_v1')
      } catch {
        // ignore localStorage error
      }
      this.broadcastChannel?.postMessage({ type: 'DEMO_RESET' })
      fetch('/api/dtn/bundles', { method: 'DELETE' }).catch(() => {})
      const apiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : ''
      if (apiUrl) {
        fetch(`${apiUrl}/api/dtn/bundles`, { method: 'DELETE' }).catch(() => {})
      }
    }
  }
}

export const dtnStore = new DtnStore()

export function useDtnMesh() {
  const bundles = useSyncExternalStore(
    cb => dtnStore.subscribe(cb),
    () => dtnStore.getBundles()
  )

  const isConnected = useSyncExternalStore(
    cb => dtnStore.subscribe(cb),
    () => dtnStore.isRelayConnected()
  )

  const pendingBundles = bundles.filter(b => b.status === 'PENDING_LOCAL')
  const inTransitBundles = bundles.filter(b => b.status === 'IN_TRANSIT')
  const deliveredBundles = bundles.filter(b => b.status === 'DELIVERED_COMMAND')

  return {
    bundles,
    pendingBundles,
    inTransitBundles,
    deliveredBundles,
    isRelayConnected: isConnected,
    publishSos: dtnStore.publishSos.bind(dtnStore),
    acceptCustody: dtnStore.acceptCustody.bind(dtnStore),
    uplinkToGateway: dtnStore.uplinkToGateway.bind(dtnStore),
    verifyBundle: dtnStore.verifyBundle.bind(dtnStore),
    resetDemo: dtnStore.resetDemo.bind(dtnStore),
  }
}
