import mongoose, { Document, Schema } from 'mongoose';

export interface ISignatureAttempt {
  attemptNumber: number;
  signatureData: string;
  submittedAt: Date;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  adminNotes?: string;
}

export interface IContract extends Document {
  contractId: string;
  userId: string;
  productName: string;
  productId: string;
  totalAmount: number;
  paymentType: 'full' | 'cicilan';

  // For cicilan payments - store user's selected terms
  paymentTerm?: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  totalInstallments?: number;
  installmentAmount?: number;

  // Signature tracking with retry support
  signatureAttempts: ISignatureAttempt[];
  currentAttempt: number;
  maxAttempts: number;

  // Admin approval tracking
  adminApprovalStatus: 'pending' | 'approved' | 'rejected' | 'permanently_rejected';
  adminApprovedBy?: string;
  adminApprovedDate?: Date;

  // Payment and plant instance tracking
  paymentAllowed: boolean;
  paymentCompleted: boolean;
  paymentUrl?: string; // Midtrans payment URL for full payments
  plantInstanceId?: string;

  // Contract metadata
  contractNumber: string;
  contractDate: Date;

  // Overall status
  status: 'draft' | 'signed' | 'approved' | 'rejected' | 'permanently_rejected' | 'paid';

  createdAt: Date;
  updatedAt: Date;
}

const SignatureAttemptSchema = new Schema({
  attemptNumber: { type: Number, required: true },
  signatureData: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  rejectionReason: { type: String },
  adminNotes: { type: String }
});

const ContractSchema: Schema = new Schema({
  contractId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productName: {
    type: String,
    required: true
  },
  productId: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  paymentType: {
    type: String,
    enum: ['full', 'cicilan'],
    required: true
  },

  // For cicilan payments - store user's selected terms
  paymentTerm: {
    type: String,
    enum: ['monthly', 'quarterly', 'semiannual', 'annual']
  },
  totalInstallments: {
    type: Number,
    min: 1
  },
  installmentAmount: {
    type: Number,
    min: 0
  },
  signatureAttempts: [SignatureAttemptSchema],
  currentAttempt: {
    type: Number,
    default: 0,
    min: 0
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: 1
  },
  adminApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'permanently_rejected'],
    default: 'pending'
  },
  adminApprovedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  adminApprovedDate: {
    type: Date
  },
  paymentAllowed: {
    type: Boolean,
    default: false
  },
  paymentCompleted: {
    type: Boolean,
    default: false
  },
  paymentUrl: {
    type: String,
    required: false
  },
  plantInstanceId: {
    type: Schema.Types.ObjectId,
    ref: 'PlantInstance'
  },
  contractNumber: {
    type: String,
    required: true,
    unique: true
  },
  contractDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'signed', 'approved', 'rejected', 'permanently_rejected', 'paid'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ContractSchema.index({ status: 1 });
ContractSchema.index({ adminApprovalStatus: 1 });
ContractSchema.index({ userId: 1, status: 1 });
ContractSchema.index({ createdAt: -1 });


export default mongoose.models.Contract || mongoose.model<IContract>('Contract', ContractSchema);