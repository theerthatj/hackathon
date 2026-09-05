import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PassportPage, RoutePage, SosPage } from './pages/CivilianPages'
import { AddMemberPage, DtnRelayPage, RegistryPage, ScannerPage } from './pages/FieldPages'
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
    <Route path="/field/dtn-relay" element={<DtnRelayPage />} />
    <Route path="/command" element={<CommandPage />} />
    <Route path="/users" element={<Navigate to="/civilian/passport" replace />} />
    <Route path="/volunteers" element={<Navigate to="/field/dtn-relay" replace />} />
    <Route path="/admin" element={<Navigate to="/command" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>
}
