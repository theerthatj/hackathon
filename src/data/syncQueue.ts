import {
  isApiEnabled,
  apiCreateHousehold,
  apiAddMember,
  apiUpdateMemberStatus,
} from '../api/client'
import type { ApiCreateHouseholdPayload, ApiMemberPayload } from '../api/types'

export type SyncStatus = 'LOCAL_ONLY' | 'QUEUED' | 'TRANSFERRED' | 'SERVER_ACCEPTED' | 'FAILED'

export type SyncAction = 'CREATE_HOUSEHOLD' | 'ADD_MEMBER' | 'UPDATE_MEMBER_STATUS'

export interface SyncQueueItem {
  id: string
  action: SyncAction
  payload: any
  status: SyncStatus
  retries: number
  error?: string
  createdAt: string
  updatedAt: string
}

const DB_NAME = 'sahayam_sync_db'
const DB_VERSION = 1
const STORE_NAME = 'outbox'
const MAX_RETRIES = 5

class SyncQueue {
  private dbPromise: Promise<IDBDatabase> | null = null
  private listeners: Array<() => void> = []
  private isFlushing = false
  private timer: any = null

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flush().catch(() => {})
      })
      this.timer = setInterval(() => {
        this.flush().catch(() => {})
      }, 30000)
    }
  }

  public destroy() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported'))
        return
      }

      const req = indexedDB.open(DB_NAME, DB_VERSION)

      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }

      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

    return this.dbPromise
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb)
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb)
    }
  }

  private notify() {
    this.listeners.forEach(cb => cb())
  }

  public async enqueue(
    action: SyncAction,
    payload: ApiCreateHouseholdPayload | { householdId: string; member: ApiMemberPayload } | { memberId: string; status: string; campName?: string }
  ): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action,
      payload,
      status: isApiEnabled() ? 'QUEUED' : 'LOCAL_ONLY',
      retries: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      const db = await this.getDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).add(item)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      this.notify()

      // If online and API is enabled, trigger immediate background flush
      if (isApiEnabled() && (typeof navigator === 'undefined' || navigator.onLine)) {
        this.flush().catch(() => {})
      }
    } catch (err) {
      console.warn('Could not persist to IndexedDB sync outbox:', err)
    }

    return item
  }

  public async getItems(): Promise<SyncQueueItem[]> {
    try {
      const db = await this.getDb()
      return new Promise<SyncQueueItem[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => reject(req.error)
      })
    } catch {
      return []
    }
  }

  public async updateItem(item: SyncQueueItem): Promise<void> {
    item.updatedAt = new Date().toISOString()
    try {
      const db = await this.getDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(item)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      this.notify()
    } catch (err) {
      console.warn('Failed to update sync item:', err)
    }
  }

  public async clearAccepted(): Promise<number> {
    try {
      const db = await this.getDb()
      const items = await this.getItems()
      const toDelete = items.filter(i => i.status === 'SERVER_ACCEPTED')
      if (toDelete.length === 0) return 0

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        for (const item of toDelete) {
          store.delete(item.id)
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      this.notify()
      return toDelete.length
    } catch {
      return 0
    }
  }

  public async flush(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (!isApiEnabled()) return { processed: 0, succeeded: 0, failed: 0 }
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine) {
      return { processed: 0, succeeded: 0, failed: 0 }
    }

    if (this.isFlushing) {
      // Wait for current flush to finish then proceed if needed
      await new Promise(resolve => setTimeout(resolve, 50))
      if (this.isFlushing) return { processed: 0, succeeded: 0, failed: 0 }
    }

    this.isFlushing = true
    let processed = 0
    let succeeded = 0
    let failed = 0

    try {
      const items = await this.getItems()
      const pending = items.filter(
        i => (i.status === 'QUEUED' || (i.status === 'FAILED' && i.retries < MAX_RETRIES))
      )

      for (const item of pending) {
        processed++
        item.status = 'TRANSFERRED'
        await this.updateItem(item)

        try {
          if (item.action === 'CREATE_HOUSEHOLD') {
            await apiCreateHousehold(item.payload)
          } else if (item.action === 'ADD_MEMBER') {
            await apiAddMember(item.payload.householdId, item.payload.member)
          } else if (item.action === 'UPDATE_MEMBER_STATUS') {
            await apiUpdateMemberStatus(item.payload.memberId, item.payload.status, item.payload.campName)
          }
          item.status = 'SERVER_ACCEPTED'
          item.error = undefined
          await this.updateItem(item)
          succeeded++
        } catch (err: any) {
          item.retries += 1
          item.error = err?.message || 'Sync failed'
          item.status = 'FAILED'
          await this.updateItem(item)
          failed++
        }
      }
    } finally {
      this.isFlushing = false
    }

    return { processed, succeeded, failed }
  }
}

export const syncQueue = new SyncQueue()
