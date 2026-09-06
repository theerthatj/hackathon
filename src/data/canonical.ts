/**
 * Canonical JSON serialization and deterministic SHA-256 integrity hashing
 * for Sahayam DTN bundles.
 */

export const IMMUTABLE_BUNDLE_FIELDS = [
  'bundleId',
  'originNodeId',
  'originName',
  'householdName',
  'cellId',
  'emergencyType',
  'coordinates',
  'medicalSummary',
  'bloodGroup',
  'conditions',
  'medication',
  'isBedridden',
  'priority',
  'createdAt',
] as const

export type ImmutableBundleField = typeof IMMUTABLE_BUNDLE_FIELDS[number]

/**
 * Deterministically sorts object keys recursively, excludes `undefined` values,
 * and formats to a canonical JSON string.
 */
export function canonicalize(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val)
  }

  if (Array.isArray(val)) {
    return `[${val.map(item => (item === undefined ? 'null' : canonicalize(item))).join(',')}]`
  }

  const record = val as Record<string, unknown>
  const sortedKeys = Object.keys(record)
    .filter(k => record[k] !== undefined)
    .sort()

  const entries = sortedKeys.map(k => `${JSON.stringify(k)}:${canonicalize(record[k])}`)
  return `{${entries.join(',')}}`
}

/**
 * Extracts only the immutable fields from an ADUBundle to guarantee that
 * downstream custody hops and delivery receipts do not invalidate the payload hash.
 */
export function extractImmutableBundlePayload(bundle: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const field of IMMUTABLE_BUNDLE_FIELDS) {
    if (bundle[field] !== undefined) {
      payload[field] = bundle[field]
    }
  }
  return payload
}

/**
 * Computes deterministic SHA-256 hex digest over the canonicalized immutable bundle payload.
 */
export async function hashBundlePayload(bundle: Record<string, unknown>): Promise<string> {
  const payload = extractImmutableBundlePayload(bundle)
  const canonicalStr = canonicalize(payload)

  const subtle = globalThis.crypto?.subtle
  if (subtle) {
    const data = new TextEncoder().encode(canonicalStr)
    const digestBuffer = await subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digestBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Fallback for Node environments if subtle is missing
  try {
    const nodeCrypto = await import('node:crypto')
    return nodeCrypto.createHash('sha256').update(canonicalStr, 'utf8').digest('hex')
  } catch {
    throw new Error('SHA-256 crypto implementation unavailable')
  }
}
