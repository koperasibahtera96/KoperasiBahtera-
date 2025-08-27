import connectDB from "../../mongodb"
import { PlantInstance, Member, Transaction } from "../../../models"

export async function ensureConnection() {
  try {
    await connectDB()
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    return false
  }
}

export async function generateUniqueId(prefix = ""): Promise<string> {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}${timestamp}-${random}`
}

export async function validatePlantInstance(plantInstanceId: string): Promise<boolean> {
  await ensureConnection()
  const instance = await PlantInstance.findOne({ id: plantInstanceId })
  return !!instance
}

export async function validateMember(memberId: string): Promise<boolean> {
  await ensureConnection()
  const member = await Member.findOne({ id: memberId })
  return !!member
}

export async function getPlantInstancesByType(plantType: string) {
  await ensureConnection()
  return await PlantInstance.find({ plantType }).lean()
}

export async function getMemberInvestments(memberId: string) {
  await ensureConnection()
  const member = await Member.findOne({ id: memberId }).lean()
  return member?.investments || []
}

export async function calculatePlantInstanceROI(plantInstanceId: string, date: Date = new Date()) {
  await ensureConnection()

  const instance = await PlantInstance.findOne({ id: plantInstanceId }).lean()
  if (!instance) return 0

  const transactions = await Transaction.find({
    plantInstanceId,
    date: { $lte: date.toISOString().split("T")[0] },
  }).lean()

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)

  const netProfit = totalIncome - totalExpenses
  const totalInvestment = instance.baseAnnualROI * 1000000 // Assuming base investment

  return totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0
}
