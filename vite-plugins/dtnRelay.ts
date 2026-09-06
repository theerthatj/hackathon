import type { Plugin, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import crypto from 'node:crypto'
import { canonicalize, extractImmutableBundlePayload } from '../src/data/canonical'

export interface RelayBundle {
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
  custodyReceipts: Array<{
    custodianId: string
    custodianName: string
    timestamp: string
    location: string
    action: string
  }>
  deliveredAt?: string
  tampered?: boolean
}

export class DtnRelayServer {
  private bundles = new Map<string, RelayBundle>()
  private sseClients = new Set<ServerResponse>()
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startHeartbeat()
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return
    this.heartbeatInterval = setInterval(() => {
      this.broadcastRaw(': heartbeat\n\n')
    }, 25_000)
    // Don't keep Node process alive just for the heartbeat timer
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref()
    }
  }

  public stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    this.sseClients.clear()
  }

  public getBundles(): RelayBundle[] {
    return Array.from(this.bundles.values())
  }

  public getBundle(id: string): RelayBundle | undefined {
    return this.bundles.get(id)
  }

  public clearBundles() {
    this.bundles.clear()
    this.broadcastEvent('init', [])
  }

  public broadcastEvent(eventName: string, data: unknown) {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`
    this.broadcastRaw(message)
  }

  private broadcastRaw(rawMessage: string) {
    this.sseClients.forEach(client => {
      try {
        client.write(rawMessage)
      } catch {
        this.sseClients.delete(client)
      }
    })
  }

  public handleSseConnection(req: IncomingMessage, res: ServerResponse) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    })

    this.sseClients.add(res)

    // Initial state payload
    res.write(`event: init\ndata: ${JSON.stringify(this.getBundles())}\n\n`)

    req.on('close', () => {
      this.sseClients.delete(res)
    })
  }

  public verifyPayloadHash(bundle: Record<string, unknown>): boolean {
    const hash = (bundle.integrityHash || bundle.encryptedHash) as string | undefined
    if (!hash || typeof hash !== 'string') return false

    const canonicalStr = canonicalize(extractImmutableBundlePayload(bundle))
    const computedHash = crypto.createHash('sha256').update(canonicalStr, 'utf8').digest('hex')
    return hash.toLowerCase() === computedHash.toLowerCase()
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = req.url || ''
    const method = req.method?.toUpperCase() || 'GET'

    // Only handle /api/dtn routes
    const pathname = url.split('?')[0]
    if (!pathname.startsWith('/api/dtn') && !pathname.startsWith('/dtn')) {
      return false
    }

    const subpath = pathname.replace(/^\/api\/dtn/, '').replace(/^\/dtn/, '') || '/'

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      })
      res.end()
      return true
    }

    res.setHeader('Access-Control-Allow-Origin', '*')

    // 1. SSE event stream
    if (method === 'GET' && subpath === '/events') {
      this.handleSseConnection(req, res)
      return true
    }

    // 2. GET all bundles
    if (method === 'GET' && (subpath === '/bundles' || subpath === '')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(this.getBundles()))
      return true
    }

    // 3. DELETE all bundles (demo reset)
    if (method === 'DELETE' && subpath === '/bundles') {
      this.clearBundles()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, message: 'All bundles cleared' }))
      return true
    }

    // 4. POST /sos
    if (method === 'POST' && subpath === '/sos') {
      try {
        const body = await this.readJsonBody(req) as RelayBundle
        const { bundleId, originNodeId, cellId, emergencyType } = body
        const hash = body.integrityHash || body.encryptedHash

        if (!bundleId || !originNodeId || !cellId || !emergencyType || !hash) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'INVALID_PAYLOAD', message: 'Missing required bundle fields' }))
          return true
        }

        // Verify cryptographic SHA-256 hash
        const isValid = this.verifyPayloadHash(body as unknown as Record<string, unknown>)
        if (!isValid) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'HASH_MISMATCH', message: 'Payload does not match SHA-256 integrity hash' }))
          return true
        }

        const normalizedBundle: RelayBundle = {
          ...body,
          integrityHash: hash,
          encryptedHash: hash,
          hashAlgo: 'SHA-256',
          status: body.status || 'PENDING_LOCAL',
        }

        this.bundles.set(bundleId, normalizedBundle)
        this.broadcastEvent('new_bundle', normalizedBundle)

        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, bundle: normalizedBundle }))
        return true
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'BAD_REQUEST', message: 'Malformed JSON body' }))
        return true
      }
    }

    // 5. POST /custody
    if (method === 'POST' && subpath === '/custody') {
      try {
        const body = await this.readJsonBody(req) as {
          bundleId: string
          custodianId: string
          custodianName: string
          location?: string
        }

        const bundle = this.bundles.get(body.bundleId)
        if (!bundle) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Bundle not found' }))
          return true
        }

        const now = new Date().toISOString()
        bundle.status = 'IN_TRANSIT'
        bundle.custodian = {
          id: body.custodianId,
          name: body.custodianName,
          location: body.location || 'Field Trail',
        }
        bundle.custodyReceipts = bundle.custodyReceipts || []
        bundle.custodyReceipts.push({
          custodianId: body.custodianId,
          custodianName: body.custodianName,
          timestamp: now,
          location: body.location || 'Field Trail',
          action: 'CUSTODY_ACQUIRED',
        })

        this.broadcastEvent('custody_updated', bundle)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, bundle }))
        return true
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'BAD_REQUEST', message: 'Malformed JSON body' }))
        return true
      }
    }

    // 6. POST /uplink
    if (method === 'POST' && subpath === '/uplink') {
      try {
        const body = await this.readJsonBody(req) as {
          bundleId: string
          gatewayName?: string
        }

        const bundle = this.bundles.get(body.bundleId)
        if (!bundle) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Bundle not found' }))
          return true
        }

        const now = new Date().toISOString()
        bundle.status = 'DELIVERED_COMMAND'
        bundle.deliveredAt = now
        bundle.custodyReceipts = bundle.custodyReceipts || []
        bundle.custodyReceipts.push({
          custodianId: 'gateway-uplink',
          custodianName: body.gatewayName || 'DEOC Gateway',
          timestamp: now,
          location: 'Command Operations Centre',
          action: 'GATEWAY_UPLINKED',
        })

        this.broadcastEvent('bundle_delivered', bundle)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, bundle }))
        return true
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'BAD_REQUEST', message: 'Malformed JSON body' }))
        return true
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'NOT_FOUND', message: `Cannot ${method} ${pathname}` }))
    return true
  }

  private readJsonBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let data = ''
      req.on('data', chunk => {
        data += chunk
      })
      req.on('end', () => {
        if (!data) return resolve({})
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
      req.on('error', reject)
    })
  }
}

export function dtnRelayPlugin(): Plugin {
  const relay = new DtnRelayServer()

  return {
    name: 'sahayam-dtn-relay',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (url.startsWith('/api/dtn')) {
          const handled = await relay.handleRequest(req, res)
          if (handled) return
        }
        next()
      })
    },
  }
}
