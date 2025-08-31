export interface PlantHistory {
  id: number
  type: string
  date: string
  description: string
  hasImage: boolean
  imageUrl?: string
}


export type OperationalCost = {
  id: string
  date: string
  description: string
  amount: number
  category: "fertilizer" | "pesticide" | "labor" | "maintenance" | "other"
  inputBy: string
  inputDate: string
}

export type IncomeRecord = {
  id: string
  date: string
  description: string
  amount: number
  addedBy: string
  inputDate: string
}

export type History = {
  id: number
  type: string
  date: string
  description: string
  hasImage: boolean
  imageUrl?: string
}

export type Investor = { name: string; amount: number; date: string }

export type PlantInstance = {
  id: string
  plantType: string
  plantTypeName: string
  instanceName: string
  baseAnnualROI: number
  fotoGambar: string
  contractNumber: string
  investors: Investor[]
  operationalCosts: OperationalCost[]
  incomeRecords: IncomeRecord[]
  location?: string
  lastUpdate: string
  status: string
  owner: string
  memberId: string
  qrCode: string
  history: History[]
}
export interface StatusOption {
  value: string
  label: string
}

export interface CheckerStats {
  totalPlants: number
  healthyPlants: number
  plantsNeedingCare: number
  recentlyUpdated: number
}