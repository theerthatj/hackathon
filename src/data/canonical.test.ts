import { describe, expect, it } from 'vitest'
import { canonicalize, extractImmutableBundlePayload, hashBundlePayload } from './canonical'

describe('canonical serializer and hashing', () => {
  it('produces identical string regardless of key insertion order', () => {
    const objA = { b: 2, a: 1, nested: { y: 'test', x: 42 } }
    const objB = { nested: { x: 42, y: 'test' }, a: 1, b: 2 }

    expect(canonicalize(objA)).toBe(canonicalize(objB))
    expect(canonicalize(objA)).toBe('{"a":1,"b":2,"nested":{"x":42,"y":"test"}}')
  })

  it('omits undefined properties cleanly', () => {
    const objWithUndefined = { a: 1, b: undefined, c: 3 }
    const objWithout = { a: 1, c: 3 }

    expect(canonicalize(objWithUndefined)).toBe(canonicalize(objWithout))
    expect(canonicalize(objWithUndefined)).toBe('{"a":1,"c":3}')
  })

  it('generates consistent SHA-256 hash for known payload', async () => {
    const payload = {
      bundleId: 'adu-12345',
      originNodeId: 'usr-1',
      originName: 'Thomas',
      householdName: 'Thomas Villa',
      cellId: 'WYD-07C',
      emergencyType: 'Trapped or missing',
      coordinates: { lat: 11.552, lng: 76.102 },
      medicalSummary: 'Insulin dependent',
      bloodGroup: 'O+',
      conditions: 'Diabetes',
      medication: 'Insulin 10U',
      isBedridden: false,
      priority: 'P1_HIGH' as const,
      createdAt: '2026-09-06T00:00:00.000Z',
    }

    const hash1 = await hashBundlePayload(payload)
    const hash2 = await hashBundlePayload({ ...payload })

    expect(hash1).toHaveLength(64)
    expect(hash1).toBe(hash2)
  })

  it('excludes mutable tracking fields from payload hash', async () => {
    const base = {
      bundleId: 'adu-test-01',
      originNodeId: 'usr-1',
      originName: 'George',
      householdName: 'House A',
      cellId: 'WYD-07C',
      emergencyType: 'Medical',
      coordinates: { lat: 11.5, lng: 76.1 },
      medicalSummary: 'None',
      priority: 'P1_HIGH' as const,
      createdAt: '2026-09-06T01:00:00.000Z',
    }

    const hashInitial = await hashBundlePayload(base)

    // With mutable fields attached
    const withMutable = {
      ...base,
      status: 'IN_TRANSIT',
      custodian: { id: 'vol-1', name: 'Ravi', location: 'Trail 4' },
      custodyReceipts: [{ custodianId: 'vol-1', action: 'CUSTODY_ACQUIRED', timestamp: '2026-09-06T01:10:00.000Z', location: 'Trail 4' }],
      deliveredAt: '2026-09-06T01:30:00.000Z',
    }

    const hashAfterHops = await hashBundlePayload(withMutable)
    expect(hashAfterHops).toBe(hashInitial)
  })

  it('extracts only registered immutable fields', () => {
    const raw = {
      bundleId: 'b1',
      extraInternalNote: 'should be stripped',
      status: 'IN_TRANSIT',
      emergencyType: 'Flood',
    }
    const extracted = extractImmutableBundlePayload(raw)
    expect(extracted).toEqual({
      bundleId: 'b1',
      emergencyType: 'Flood',
    })
  })
})
