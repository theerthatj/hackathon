export type Severity = 'safe' | 'watch' | 'warning' | 'critical' | 'info'

export const camps = [
  { name: 'St. Thomas HSS', distance: '2.1 km', capacity: 72, status: 'Open', elevation: '38 m' },
  { name: 'Govt. College Kalpetta', distance: '4.8 km', capacity: 46, status: 'Open', elevation: '52 m' },
  { name: 'Community Hall Meppadi', distance: '6.2 km', capacity: 91, status: 'Near capacity', elevation: '31 m' },
]

export const registry = [
  { name: 'Ammini K.', age: 68, state: 'Priority', detail: 'Checked in · Medical review', severity: 'warning' as Severity },
  { name: 'Ravi K.', age: 34, state: 'This camp', detail: 'Checked in · Bunk B-14', severity: 'safe' as Severity },
  { name: 'Maya R.', age: 39, state: 'This camp', detail: 'Checked in · Bunk B-12', severity: 'safe' as Severity },
  { name: 'Nihal P.', age: 9, state: 'Reunited', detail: 'Safe · With family', severity: 'info' as Severity },
]

export const silentZones = [
  { id: 'WYD-07C', place: 'Mundakkai North', score: 94, population: 380, silent: '8h 12m', confidence: 86, severity: 'critical' as Severity },
  { id: 'WYD-09A', place: 'Attamala East', score: 88, population: 214, silent: '6h 40m', confidence: 78, severity: 'critical' as Severity },
  { id: 'WYD-04F', place: 'Chooralmala Ridge', score: 76, population: 620, silent: '3h 05m', confidence: 91, severity: 'warning' as Severity },
]

export const gridScores = [
  22, 28, 34, 41, 38, 45, 52, 57,
  24, 31, 36, 48, 54, 62, 69, 73,
  30, 38, 49, 61, 72, 90, 94, 98,
  18, 27, 35, 43, 51, 64, 74, 81,
  16, 21, 29, 37, 46, 53, 60, 68,
  12, 18, 24, 31, 39, 45, 51, 58,
]

export type SilenceCell = {
  id: string
  place: string
  score: number
  population: number
  confidence: number
  reportsExpected: number
  reportsObserved: number
  lastSignal: string
  row: number
  column: number
}

const namedCells: Record<number, Pick<SilenceCell, 'id' | 'place' | 'population' | 'confidence' | 'lastSignal'>> = {
  21: { id: 'WYD-09A', place: 'Attamala East', population: 214, confidence: 78, lastSignal: '6h 40m ago' },
  22: { id: 'WYD-07C', place: 'Mundakkai North', population: 380, confidence: 86, lastSignal: '8h 12m ago' },
  23: { id: 'WYD-11B', place: 'Punchirimattam', population: 292, confidence: 82, lastSignal: '7h 24m ago' },
  30: { id: 'WYD-04F', place: 'Chooralmala Ridge', population: 620, confidence: 91, lastSignal: '3h 05m ago' },
}

export const silenceCells: SilenceCell[] = gridScores.map((score, index) => {
  const population = 80 + score * 3
  const named = namedCells[index]
  const reportsExpected = Math.max(5, Math.round((named?.population ?? population) / 8))
  return {
    id: named?.id ?? `WYD-${String(index + 1).padStart(2, '0')}`,
    place: named?.place ?? `Wayanad sector ${index + 1}`,
    score,
    population: named?.population ?? population,
    confidence: named?.confidence ?? Math.min(94, 62 + (index % 7) * 5),
    reportsExpected,
    reportsObserved: Math.max(0, Math.round(reportsExpected * (1 - score / 100))),
    lastSignal: named?.lastSignal ?? `${Math.max(1, Math.round(score / 14))}h ago`,
    row: Math.floor(index / 8),
    column: index % 8,
  }
})

export const activity = [
  { time: '14:31', text: 'WYD-07C score increased from 91 to 94', severity: 'critical' as Severity },
  { time: '14:26', text: 'Camp C-12 capacity updated to 72%', severity: 'watch' as Severity },
  { time: '14:18', text: 'Transport node TN-104 delivered 18 bundles', severity: 'safe' as Severity },
]
