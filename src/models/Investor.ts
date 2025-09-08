import mongoose, { Document, Schema } from 'mongoose';

// Minimal installment tracking with payment proof
export interface IInstallmentSummary {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  paidDate?: Date;
  proofImageUrl?: string; // Payment proof image
}

// Investment record - essential info only
export interface IInvestmentRecord {
  investmentId: string;
  productName: string;
  plantInstanceId?: string; // Reference to PlantInstance
  totalAmount: number;
  amountPaid: number;
  paymentType: 'full' | 'cicilan';
  status: 'pending' | 'active' | 'completed' | 'cancelled';

  // For cicilan - minimal tracking with proof images
  installments?: IInstallmentSummary[];

  // For full payment - proof image
  fullPaymentProofUrl?: string;

  // Contract tracking fields
  contractSigned?: boolean;
  contractSignedDate?: Date;
  contractDownloaded?: boolean;
  contractDownloadedDate?: Date;

  investmentDate: Date;
  completionDate?: Date;
}

export interface IInvestor extends Document {
  userId: string; // Reference to User
  name: string;
  email: string;
  phoneNumber?: string;
  totalInvestasi: number;
  totalPaid: number;
  jumlahPohon: number;

  // Investment records with minimal installment info and proof images
  investments: IInvestmentRecord[];

  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Installment summary schema
const InstallmentSummarySchema = new Schema({
  installmentNumber: { type: Number, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  isPaid: { type: Boolean, default: false },
  paidDate: { type: Date },
  proofImageUrl: { type: String },
});

// Investment record schema
const InvestmentRecordSchema = new Schema({
  investmentId: { type: String, required: true },
  productName: { type: String, required: true },
  plantInstanceId: { type: Schema.Types.ObjectId, ref: 'PlantInstance' },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  paymentType: { type: String, enum: ['full', 'cicilan'], required: true },
  status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' },
  installments: [InstallmentSummarySchema],
  fullPaymentProofUrl: { type: String },
  contractSigned: { type: Boolean, default: false },
  contractSignedDate: { type: Date },
  contractDownloaded: { type: Boolean, default: false },
  contractDownloadedDate: { type: Date },
  investmentDate: { type: Date, default: Date.now },
  completionDate: { type: Date },
});

const InvestorSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  totalInvestasi: {
    type: Number,
    min: [0, 'Total investasi cannot be negative'],
    default: 0,
  },
  totalPaid: {
    type: Number,
    min: [0, 'Total paid cannot be negative'],
    default: 0,
  },
  jumlahPohon: {
    type: Number,
    min: [0, 'Jumlah pohon cannot be negative'],
    default: 0,
  },
  investments: [InvestmentRecordSchema],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    required: [true, 'Status is required'],
  },
}, {
  timestamps: true,
});

// Indexes for better query performance (userId and email already indexed via unique: true)
InvestorSchema.index({ status: 1 });
InvestorSchema.index({ name: 1 });
InvestorSchema.index({ 'investments.investmentId': 1 });

export default mongoose.models.Investor || mongoose.model<IInvestor>('Investor', InvestorSchema);