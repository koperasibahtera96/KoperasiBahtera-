import mongoose, { Schema, type Document } from "mongoose"

export interface IPlantType extends Document {
  id: string
  name: string
  displayName: string
  description: string
  defaultAnnualROI: number
  icon: string
  color: string
  createdAt: Date
  updatedAt: Date
}

const PlantTypeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    description: { type: String, required: true },
    defaultAnnualROI: { type: Number, required: true },
    icon: { type: String, required: true },
    color: { type: String, required: true },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.PlantType || mongoose.model<IPlantType>("PlantType", PlantTypeSchema)
