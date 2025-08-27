import mongoose, { Schema, type Document } from "mongoose"

export interface IMemberInvestment {
  plantInstanceId: string
  amount: number
  startDate: string
  contractDuration: number // in months
}

export interface IMember extends Document {
  id: string
  name: string
  email: string
  phone: string
  location: string
  joinDate: string
  investments: IMemberInvestment[]
  createdAt: Date
  updatedAt: Date
}

const MemberInvestmentSchema = new Schema({
  plantInstanceId: { type: String, required: true },
  amount: { type: Number, required: true },
  startDate: { type: String, required: true },
  contractDuration: { type: Number, required: true },
})

const MemberSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    joinDate: { type: String, required: true },
    investments: [MemberInvestmentSchema],
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.Member || mongoose.model<IMember>("Member", MemberSchema)
