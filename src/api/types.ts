export interface ApiHealthResponse {
  status: string
  scorer_version: string
  timestamp: string
}

export interface ApiLoginRequest {
  email: string
  pass: string
}

export interface ApiLoginResponse {
  access_token: string
  token_type: string
  role: 'user' | 'volunteer' | 'admin'
  name: string
  email: string
  household_id?: string
  member_id?: string
}

export interface ApiCellProperties {
  cell_id: string
  name: string
  taluk: string
  district: string
  population: number
  terrain: string
  elevation_m: number
  river_proximity_km: number
  historical_events: number
}

export interface ApiCellFeature {
  type: 'Feature'
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  properties: ApiCellProperties
}

export interface ApiCellCollection {
  type: 'FeatureCollection'
  features: ApiCellFeature[]
}

export interface ApiScoreItem {
  cellId: string
  score: number
  scorePct: number
  confidence: number
  reportsExpected: number
  reportsObserved: number
  lastSignal: string
  population: number
  windowStart: string | null
}

export interface ApiScenario {
  id: string
  name: string
  description: string
  category: string
  timestamp: string
  active_hours: number
  severity_level: number
  ground_truth_count: number
}

export interface ApiMemberPayload {
  name: string
  age?: number
  gender?: string
  bloodGroup?: string
  conditions?: string
  medication?: string
  disability?: string
  isElderly?: boolean
  isPregnant?: boolean
  isInfant?: boolean
  isBedridden?: boolean
  emergencyContact?: string
  qrToken?: string
  status?: string
  campName?: string
}

export interface ApiCreateHouseholdPayload {
  id?: string
  name: string
  head: string
  ward?: string
  cellId?: string
  contact?: string
  members?: ApiMemberPayload[]
}
