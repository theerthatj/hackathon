import QRCode from 'qrcode'

export type Role = 'user' | 'volunteer' | 'admin'

export interface UserMember {
  id: string
  householdId: string
  householdName: string
  name: string
  email?: string
  age: number
  gender: string
  bloodGroup: string
  conditions: string
  medication: string
  disability: string
  isElderly: boolean
  isPregnant: boolean
  isInfant: boolean
  isBedridden: boolean
  emergencyContact: string
  registeredAt: string
  qrToken: string
  qrDataUrl?: string
  status: 'Checked in' | 'Needs evacuation' | 'Safe' | 'Medical review'
  campName?: string
}

export interface Household {
  id: string
  name: string // e.g. "Kuruvilla House"
  head: string
  ward: string
  cellId: string
  contact: string
  members: UserMember[]
  registeredAt: string
}

export interface AuthAccount {
  email: string
  role: Role
  name: string
  associatedUserId?: string
  associatedHouseholdId?: string
}

const STORAGE_KEY_HOUSEHOLDS = 'sahayam_households_v1'
const STORAGE_KEY_AUTH = 'sahayam_auth_v1'

const initialHouseholds: Household[] = [
  {
    id: 'hh-kuruvilla',
    name: 'Kuruvilla House',
    head: 'Kuruvilla Thomas',
    ward: 'Ward 11 · Mundakkai North',
    cellId: 'WYD-07C',
    contact: '+91 94471 20492',
    registeredAt: '2026-09-04 10:30',
    members: [
      {
        id: 'usr-kuru-1',
        householdId: 'hh-kuruvilla',
        householdName: 'Kuruvilla House',
        name: 'Ammini Kuruvilla',
        email: 'user@gmail.com',
        age: 68,
        gender: 'Female',
        bloodGroup: 'B+',
        conditions: 'Type 2 Diabetes, Severe Hypertension',
        medication: 'Insulin glargine (10 IU at 8 PM), Amlodipine 5mg',
        disability: 'Reduced mobility, walking stick required',
        isElderly: true,
        isPregnant: false,
        isInfant: false,
        isBedridden: false,
        emergencyContact: '+91 94471 20492 (Kuruvilla T.)',
        registeredAt: '2026-09-04 10:32',
        qrToken: 'sahayam:user:usr-kuru-1',
        status: 'Medical review',
        campName: 'St. Thomas HSS',
      },
      {
        id: 'usr-kuru-2',
        householdId: 'hh-kuruvilla',
        householdName: 'Kuruvilla House',
        name: 'Thomas Kuruvilla',
        age: 42,
        gender: 'Male',
        bloodGroup: 'O+',
        conditions: 'None reported',
        medication: 'None',
        disability: 'None',
        isElderly: false,
        isPregnant: false,
        isInfant: false,
        isBedridden: false,
        emergencyContact: '+91 94471 20492',
        registeredAt: '2026-09-04 10:35',
        qrToken: 'sahayam:user:usr-kuru-2',
        status: 'Safe',
        campName: 'St. Thomas HSS',
      },
      {
        id: 'usr-kuru-3',
        householdId: 'hh-kuruvilla',
        householdName: 'Kuruvilla House',
        name: 'Maria Kuruvilla',
        age: 39,
        gender: 'Female',
        bloodGroup: 'A+',
        conditions: 'Chronic Asthma',
        medication: 'Salbutamol Inhaler (100mcg) as needed',
        disability: 'None',
        isElderly: false,
        isPregnant: false,
        isInfant: false,
        isBedridden: false,
        emergencyContact: '+91 94471 20492',
        registeredAt: '2026-09-04 10:38',
        qrToken: 'sahayam:user:usr-kuru-3',
        status: 'Checked in',
        campName: 'St. Thomas HSS',
      },
    ],
  },
  {
    id: 'hh-varier',
    name: 'Varier House',
    head: 'Madhavan Varier',
    ward: 'Ward 09 · Attamala East',
    cellId: 'WYD-09A',
    contact: '+91 98472 81109',
    registeredAt: '2026-09-04 11:15',
    members: [
      {
        id: 'usr-var-1',
        householdId: 'hh-varier',
        householdName: 'Varier House',
        name: 'Ravi Varier',
        age: 34,
        gender: 'Male',
        bloodGroup: 'O-',
        conditions: 'None',
        medication: 'None',
        disability: 'None',
        isElderly: false,
        isPregnant: false,
        isInfant: false,
        isBedridden: false,
        emergencyContact: '+91 98472 81109',
        registeredAt: '2026-09-04 11:18',
        qrToken: 'sahayam:user:usr-var-1',
        status: 'Safe',
        campName: 'Govt. College Kalpetta',
      },
      {
        id: 'usr-var-2',
        householdId: 'hh-varier',
        householdName: 'Varier House',
        name: 'Nihal Varier',
        age: 9,
        gender: 'Male',
        bloodGroup: 'O+',
        conditions: 'Dust allergy',
        medication: 'Cetirizine 5mg',
        disability: 'None',
        isElderly: false,
        isPregnant: false,
        isInfant: false,
        isBedridden: false,
        emergencyContact: '+91 98472 81109',
        registeredAt: '2026-09-04 11:20',
        qrToken: 'sahayam:user:usr-var-2',
        status: 'Checked in',
        campName: 'Govt. College Kalpetta',
      },
    ],
  },
]

export const PROTOTYPE_CREDENTIALS = [
  { email: 'user@gmail.com', pass: 'user', role: 'user' as Role, name: 'Ammini Kuruvilla (Kuruvilla House)', householdId: 'hh-kuruvilla', userId: 'usr-kuru-1' },
  { email: 'volunteer@gmail.com', pass: 'volunteer', role: 'volunteer' as Role, name: 'Ravi Kumar (Field Volunteer)' },
  { email: 'admin@gmail.com', pass: 'admin', role: 'admin' as Role, name: 'DEOC Commander (Admin)' },
]

class SahayamStore {
  private households: Household[] = []
  private membersCache: UserMember[] = []
  private activeAccount: AuthAccount | null = null
  private listeners: Array<() => void> = []

  constructor() {
    this.init()
  }

  private async init() {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY_HOUSEHOLDS)
      if (stored) {
        this.households = JSON.parse(stored)
      } else {
        this.households = initialHouseholds
        this.saveHouseholds()
      }

      // Generate QR data URLs if not cached
      for (const hh of this.households) {
        for (const member of hh.members) {
          if (!member.qrDataUrl) {
            member.qrDataUrl = await QRCode.toDataURL(member.qrToken, { width: 320, margin: 1 })
          }
        }
      }
      this.rebuildMembersCache()
      this.saveHouseholds()

      const authJson = localStorage.getItem(STORAGE_KEY_AUTH)
      if (authJson) {
        this.activeAccount = JSON.parse(authJson)
      } else {
        // default to user role for initial prototype view
        this.activeAccount = {
          email: 'user@gmail.com',
          role: 'user',
          name: 'Ammini Kuruvilla',
          associatedHouseholdId: 'hh-kuruvilla',
          associatedUserId: 'usr-kuru-1',
        }
      }
    } catch {
      this.households = initialHouseholds
      this.rebuildMembersCache()
    }
    this.notify()
  }

  private rebuildMembersCache() {
    this.membersCache = this.households.flatMap(h => h.members)
  }

  private saveHouseholds() {
    this.rebuildMembersCache()
    if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage?.setItem) return
    try {
      localStorage.setItem(STORAGE_KEY_HOUSEHOLDS, JSON.stringify(this.households))
    } catch {
      // ignore storage errors
    }
  }

  private saveAuth() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage?.setItem) return
    try {
      if (this.activeAccount) {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(this.activeAccount))
      } else {
        localStorage.removeItem(STORAGE_KEY_AUTH)
      }
    } catch {
      // ignore storage errors
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }

  public getHouseholds(): Household[] {
    return this.households
  }

  public getHouseholdById(id: string): Household | undefined {
    return this.households.find(h => h.id === id)
  }

  public getHouseholdByName(name: string): Household | undefined {
    const clean = name.trim().toLowerCase()
    return this.households.find(h => {
      const hClean = h.name.trim().toLowerCase()
      return hClean === clean || hClean === `${clean} house` || `${hClean} house` === clean
    })
  }

  public getAllMembers(): UserMember[] {
    return this.membersCache
  }

  public getMemberById(id: string): UserMember | undefined {
    for (const hh of this.households) {
      const found = hh.members.find(m => m.id === id)
      if (found) return found
    }
    return undefined
  }

  public getMemberByQr(token: string): UserMember | undefined {
    const cleanToken = token.trim()
    for (const hh of this.households) {
      const found = hh.members.find(m => m.qrToken === cleanToken || m.id === cleanToken)
      if (found) return found
    }
    return undefined
  }

  public async addMemberToHousehold(params: {
    householdName: string
    ward?: string
    cellId?: string
    contact?: string
    name: string
    age: number
    gender: string
    bloodGroup: string
    conditions: string
    medication: string
    disability: string
    isElderly: boolean
    isPregnant: boolean
    isInfant: boolean
    isBedridden: boolean
    emergencyContact: string
  }): Promise<{ member: UserMember; household: Household }> {
    let cleanHouseholdName = params.householdName.trim()
    if (!cleanHouseholdName.toLowerCase().endsWith('house')) {
      cleanHouseholdName = `${cleanHouseholdName} House`
    }

    let household = this.getHouseholdByName(cleanHouseholdName)

    if (!household) {
      household = {
        id: `hh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanHouseholdName,
        head: params.name,
        ward: params.ward?.trim() || 'Ward 11 · Mundakkai North',
        cellId: params.cellId || 'WYD-07C',
        contact: params.emergencyContact || params.contact || '+91 94471 00000',
        registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        members: [],
      }
      this.households.push(household)
    }

    const memberId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const qrToken = `sahayam:user:${memberId}`
    const qrDataUrl = await QRCode.toDataURL(qrToken, { width: 320, margin: 1 })

    const newMember: UserMember = {
      id: memberId,
      householdId: household.id,
      householdName: household.name,
      name: params.name.trim(),
      age: params.age,
      gender: params.gender,
      bloodGroup: params.bloodGroup,
      conditions: params.conditions.trim() || 'None',
      medication: params.medication.trim() || 'None',
      disability: params.disability.trim() || 'None',
      isElderly: params.isElderly,
      isPregnant: params.isPregnant,
      isInfant: params.isInfant,
      isBedridden: params.isBedridden,
      emergencyContact: params.emergencyContact.trim() || household.contact,
      registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      qrToken,
      qrDataUrl,
      status: (params.isBedridden || params.conditions.toLowerCase().includes('diabetes') || params.conditions.toLowerCase().includes('heart')) ? 'Medical review' : 'Checked in',
      campName: 'St. Thomas HSS',
    }

    household.members.push(newMember)
    this.saveHouseholds()
    this.notify()

    return { member: newMember, household }
  }

  public updateMemberStatus(memberId: string, status: UserMember['status'], campName?: string) {
    for (const hh of this.households) {
      const member = hh.members.find(m => m.id === memberId)
      if (member) {
        member.status = status
        if (campName) member.campName = campName
        this.saveHouseholds()
        this.notify()
        return member
      }
    }
    return undefined
  }

  // Auth methods
  public getAuth(): AuthAccount | null {
    return this.activeAccount
  }

  public login(email: string, pass: string): { success: boolean; message?: string; role?: Role } {
    const cred = PROTOTYPE_CREDENTIALS.find(c => c.email.toLowerCase() === email.trim().toLowerCase())
    if (!cred || cred.pass !== pass.trim()) {
      return { success: false, message: 'Invalid credentials. Use prototype email & password.' }
    }

    this.activeAccount = {
      email: cred.email,
      role: cred.role,
      name: cred.name,
      associatedHouseholdId: cred.householdId,
      associatedUserId: cred.userId,
    }
    this.saveAuth()
    this.notify()
    return { success: true, role: cred.role }
  }

  public setRole(role: Role) {
    const cred = PROTOTYPE_CREDENTIALS.find(c => c.role === role)
    if (cred) {
      this.activeAccount = {
        email: cred.email,
        role: cred.role,
        name: cred.name,
        associatedHouseholdId: cred.householdId,
        associatedUserId: cred.userId,
      }
    } else {
      this.activeAccount = {
        email: `${role}@gmail.com`,
        role,
        name: `${role.toUpperCase()} User`,
      }
    }
    this.saveAuth()
    this.notify()
  }

  public logout() {
    this.activeAccount = null
    this.saveAuth()
    this.notify()
  }
}

export const store = new SahayamStore()

import { useSyncExternalStore } from 'react'

export function useSahayamStore() {
  const households = useSyncExternalStore(
    cb => store.subscribe(cb),
    () => store.getHouseholds()
  )
  const auth = useSyncExternalStore(
    cb => store.subscribe(cb),
    () => store.getAuth()
  )
  const members = useSyncExternalStore(
    cb => store.subscribe(cb),
    () => store.getAllMembers()
  )

  return {
    households,
    auth,
    members,
    login: store.login.bind(store),
    logout: store.logout.bind(store),
    setRole: store.setRole.bind(store),
    addMemberToHousehold: store.addMemberToHousehold.bind(store),
    getMemberById: store.getMemberById.bind(store),
    getMemberByQr: store.getMemberByQr.bind(store),
    updateMemberStatus: store.updateMemberStatus.bind(store),
  }
}

