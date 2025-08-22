export interface PlantHistory {
  id: number
  type: string
  date: string
  description: string
  hasImage: boolean
  imageUrl?: string
}

export interface Plant {
  id: string
  name: string
  qrCode: string
  owner: string
  fotoGambar?: string
  memberId: string
  contractNumber: string
  location: string
  plantType: string
  status: string
  lastUpdate: string
  height: number
  age: number
  history: PlantHistory[]
  createdAt: string
  updatedAt: string
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