import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PassportPage, RoutePage, SosPage } from './pages/CivilianPages'
import { AddMemberPage, RegistryPage, ScannerPage } from './pages/FieldPages'
import { HomePage } from './pages/HomePage'

const CommandPage = lazy(() => import('./pages/CommandPage').then(module => ({ default: module.CommandPage })))

export default function App() {
  return <Suspense fallback={<div className="route-loading" role="status">Loading workspace…</div>}><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/civilian/sos" element={<SosPage />} />
    <Route path="/civilian/passport" element={<PassportPage />} />
    <Route path="/civilian/route" element={<RoutePage />} />
    <Route path="/field/scanner" element={<ScannerPage />} />
    <Route path="/field/registry" element={<RegistryPage />} />
    <Route path="/field/member" element={<AddMemberPage />} />
    <Route path="/command" element={<CommandPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>
}
