import mongoose, { Schema, type Document } from "mongoose"

export interface IOperationalCost {
  id: string
  date: string
  description: string
  amount: number
  addedBy: string
  addedAt: string
}

export interface IIncomeRecord {
  id: string
  date: string
  description: string
  amount: number
  addedBy: string
  addedAt: string
}

export interface IPlantInstance extends Document {
  id: string
  plantType: "gaharu" | "alpukat" | "jengkol" | "aren"
  instanceName: string
  baseAnnualROI: number
  operationalCosts: IOperationalCost[]
  incomeRecords: IIncomeRecord[]
  qrCode?: string
  owner?: string
  fotoGambar?: string
  memberId?: string
  contractNumber?: string
  contractId?: string
  userId?: mongoose.Types.ObjectId
  location?: string
  kavling?: string
  status?: string
  approvalStatus: "pending" | "approved" | "rejected"
  lastUpdate?: string
  history?: any[]
  isActive?: boolean
  createdDate?: Date
  createdAt: Date
  updatedAt: Date
}

const OperationalCostSchema = new Schema({
  id: { type: String, required: true },
  date: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  addedBy: { type: String, required: true },
  addedAt: { type: String, required: true },
})

const IncomeRecordSchema = new Schema({
  id: { type: String, required: true },
  date: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  addedBy: { type: String, required: true },
  addedAt: { type: String, required: true },
})

const PlantInstanceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    plantType: {
      type: String,
      required: true,
      enum: ["gaharu", "alpukat", "jengkol", "aren"],
    },
    instanceName: { type: String, required: true },
    baseAnnualROI: { type: Number, required: true },
    operationalCosts: { type: [OperationalCostSchema], default: [] },
    incomeRecords: { type: [IncomeRecordSchema], default: [] },
        qrCode: { type: String },
    owner: { type: String },
    fotoGambar: { type: String },
    memberId: { type: String },
    contractNumber: { type: String, unique: true, sparse: true },
    location: { type: String },
    kavling: {type: String},
    status: { type: String },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    lastUpdate: { type: String },
    history: { type: [Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.PlantInstance || mongoose.model<IPlantInstance>("PlantInstance", PlantInstanceSchema)
