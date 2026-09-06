import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { syncQueue } from './syncQueue'
import * as client from '../api/client'

describe('syncQueue IndexedDB Outbox', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    // Clear indexedDB
    const items = await syncQueue.getItems()
    for (const item of items) {
      item.status = 'SERVER_ACCEPTED'
      await syncQueue.updateItem(item)
    }
    await syncQueue.clearAccepted()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('enqueues item with LOCAL_ONLY when API is not enabled', async () => {
    vi.spyOn(client, 'isApiEnabled').mockReturnValue(false)

    const item = await syncQueue.enqueue('CREATE_HOUSEHOLD', {
      name: 'Test House',
      head: 'Tester',
    })

    expect(item.id).toMatch(/^sync-/)
    expect(item.status).toBe('LOCAL_ONLY')
    expect(item.retries).toBe(0)

    const all = await syncQueue.getItems()
    expect(all.some(i => i.id === item.id)).toBe(true)
  })

  it('enqueues item with QUEUED when API is enabled', async () => {
    vi.spyOn(client, 'isApiEnabled').mockReturnValue(true)
    vi.spyOn(client, 'apiCreateHousehold').mockResolvedValue({ ok: true, id: 'hh-123' })

    const item = await syncQueue.enqueue('CREATE_HOUSEHOLD', {
      name: 'Test House 2',
      head: 'Tester 2',
    })

    // It was enqueued with QUEUED (and might have auto-flushed to SERVER_ACCEPTED)
    const all = await syncQueue.getItems()
    const stored = all.find(i => i.id === item.id)
    expect(stored).toBeDefined()
    expect(['QUEUED', 'TRANSFERRED', 'SERVER_ACCEPTED']).toContain(stored?.status)
  })

  it('flushes pending queue items to SERVER_ACCEPTED on successful api call', async () => {
    // 1. Enqueue while offline or disabled
    vi.spyOn(client, 'isApiEnabled').mockReturnValue(false)
    const createMock = vi.spyOn(client, 'apiCreateHousehold').mockResolvedValue({ ok: true, id: 'hh-ok' })

    const item = await syncQueue.enqueue('CREATE_HOUSEHOLD', {
      name: 'Test House Flush',
      head: 'Tester Flush',
    })

    // Mark it as queued ready to sync
    item.status = 'QUEUED'
    await syncQueue.updateItem(item)

    // 2. Now API is available and we flush
    vi.spyOn(client, 'isApiEnabled').mockReturnValue(true)
    const result = await syncQueue.flush()
    expect(result.processed).toBeGreaterThanOrEqual(1)
    expect(result.succeeded).toBeGreaterThanOrEqual(1)
    expect(createMock).toHaveBeenCalled()

    const all = await syncQueue.getItems()
    const updated = all.find(i => i.id === item.id)
    expect(updated?.status).toBe('SERVER_ACCEPTED')
  })

  it('marks item FAILED and increments retries when API throws error', async () => {
    // 1. Enqueue while offline
    vi.spyOn(client, 'isApiEnabled').mockReturnValue(false)
    vi.spyOn(client, 'apiCreateHousehold').mockRejectedValue(new Error('Network error 503'))

    const item = await syncQueue.enqueue('CREATE_HOUSEHOLD', {
      name: 'Test House Fail',
      head: 'Tester Fail',
    })

    item.status = 'QUEUED'
    await syncQueue.updateItem(item)

    // 2. Now API is available, attempts sync and fails
    vi.spyOn(client, 'isApiEnabled').mockReturnValue(true)
    const result = await syncQueue.flush()
    expect(result.failed).toBeGreaterThanOrEqual(1)

    const all = await syncQueue.getItems()
    const updated = all.find(i => i.id === item.id)
    expect(updated?.status).toBe('FAILED')
    expect(updated?.retries).toBe(1)
    expect(updated?.error).toContain('Network error 503')
  })

  it('clearAccepted removes completed items from store', async () => {
    vi.spyOn(client, 'isApiEnabled').mockReturnValue(false)
    const item = await syncQueue.enqueue('CREATE_HOUSEHOLD', { name: 'To Clear', head: 'Head' })
    item.status = 'SERVER_ACCEPTED'
    await syncQueue.updateItem(item)

    const clearedCount = await syncQueue.clearAccepted()
    expect(clearedCount).toBeGreaterThanOrEqual(1)

    const all = await syncQueue.getItems()
    expect(all.find(i => i.id === item.id)).toBeUndefined()
  })
})
