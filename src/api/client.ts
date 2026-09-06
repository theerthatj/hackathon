import type {
  ApiHealthResponse,
  ApiLoginRequest,
  ApiLoginResponse,
  ApiCellCollection,
  ApiScoreItem,
  ApiScenario,
  ApiMemberPayload,
  ApiCreateHouseholdPayload,
} from './types'

const TOKEN_KEY = 'sahayam_jwt_token'

export function getApiBaseUrl(): string {
  // Return VITE_API_URL if configured; if running with proxy or same-origin, default can be relative empty string
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : ''
  return (envUrl || '').replace(/\/+$/, '')
}

export function isApiEnabled(): boolean {
  return Boolean(getApiBaseUrl())
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : `API Error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const url = `${baseUrl}${cleanPath}`

  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const token = getAuthToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (!response.ok) {
    let errorDetail: unknown = response.statusText
    try {
      const errJson = await response.json()
      errorDetail = errJson.detail || errJson
    } catch {
      // not json
    }
    throw new ApiError(response.status, errorDetail)
  }

  return response.json() as Promise<T>
}

// API methods
export async function apiHealth(): Promise<ApiHealthResponse> {
  return apiFetch<ApiHealthResponse>('/api/health')
}

export async function apiLogin(payload: ApiLoginRequest): Promise<ApiLoginResponse> {
  const data = await apiFetch<ApiLoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (data.access_token) {
    setAuthToken(data.access_token)
  }
  return data
}

export async function apiGetCells(): Promise<ApiCellCollection> {
  return apiFetch<ApiCellCollection>('/api/cells')
}

export async function apiGetScores(scenario: string): Promise<ApiScoreItem[]> {
  return apiFetch<ApiScoreItem[]>(`/api/scores?scenario=${encodeURIComponent(scenario)}`)
}

export async function apiGetScenarios(): Promise<ApiScenario[]> {
  return apiFetch<ApiScenario[]>('/api/scenarios')
}

export async function apiCreateHousehold(payload: ApiCreateHouseholdPayload): Promise<{ ok: boolean; id: string }> {
  return apiFetch<{ ok: boolean; id: string }>('/api/households', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiAddMember(householdId: string, member: ApiMemberPayload): Promise<{ ok: boolean; id: string }> {
  return apiFetch<{ ok: boolean; id: string }>(`/api/households/${encodeURIComponent(householdId)}/members`, {
    method: 'POST',
    body: JSON.stringify(member),
  })
}

export async function apiUpdateMemberStatus(memberId: string, status: string, campName?: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/api/members/${encodeURIComponent(memberId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, campName }),
  })
}

export async function apiGetMemberByQr(qrToken: string): Promise<any> {
  return apiFetch<any>(`/api/members/by-qr/${encodeURIComponent(qrToken)}`)
}
