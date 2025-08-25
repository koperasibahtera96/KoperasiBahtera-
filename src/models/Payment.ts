import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  orderId: string;
  transactionId?: string;
  userId?: string;
  amount: number;
  currency: string;
  paymentType: string;
  transactionStatus: string;
  fraudStatus?: string;
  transactionTime?: Date;
  settlementTime?: Date;

  // Customer details for registration
  customerData?: {
    fullName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: Date;
    address: string;
    village: string;
    city: string;
    province: string;
    postalCode: string;
    occupation: string;
    password: string; // Add missing password field
    ktpImageUrl: string;
    faceImageUrl: string;
  };

  // Midtrans response data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  midtransResponse?: any;

  // Status tracking
  isProcessed: boolean;
  processingError?: string;

  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  transactionId: {
    type: String,
    trim: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'IDR',
  },
  paymentType: {
    type: String,
    trim: true,
  },
  transactionStatus: {
    type: String,
    required: true,
    enum: ['pending', 'settlement', 'capture', 'deny', 'cancel', 'expire', 'failure'],
  },
  fraudStatus: {
    type: String,
    enum: ['accept', 'deny', 'challenge'],
  },
  transactionTime: {
    type: Date,
  },
  settlementTime: {
    type: Date,
  },
  customerData: {
    fullName: String,
    email: String,
    phoneNumber: String,
    dateOfBirth: Date,
    address: String,
    village: String,
    city: String,
    province: String,
    postalCode: String,
    occupation: String,
    password: String, // Add missing password field
    ktpImageUrl: String,
    faceImageUrl: String,
  },
  midtransResponse: {
    type: Schema.Types.Mixed,
  },
  isProcessed: {
    type: Boolean,
    default: false,
  },
  processingError: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
PaymentSchema.index({ transactionStatus: 1 });
PaymentSchema.index({ transactionTime: 1 });
PaymentSchema.index({ isProcessed: 1 });

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);