import mongoose, { Document, Schema } from 'mongoose';

export interface ICicilanInstallment extends Document {
  cicilanPaymentId: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'overdue';
  
  // Payment proof details
  proofImageUrl?: string;
  proofDescription?: string;
  submissionDate?: Date;
  
  // Admin review
  adminStatus: 'pending' | 'approved' | 'rejected';
  adminReviewDate?: Date;
  adminReviewBy?: string;
  adminNotes?: string;
  
  // Payment tracking
  paidDate?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const CicilanInstallmentSchema: Schema = new Schema({
  cicilanPaymentId: {
    type: Schema.Types.ObjectId,
    ref: 'CicilanPayment',
    required: true,
  },
  installmentNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'submitted', 'approved', 'rejected', 'overdue'],
    default: 'pending',
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
  paidDate: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
CicilanInstallmentSchema.index({ cicilanPaymentId: 1 });
CicilanInstallmentSchema.index({ status: 1 });
CicilanInstallmentSchema.index({ adminStatus: 1 });
CicilanInstallmentSchema.index({ dueDate: 1 });
CicilanInstallmentSchema.index({ installmentNumber: 1 });

// Compound indexes
CicilanInstallmentSchema.index({ cicilanPaymentId: 1, installmentNumber: 1 }, { unique: true });
CicilanInstallmentSchema.index({ adminStatus: 1, submissionDate: 1 });

export default mongoose.models.CicilanInstallment || mongoose.model<ICicilanInstallment>('CicilanInstallment', CicilanInstallmentSchema);