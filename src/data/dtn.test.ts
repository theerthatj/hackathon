import { describe, it, expect, beforeEach } from 'vitest'
import { dtnStore } from './dtn'

describe('Disconnected Data Distribution (DDD) DTN Store', () => {
  beforeEach(() => {
    dtnStore.resetDemo()
  })

  it('publishes an atomic ADU bundle with P0_CRITICAL priority and SHA-256 hash', async () => {
    const bundle = await dtnStore.publishSos({
      originNodeId: 'usr-kuru-1',
      originName: 'Ammini Kuruvilla',
      householdName: 'Kuruvilla House',
      cellId: 'WYD-07C',
      emergencyType: 'Medical emergency',
      coordinates: { lat: 11.552, lng: 76.102 },
      medicalSummary: 'Severe Diabetes, Hypertension',
      bloodGroup: 'B+',
      conditions: 'Type 2 Diabetes',
      medication: 'Insulin',
      isBedridden: false,
    })

    expect(bundle.bundleId).toMatch(/^adu-/)
    expect(bundle.status).toBe('PENDING_LOCAL')
    expect(bundle.priority).toBe('P0_CRITICAL')
    expect(bundle.integrityHash).toHaveLength(64)
    expect(bundle.encryptedHash).toHaveLength(64)
    expect(bundle.hashAlgo).toBe('SHA-256')
    expect(bundle.custodyReceipts).toHaveLength(1)
    expect(bundle.custodyReceipts[0].action).toBe('CREATED')

    const isValid = await dtnStore.verifyBundle(bundle as unknown as Record<string, unknown>)
    expect(isValid).toBe(true)
  })

  it('detects tampering and refuses custody and gateway uplink', async () => {
    const bundle = await dtnStore.publishSos({
      originNodeId: 'usr-tamper-test',
      originName: 'George',
      householdName: 'George House',
      cellId: 'WYD-07C',
      emergencyType: 'Medical emergency',
      medication: 'Insulin',
    })

    expect(await dtnStore.verifyBundle(bundle as unknown as Record<string, unknown>)).toBe(true)

    // Tamper with medical data
    bundle.medication = 'Steroids (Altered by attacker)'
    expect(await dtnStore.verifyBundle(bundle as unknown as Record<string, unknown>)).toBe(false)

    // Attempting custody on tampered bundle must be refused
    const custodyAttempt = await dtnStore.acceptCustody({
      bundleId: bundle.bundleId,
      custodianId: 'vol-1',
      custodianName: 'Volunteer',
    })
    expect(custodyAttempt).toBeUndefined()
    expect(bundle.tampered).toBe(true)

    // Attempting uplink on tampered bundle must also be refused
    const uplinkAttempt = await dtnStore.uplinkToGateway({
      bundleId: bundle.bundleId,
    })
    expect(uplinkAttempt).toBeUndefined()
  })

  it('allows volunteer to take courier custody and updates status to IN_TRANSIT', async () => {
    const bundle = await dtnStore.publishSos({
      originNodeId: 'usr-test-1',
      originName: 'Thomas Kuruvilla',
      householdName: 'Kuruvilla House',
      cellId: 'WYD-07C',
      emergencyType: 'Food or water',
    })

    const updated = await dtnStore.acceptCustody({
      bundleId: bundle.bundleId,
      custodianId: 'vol-ravi-1',
      custodianName: 'Ravi Kumar (Field Volunteer)',
      location: 'Mundakkai North · Trail #2',
    })

    expect(updated).toBeDefined()
    expect(updated?.status).toBe('IN_TRANSIT')
    expect(updated?.custodian?.name).toBe('Ravi Kumar (Field Volunteer)')
    expect(updated?.custodyReceipts).toHaveLength(2)
    expect(updated?.custodyReceipts[1].action).toBe('CUSTODY_ACQUIRED')
  })

  it('allows courier to uplink bundle to DEOC Command Gateway', async () => {
    const bundle = await dtnStore.publishSos({
      originNodeId: 'usr-test-2',
      originName: 'Maria Kuruvilla',
      householdName: 'Kuruvilla House',
      cellId: 'WYD-07C',
      emergencyType: 'Medical emergency',
    })

    await dtnStore.acceptCustody({
      bundleId: bundle.bundleId,
      custodianId: 'vol-ravi-1',
      custodianName: 'Ravi Kumar',
    })

    const delivered = await dtnStore.uplinkToGateway({
      bundleId: bundle.bundleId,
      gatewayName: 'St. Thomas HSS Relay Gateway',
    })

    expect(delivered).toBeDefined()
    expect(delivered?.status).toBe('DELIVERED_COMMAND')
    expect(delivered?.deliveredAt).toBeDefined()
    expect(delivered?.custodyReceipts).toHaveLength(3)
    expect(delivered?.custodyReceipts[2].action).toBe('GATEWAY_UPLINKED')
  })
})
