import mongoose, { Document, Schema } from 'mongoose';

export interface ICicilanPayment extends Document {
  orderId: string;
  userId: string;
  productId: string;
  productName: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  installmentAmount: number;
  paymentTerm: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  paymentTermMonths: number;
  totalInstallments: number;
  currentInstallment: number;
  nextPaymentDue: Date;
  status: 'active' | 'completed' | 'cancelled';
  
  // Payment proof details
  proofImageUrl?: string;
  proofDescription?: string;
  submissionDate?: Date;
  
  // Admin review
  adminStatus: 'pending' | 'approved' | 'rejected';
  adminReviewDate?: Date;
  adminReviewBy?: string;
  adminNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const CicilanPaymentSchema: Schema = new Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  productId: {
    type: String,
    required: true,
    trim: true,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0,
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  installmentAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentTerm: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'semiannual', 'annual'],
  },
  paymentTermMonths: {
    type: Number,
    required: true,
    min: 1,
  },
  totalInstallments: {
    type: Number,
    required: true,
    min: 1,
  },
  currentInstallment: {
    type: Number,
    default: 0,
    min: 0,
  },
  nextPaymentDue: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  proofImageUrl: {
    type: String,
    trim: true,
  },
  proofDescription: {
    type: String,
    trim: true,
  },
  submissionDate: {
    type: Date,
  },
  adminStatus: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  adminReviewDate: {
    type: Date,
  },
  adminReviewBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  adminNotes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
CicilanPaymentSchema.index({ userId: 1 });
CicilanPaymentSchema.index({ status: 1 });
CicilanPaymentSchema.index({ adminStatus: 1 });
CicilanPaymentSchema.index({ nextPaymentDue: 1 });
CicilanPaymentSchema.index({ productId: 1 });

// Compound indexes
CicilanPaymentSchema.index({ userId: 1, status: 1 });
CicilanPaymentSchema.index({ adminStatus: 1, submissionDate: 1 });

export default mongoose.models.CicilanPayment || mongoose.model<ICicilanPayment>('CicilanPayment', CicilanPaymentSchema);