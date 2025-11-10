import mongoose, { Document, Schema } from 'mongoose';

export interface ICommissionWithdrawal extends Document {
  marketingStaffId: mongoose.Types.ObjectId;
  marketingStaffName: string;
  referralCode: string;
  
  // Withdrawal details
  amount: number;
  withdrawalDate: Date;
  
  // Tracking who processed it
  processedBy: mongoose.Types.ObjectId;
  processedByName: string;
  
  // Optional notes
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const CommissionWithdrawalSchema: Schema = new Schema(
  {
    marketingStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    marketingStaffName: {
      type: String,
      required: true,
      trim: true,
    },
    referralCode: {
      type: String,
      required: true,
      trim: true,
      match: [/^[A-Z0-9]{6}$/, 'Referral code must be 6 alphanumeric characters'],
      index: true,
    },
    
    // Withdrawal details
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be positive'],
    },
    withdrawalDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    
    // Tracking
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    processedByName: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Optional notes
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for better query performance
CommissionWithdrawalSchema.index({ marketingStaffId: 1, withdrawalDate: -1 });
CommissionWithdrawalSchema.index({ withdrawalDate: -1 });

export default mongoose.models.CommissionWithdrawal ||
  mongoose.model<ICommissionWithdrawal>('CommissionWithdrawal', CommissionWithdrawalSchema);
