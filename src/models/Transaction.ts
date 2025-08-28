import mongoose, { Schema, type Document } from "mongoose"

export interface ITransaction extends Document {
  id: string
  type: "income" | "expense"
  plantInstanceId: string
  memberId?: string
  amount: number
  description: string
  date: string
  category: string
  addedBy: string
  createdAt: Date
  updatedAt: Date
}

const TransactionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: ["income", "expense"] },
    plantInstanceId: { type: String, required: true },
    memberId: { type: String },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    category: { type: String, required: true },
    addedBy: { type: String, required: true },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema)
