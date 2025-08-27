const API_BASE_URL = "http://localhost:3001"

export interface PlantInstance {
  id: string
  plantType: string
  name: string
  baseAnnualROI: number
  investors: Array<{
    memberId: string
    name: string
    investmentAmount: number
    joinDate: string
  }>
  operationalCosts: Array<{
    id: string
    date: string
    description: string
    amount: number
    addedBy: string
    addedAt: string
  }>
  incomeRecords: Array<{
    id: string
    date: string
    description: string
    amount: number
    addedBy: string
    addedAt: string
  }>
}

export interface Member {
  id: string
  name: string
  email: string
  phone: string
  location: string
  joinDate: string
}

export interface PlantType {
  id: string
  name: string
  description: string
}

// Plant Instances API
export const plantInstancesAPI = {
  getAll: async (): Promise<PlantInstance[]> => {
    const response = await fetch(`${API_BASE_URL}/plantInstances`)
    return response.json()
  },

  getById: async (id: string): Promise<PlantInstance> => {
    const response = await fetch(`${API_BASE_URL}/plantInstances/${id}`)
    return response.json()
  },

  create: async (plantInstance: Omit<PlantInstance, "id">): Promise<PlantInstance> => {
    const response = await fetch(`${API_BASE_URL}/plantInstances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plantInstance),
    })
    return response.json()
  },

  update: async (id: string, plantInstance: Partial<PlantInstance>): Promise<PlantInstance> => {
    const response = await fetch(`${API_BASE_URL}/plantInstances/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plantInstance),
    })
    return response.json()
  },

  addOperationalCost: async (
    plantId: string,
    cost: {
      date: string
      description: string
      amount: number
      addedBy: string
    },
  ) => {
    const plant = await plantInstancesAPI.getById(plantId)
    const newCost = {
      id: `op-${Date.now()}`,
      ...cost,
      addedAt: new Date().toISOString(),
    }
    plant.operationalCosts.push(newCost)
    return plantInstancesAPI.update(plantId, { operationalCosts: plant.operationalCosts })
  },

  addIncomeRecord: async (
    plantId: string,
    income: {
      date: string
      description: string
      amount: number
      addedBy: string
    },
  ) => {
    const plant = await plantInstancesAPI.getById(plantId)
    const newIncome = {
      id: `inc-${Date.now()}`,
      ...income,
      addedAt: new Date().toISOString(),
    }
    plant.incomeRecords.push(newIncome)
    return plantInstancesAPI.update(plantId, { incomeRecords: plant.incomeRecords })
  },
}

// Members API
export const membersAPI = {
  getAll: async (): Promise<Member[]> => {
    const response = await fetch(`${API_BASE_URL}/members`)
    return response.json()
  },

  getById: async (id: string): Promise<Member> => {
    const response = await fetch(`${API_BASE_URL}/members/${id}`)
    return response.json()
  },

  create: async (member: Omit<Member, "id">): Promise<Member> => {
    const response = await fetch(`${API_BASE_URL}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(member),
    })
    return response.json()
  },

  update: async (id: string, member: Partial<Member>): Promise<Member> => {
    const response = await fetch(`${API_BASE_URL}/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(member),
    })
    return response.json()
  },
}

// Plant Types API
export const plantTypesAPI = {
  getAll: async (): Promise<PlantType[]> => {
    const response = await fetch(`${API_BASE_URL}/plantTypes`)
    return response.json()
  },

  create: async (plantType: Omit<PlantType, "id">): Promise<PlantType> => {
    const response = await fetch(`${API_BASE_URL}/plantTypes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plantType),
    })
    return response.json()
  },
}
