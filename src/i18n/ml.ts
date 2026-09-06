import type { en } from './en'

export const ml: typeof en = {
  // Navigation & Shell
  appName: 'സഹായം',
  tagline: 'ദുരന്ത പ്രതിരോധവും അടിയന്തര രക്ഷാ ഏകോപനവും',
  civilianNav: 'പൊതുജന വിഭാഗം',
  volunteerNav: 'വോളണ്ടിയർ / ഫീൽഡ്',
  commandNav: 'ജില്ലാ കൺട്രോൾ റൂം (DEOC)',
  logout: 'ലോഗ് ഔട്ട്',
  language: 'മലയാളം',
  languageToggle: 'EN',

  // Common Status & Badges
  statusSafe: 'സുരക്ഷിതം',
  statusCheckedIn: 'ക്യാമ്പിൽ എത്തി',
  statusMedicalReview: 'അടിയന്തര വൈദ്യപരിശോധന',
  statusNeedsEvacuation: 'മാറ്റിപ്പാർപ്പിക്കേണ്ടവർ',
  offlineMode: 'ഓഫ്‌ലൈൻ മോഡ്',
  onlineMode: 'കണക്റ്റഡ്',

  // Civilian Pages
  sosTitle: 'അടിയന്തര SOS',
  sosSubtitle: 'ഇന്റർനെറ്റ് ഇല്ലാതെയും സമീപസ്ഥ റിലേ വഴി ക്രിപ്റ്റോഗ്രാഫിക് സുരക്ഷിത അടിയന്തര സന്ദേശം അയക്കുന്നു.',
  emergencyType: 'അടിയന്തര സാഹചര്യം',
  medicalSummary: 'ആരോഗ്യ വിവരങ്ങൾ',
  bloodGroup: 'രക്തഗ്രൂപ്പ്',
  conditions: 'പ്രത്യേക രോഗാവസ്ഥകൾ',
  medication: 'ദിവസേനയുള്ള മരുന്നുകൾ',
  isBedridden: 'കിടപ്പുരോഗി / ചലനപരിമിതി',
  priority: 'രക്ഷാ മുൻഗണന',
  broadcastSosBtn: 'മെഷ് വഴി അടിയന്തര സന്ദേശം നൽകുക',
  sosActiveNotice: 'അടിയന്തര SOS സന്ദേശം പ്രക്ഷേപണം ചെയ്യുന്നു',
  meshRelayNotice: 'സന്ദേശം സമീപസ്ഥ റിലേകളിലേക്ക് കൈമാറാൻ തയാറായി.',
  tamperedAlert: 'സന്ദേശത്തിൽ മാറ്റം വരുത്തിയിട്ടുണ്ട് (SHA-256 പൊരുത്തക്കേട്)',
  verifiedBadge: 'സ്ഥിരീകരിച്ച SHA-256 സന്ദേശം',

  // Passport Page
  passportTitle: 'ദുരന്ത അതിജീവന പാസ്പോർട്ട്',
  passportSubtitle: 'ജീവൻരക്ഷാ ആരോഗ്യ വിവരങ്ങൾ അടങ്ങിയ ഡിജിറ്റൽ സുരക്ഷിത ഓഫ്‌ലൈൻ ക്യുആർ പാസ്.',
  householdCard: 'കുടുംബ വിവരങ്ങൾ',
  headOfHousehold: 'ഗൃഹനാഥൻ/നാഥ',
  contactNumber: 'ഫോൺ നമ്പർ',
  wardSector: 'വാർഡും പ്രദേശവും',
  age: 'പ്രായം',
  gender: 'ലിംഗം',
  scanPassportNotice: 'ദുരിതാശ്വാസ ക്യാമ്പിൽ പ്രവേശിക്കുമ്പോൾ ഈ ക്യുആർ കോഡ് കാണിക്കുക.',

  // Field / Volunteer Pages
  scannerTitle: 'റിലീഫ് പാസ്പോർട്ട് ക്യുആർ സ്കാനർ',
  scannerStandby: 'ക്യാമറ സ്കാനർ തയാർ',
  startCamera: 'ക്യാമറ തുറക്കുക',
  stopCamera: 'ക്യാമറ നിർത്തുക',
  flipCamera: 'ക്യാമറ മാറ്റുക',
  checkInButton: 'ക്യാമ്പ് പ്രവേശനം സ്ഥിരീകരിക്കുക',
  quickScanTitle: 'രജിസ്റ്റർ ചെയ്ത സാമ്പിൾ ക്യുആറുകൾ',
  instantDemoEyebrow: 'ദ്രുത പരിശോധന',
  addMemberTitle: 'പുതിയ അംഗത്തെ ചേർക്കുക',
  relayTitle: 'DTN മെഷ് റിലേയും സന്ദേശ കൈമാറ്റവും',
  acquireCustody: 'റിലേ കസ്റ്റഡി ഏറ്റെടുക്കുക',
  uplinkToHQ: 'കൺട്രോൾ റൂമിലേക്ക് അയക്കുക',
  inTransit: 'വോളണ്ടിയർ വഴി അയക്കുന്നു',
  deliveredHQ: 'കൺട്രോൾ റൂമിൽ എത്തിച്ചേർന്നു',

  // Command Center
  commandTitle: 'ജില്ലാ ദുരന്ത നിരീക്ഷണ ഏകോപനം',
  commandSubtitle: '100 സെക്ടറുകൾ · തത്സമയ സൈലൻസ് ടെലിമെട്രി · കേരള ദുരന്ത നിവാരണ ശൃംഖല',
  operationalClock: 'കൺട്രോൾ റൂം സമയം',
  criticalSectors: 'അപകടസാധ്യതാ മേഖലകൾ',
  atRiskPopulation: 'ആശങ്കയിലുള്ള ജനസംഖ്യ',
  postgisLive: 'തത്സമയ PostGIS ഡാറ്റാബേസ്',
  offlineCache: 'ഓഫ്‌ലൈൻ കാഷെ',
}
