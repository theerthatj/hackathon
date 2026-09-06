import { describe, expect, it } from 'vitest'
import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DtnRelayServer } from './dtnRelay'
import { hashBundlePayload } from '../src/data/canonical'

class MockRequest extends EventEmitter {
  public url: string
  public method: string
  public headers: Record<string, string>

  constructor(method: string, url: string, headers: Record<string, string> = {}) {
    super()
    this.method = method
    this.url = url
    this.headers = headers
  }

  pushBody(body: string | object) {
    const data = typeof body === 'string' ? body : JSON.stringify(body)
    process.nextTick(() => {
      this.emit('data', Buffer.from(data))
      this.emit('end')
    })
  }
}

class MockResponse extends EventEmitter {
  public statusCode = 200
  public headers: Record<string, string | number> = {}
  public body = ''
  public finished = false

  writeHead(statusCode: number, headers: Record<string, string | number> = {}) {
    this.statusCode = statusCode
    Object.assign(this.headers, headers)
    return this
  }

  setHeader(name: string, value: string | number) {
    this.headers[name] = value
    return this
  }

  write(chunk: string | Buffer) {
    this.body += chunk.toString()
    return true
  }

  end(chunk?: string | Buffer) {
    if (chunk) {
      this.body += chunk.toString()
    }
    this.finished = true
    this.emit('finish')
    return this
  }
}

describe('DtnRelayServer middleware', () => {
  it('handles GET /bundles with empty state initially', async () => {
    const relay = new DtnRelayServer()
    const req = new MockRequest('GET', '/api/dtn/bundles') as unknown as IncomingMessage
    const res = new MockResponse() as unknown as ServerResponse

    const handled = await relay.handleRequest(req, res)
    expect(handled).toBe(true)
    const mockRes = res as unknown as MockResponse
    expect(mockRes.statusCode).toBe(200)
    expect(JSON.parse(mockRes.body)).toEqual([])
    relay.stop()
  })

  it('rejects POST /sos with missing or tampered SHA-256 hash', async () => {
    const relay = new DtnRelayServer()
    const req = new MockRequest('POST', '/api/dtn/sos')
    const res = new MockResponse()

    const rawPayload = {
      bundleId: 'adu-tamper-1',
      originNodeId: 'usr-fake',
      originName: 'Fake User',
      householdName: 'Fake Villa',
      cellId: 'WYD-07C',
      emergencyType: 'Flood',
      coordinates: { lat: 11.5, lng: 76.1 },
      medicalSummary: 'None',
      priority: 'P1_HIGH',
      createdAt: '2026-09-06T00:00:00.000Z',
      integrityHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // incorrect hash
    }

    req.pushBody(rawPayload)
    const handled = await relay.handleRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    expect(handled).toBe(true)
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body)).toMatchObject({ error: 'HASH_MISMATCH' })
    relay.stop()
  })

  it('accepts valid SOS bundle and processes custody and uplink lifecycle', async () => {
    const relay = new DtnRelayServer()

    // 1. Prepare valid payload with verified SHA-256
    const baseBundle = {
      bundleId: 'adu-valid-100',
      originNodeId: 'usr-real',
      originName: 'Sujith Kumar',
      householdName: 'Sujith House',
      cellId: 'WYD-07C',
      emergencyType: 'Medical Emergency',
      coordinates: { lat: 11.552, lng: 76.102 },
      medicalSummary: 'Cardiac patient requires oxygen cylinder',
      priority: 'P0_CRITICAL' as const,
      createdAt: '2026-09-06T06:00:00.000Z',
    }
    const realHash = await hashBundlePayload(baseBundle)
    const fullPayload = {
      ...baseBundle,
      integrityHash: realHash,
      status: 'PENDING_LOCAL',
    }

    // 2. POST /sos
    const sosReq = new MockRequest('POST', '/api/dtn/sos')
    const sosRes = new MockResponse()
    sosReq.pushBody(fullPayload)

    await relay.handleRequest(sosReq as unknown as IncomingMessage, sosRes as unknown as ServerResponse)
    expect(sosRes.statusCode).toBe(201)
    expect(relay.getBundles()).toHaveLength(1)

    // 3. POST /custody
    const custodyReq = new MockRequest('POST', '/api/dtn/custody')
    const custodyRes = new MockResponse()
    custodyReq.pushBody({
      bundleId: 'adu-valid-100',
      custodianId: 'vol-ravi',
      custodianName: 'Ravi Kumar',
      location: 'Mundakkai Trail 4',
    })

    await relay.handleRequest(custodyReq as unknown as IncomingMessage, custodyRes as unknown as ServerResponse)
    expect(custodyRes.statusCode).toBe(200)
    const afterCustody = relay.getBundle('adu-valid-100')
    expect(afterCustody?.status).toBe('IN_TRANSIT')
    expect(afterCustody?.custodian?.name).toBe('Ravi Kumar')
    expect(afterCustody?.custodyReceipts).toHaveLength(1)

    // 4. POST /uplink
    const uplinkReq = new MockRequest('POST', '/api/dtn/uplink')
    const uplinkRes = new MockResponse()
    uplinkReq.pushBody({
      bundleId: 'adu-valid-100',
      gatewayName: 'Kalpetta Emergency HQ',
    })

    await relay.handleRequest(uplinkReq as unknown as IncomingMessage, uplinkRes as unknown as ServerResponse)
    expect(uplinkRes.statusCode).toBe(200)
    const afterUplink = relay.getBundle('adu-valid-100')
    expect(afterUplink?.status).toBe('DELIVERED_COMMAND')
    expect(afterUplink?.deliveredAt).toBeDefined()

    // 5. DELETE /bundles
    const delReq = new MockRequest('DELETE', '/api/dtn/bundles')
    const delRes = new MockResponse()
    await relay.handleRequest(delReq as unknown as IncomingMessage, delRes as unknown as ServerResponse)
    expect(delRes.statusCode).toBe(200)
    expect(relay.getBundles()).toHaveLength(0)

    relay.stop()
  })
})
