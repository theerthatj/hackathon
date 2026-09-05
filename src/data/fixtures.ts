import geoData from './geographicSilenceData.json'

export type Severity = 'safe' | 'watch' | 'warning' | 'critical' | 'info'

export type Camp = {
  id: string
  name: string
  distance: string
  capacity: number
  status: string
  elevation: string
  coordinates: [number, number]
  routeDescription: string
  safetyNote: string
  estimatedTime: string
}

export const camps: Camp[] = [
  {
    id: 'camp-st-thomas',
    name: 'St. Thomas HSS',
    distance: '2.1 km',
    capacity: 72,
    status: 'Open',
    elevation: '+38 m',
    coordinates: [76.1265, 11.5542],
    routeDescription: 'Kalpetta–Meppadi High Ridge Road',
    safetyNote: 'Avoids Chooralmala river bridge debris. Elevation is +38m above flash flood warning line.',
    estimatedTime: '18 min',
  },
  {
    id: 'camp-govt-college',
    name: 'Govt. College Kalpetta',
    distance: '4.8 km',
    capacity: 46,
    status: 'Open',
    elevation: '+52 m',
    coordinates: [76.0830, 11.6080],
    routeDescription: 'Meppadi Bypass – Kalpetta Hill Road',
    safetyNote: 'High capacity staging area with medical triage center and emergency airlift access.',
    estimatedTime: '35 min',
  },
  {
    id: 'camp-community-hall',
    name: 'Community Hall Meppadi',
    distance: '6.2 km',
    capacity: 91,
    status: 'Near capacity',
    elevation: '+31 m',
    coordinates: [76.1220, 11.5501],
    routeDescription: 'Old Plantation Road via Vythiri Link',
    safetyNote: 'Secondary relief depot. High occupancy; primary supplies prioritizing vulnerable families.',
    estimatedTime: '45 min',
  },
]

export const registry = [
  { name: 'Ammini K.', age: 68, state: 'Priority', detail: 'Checked in · Medical review', severity: 'warning' as Severity },
  { name: 'Ravi K.', age: 34, state: 'This camp', detail: 'Checked in · Bunk B-14', severity: 'safe' as Severity },
  { name: 'Maya R.', age: 39, state: 'This camp', detail: 'Checked in · Bunk B-12', severity: 'safe' as Severity },
  { name: 'Nihal P.', age: 9, state: 'Reunited', detail: 'Safe · With family', severity: 'info' as Severity },
]

export type SilentZone = {
  id: string
  place: string
  score: number
  population: number
  silent: string
  confidence: number
  severity: Severity
  latitude?: number
  longitude?: number
}

export const silentZones: SilentZone[] = (geoData.silentZones as unknown as SilentZone[]).map(z => ({
  ...z,
  severity: z.severity as Severity
}))

export type SignalBreakdownItem = {
  expected: number
  actual: number
  deficit_pct: number
  status: string
}

export type SilenceCell = {
  id: string
  cell_code?: string
  place: string
  score: number
  defaultScore?: number
  population: number
  confidence: number
  reportsExpected: number
  reportsObserved: number
  lastSignal: string
  row: number
  column: number
  latitude: number
  longitude: number
  cell_type?: string
  building_count?: number
  road_length_km?: number
  hospital_count?: number
  shelter_count?: number
  school_count?: number
  scoresByScenario?: Record<string, number>
  breakdownsByScenario?: Record<string, Record<string, SignalBreakdownItem>>
}

export const silenceCells: SilenceCell[] = (geoData.cells as unknown as SilenceCell[]).map((cell, idx) => ({
  ...cell,
  row: Math.floor(idx / 10),
  column: idx % 10,
}))

export const geographicSilenceData = geoData

export const activity = [
  { time: '14:31', text: 'WYD-07C score increased to 94 (Critical communication blackout)', severity: 'critical' as Severity },
  { time: '14:26', text: 'Camp C-12 capacity updated to 72%', severity: 'watch' as Severity },
  { time: '14:18', text: 'Transport node TN-104 delivered 18 bundles to Shoranur Reach', severity: 'safe' as Severity },
  { time: '14:05', text: 'Recon team dispatched to WYD-09A (Attamala East)', severity: 'warning' as Severity },
]
