import mongoose, { Document, Schema } from 'mongoose';

export interface ICommissionHistory extends Document {
  marketingStaffId: mongoose.Types.ObjectId;
  marketingStaffName: string;
  referralCodeUsed: string;

  // Payment details
  paymentId: mongoose.Types.ObjectId;
  cicilanOrderId?: string; // For cicilan payments
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;

  // Commission calculation
  contractValue: number; // Total contract amount
  commissionRate: number; // 0.02 (2%)
  commissionAmount: number; // contractValue * commissionRate

  // Type and timing
  paymentType: 'full-investment' | 'cicilan-installment';
  earnedAt: Date; // When commission was earned (payment approved)
  calculatedAt: Date; // When record was created

  // Metadata
  contractId?: string;
  productName: string;
  installmentDetails?: {
    installmentAmount: number;
    totalInstallments: number;
    installmentNumber: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const CommissionHistorySchema: Schema = new Schema(
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
    referralCodeUsed: {
      type: String,
      required: true,
      trim: true,
      match: [/^[A-Z0-9]{6}$/, 'Referral code must be 6 alphanumeric characters'],
      index: true,
    },

    // Payment details
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      unique: true, // Prevent duplicate commission for same payment
      index: true,
    },
    cicilanOrderId: {
      type: String,
      trim: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // Commission calculation
    contractValue: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionRate: {
      type: Number,
      required: true,
      default: 0.02, // 2%
      min: 0,
      max: 1,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Type and timing
    paymentType: {
      type: String,
      required: true,
      enum: ['full-investment', 'cicilan-installment'],
      index: true,
    },
    earnedAt: {
      type: Date,
      required: true,
      index: true,
    },
    calculatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Metadata
    contractId: {
      type: String,
      trim: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    installmentDetails: {
      installmentAmount: {
        type: Number,
        min: 0,
      },
      totalInstallments: {
        type: Number,
        min: 1,
      },
      installmentNumber: {
        type: Number,
        min: 1,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for better query performance
CommissionHistorySchema.index({ marketingStaffId: 1, earnedAt: -1 });
CommissionHistorySchema.index({ referralCodeUsed: 1, earnedAt: -1 });
CommissionHistorySchema.index({ paymentType: 1, earnedAt: -1 });
CommissionHistorySchema.index({ earnedAt: -1 }); // For date range queries

export default mongoose.models.CommissionHistory ||
  mongoose.model<ICommissionHistory>('CommissionHistory', CommissionHistorySchema);