import mongoose, { Schema, type Document } from "mongoose"

export interface IProductOlahan {
  name: string
  description: string
}

export interface IPricing {
  monthly: string
  yearly: string
  fiveYears: string
  sellPrice: string
  profit: {
    yearly: string
    monthly: string
    weekly: string
    daily: string
  }
}

export interface IInstallmentOption {
  period: string
  amount: number
  perTree: number
}

export interface ITreePackage {
  treeCount: number
  name: string
  description: string
  price: number
  installmentPrice: number
  estimatedReturn: number
  enabled: boolean
}

export interface IInvestmentPlan {
  name: string
  price: number
  duration: string
  durationYears: number // Duration in years (e.g., 3, 5, 8)
  minConsecutiveTenor?: number // Minimum consecutive installments (1-60) for bulk commission (monthly only)
  returns: string
  plantType: string
  riskLevel: string
  installmentOptions: IInstallmentOption[]
  features: string[]
}

export interface IPlantType extends Document {
  id: string
  name: string
  displayName: string
  nameEn: string
  years: string
  location: string
  description: string
  defaultAnnualROI: number
  icon: string
  color: string
  productOlahan: IProductOlahan[]
  pricing: IPricing
  investmentPlan: IInvestmentPlan
  treePackages: ITreePackage[]
  createdAt: Date
  updatedAt: Date
}

const ProductOlahanSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
}, { _id: false });

const ProfitSchema = new Schema({
  yearly: { type: String, required: true },
  monthly: { type: String, required: true },
  weekly: { type: String, required: true },
  daily: { type: String, required: true },
}, { _id: false });

const PricingSchema = new Schema({
  monthly: { type: String, required: true },
  yearly: { type: String, required: true },
  fiveYears: { type: String, required: true },
  sellPrice: { type: String, required: true },
  profit: ProfitSchema,
}, { _id: false });

const InstallmentOptionSchema = new Schema({
  period: { type: String, required: true },
  amount: { type: Number, required: true },
  perTree: { type: Number, required: true },
}, { _id: false });

const TreePackageSchema = new Schema({
  treeCount: { type: Number, required: true, min: 1 },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  installmentPrice: { type: Number, required: true, min: 0 },
  estimatedReturn: { type: Number, required: true, default: 0, min: 0 },
  enabled: { type: Boolean, required: true, default: true },
}, { _id: false });

const InvestmentPlanSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: String, required: true },
  durationYears: { type: Number, required: true, default: 5, min: 1, max: 20 }, // Investment duration in years
  minConsecutiveTenor: { type: Number, required: false, default: 10, min: 1, max: 60 }, // Minimum consecutive tenor for bulk commission (monthly only)
  returns: { type: String, required: true },
  plantType: { type: String, required: true },
  riskLevel: { type: String, required: true },
  installmentOptions: [InstallmentOptionSchema],
  features: [{ type: String }],
}, { _id: false });

const PlantTypeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    nameEn: { type: String, required: true },
    years: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    defaultAnnualROI: { type: Number, required: true, min: 0, max: 10 }, // ROI as decimal (e.g., 0.125 = 12.5%)
    icon: { type: String, required: true },
    color: { type: String, required: true },
    productOlahan: [ProductOlahanSchema],
    pricing: PricingSchema,
    investmentPlan: InvestmentPlanSchema,
    treePackages: { type: [TreePackageSchema], default: [] },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.PlantType || mongoose.model<IPlantType>("PlantType", PlantTypeSchema)
