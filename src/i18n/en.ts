export const en = {
  // Navigation & Shell
  appName: 'Sahayam',
  tagline: 'Disaster Resilience & Incident Coordination',
  civilianNav: 'Civilian Mode',
  volunteerNav: 'Volunteer / Field',
  commandNav: 'Command Center',
  logout: 'Log out',
  language: 'English',
  languageToggle: 'മലയാളം',

  // Common Status & Badges
  statusSafe: 'Safe',
  statusCheckedIn: 'Checked in',
  statusMedicalReview: 'Medical review',
  statusNeedsEvacuation: 'Needs evacuation',
  offlineMode: 'Offline Mode',
  onlineMode: 'Connected',

  // Civilian Pages
  sosTitle: 'Emergency SOS',
  sosSubtitle: 'Dispatches cryptographically verified DTN emergency bundles across local peer relays.',
  emergencyType: 'Emergency Type',
  medicalSummary: 'Medical Summary & Triage',
  bloodGroup: 'Blood Group',
  conditions: 'Known Conditions',
  medication: 'Critical Medication',
  isBedridden: 'Bedridden / Mobility Impaired',
  priority: 'Triage Priority',
  broadcastSosBtn: 'Broadcast SOS to Local Mesh',
  sosActiveNotice: 'Emergency SOS Broadcast Active',
  meshRelayNotice: 'Bundle queued for hop-by-hop mesh delivery.',
  tamperedAlert: 'Tampered (SHA-256 Mismatch)',
  verifiedBadge: 'Verified SHA-256',

  // Passport Page
  passportTitle: 'Civilian Resilience Passport',
  passportSubtitle: 'Cryptographic offline identity pass containing life-critical medical telemetry.',
  householdCard: 'Household Registration',
  headOfHousehold: 'Head of Household',
  contactNumber: 'Contact',
  wardSector: 'Ward & Sector',
  age: 'Age',
  gender: 'Gender',
  scanPassportNotice: 'Present this QR code to relief camp intake volunteers.',

  // Field / Volunteer Pages
  scannerTitle: 'Scan Resilience Passport QR',
  scannerStandby: 'Optical Camera Standby',
  startCamera: 'Start Camera',
  stopCamera: 'Stop Camera',
  flipCamera: 'Flip',
  checkInButton: 'Confirm Camp Check-in',
  quickScanTitle: 'Quick-Scan Registered QR Codes',
  instantDemoEyebrow: 'Instant Demo Verification',
  addMemberTitle: 'Register Resident Member',
  relayTitle: 'DTN Mesh Relay & Custody Transfer',
  acquireCustody: 'Acquire Custody Lock',
  uplinkToHQ: 'Uplink to DEOC HQ',
  inTransit: 'In Transit via Field Relay',
  deliveredHQ: 'Delivered to DEOC HQ',

  // Command Center
  commandTitle: 'Operational Overview',
  commandSubtitle: '100 Geographic Sectors · Real-time Silence Telemetry · Kerala Disaster Network',
  operationalClock: 'Operational clock',
  criticalSectors: 'Critical Silent Sectors',
  atRiskPopulation: 'At-Risk Population',
  postgisLive: 'PostGIS Live',
  offlineCache: 'Offline Cache',
}

export type TranslationKey = keyof typeof en
