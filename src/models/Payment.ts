import mongoose, { Document, Schema } from "mongoose";

export interface IPayment extends Document {
  orderId: string;
  transactionId?: string;
  userId: string;
  amount: number;
  currency: string;

  // Payment type: registration, full-investment, cicilan-installment
  paymentType: "registration" | "full-investment" | "cicilan-installment";

  // Payment method: midtrans or manual-bca
  paymentMethod?: "midtrans" | "manual-bca";

  // For Midtrans payments (registration & full investment)
  transactionStatus?:
    | "pending"
    | "settlement"
    | "capture"
    | "deny"
    | "cancel"
    | "expire"
    | "failure";
  fraudStatus?: string;
  transactionTime?: Date;
  settlementTime?: Date;
  midtransResponse?: any;

  // For cicilan installments
  cicilanOrderId?: string; // Parent cicilan ID
  installmentNumber?: number;
  totalInstallments?: number; // Total expected installments for this cicilan order
  installmentAmount?: number; // Amount per installment
  paymentTerm?: string; // monthly, quarterly, semiannual, annual
  dueDate?: Date;
  minConsecutiveTenor?: number; // Stored value of minConsecutiveTenor at time of payment creation

  // Payment proof (for cicilan installments)
  proofImageUrl?: string;
  proofDescription?: string;

  // Admin review (for cicilan installments)
  adminStatus?: "pending" | "approved" | "rejected";
  adminReviewDate?: Date;
  adminReviewBy?: string;
  adminNotes?: string;

  // Product info
  productName?: string;
  productId?: string;

  // Customer details for registration
  customerData?: {
    fullName: string;
    nik: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: Date;
    // KTP Address
    ktpAddress: string;
    ktpVillage: string;
    ktpCity: string;
    ktpProvince: string;
    ktpPostalCode: string;
    // Domisili Address
    domisiliAddress: string;
    domisiliVillage: string;
    domisiliCity: string;
    domisiliProvince: string;
    domisiliPostalCode: string;
    occupation: string;
    // Beneficiary Information
    beneficiaryName: string;
    beneficiaryNik: string;
    beneficiaryDateOfBirth: Date;
    beneficiaryRelationship: string;
    password: string;
    ktpImageUrl: string;
    faceImageUrl: string;
  };

  // Status tracking
  isProcessed: boolean;
  processingError?: string;
  
  // Contract redirect URL (for investment payments after successful processing)
  contractRedirectUrl?: string;

  // General status (for all payment types)
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";

  // Marketing referral code
  referralCode?: string;

  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
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
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "IDR",
    },
    paymentType: {
      type: String,
      required: true,
      enum: ["registration", "full-investment", "cicilan-installment"],
    },
    paymentMethod: {
      type: String,
      enum: ["midtrans", "manual-bca"],
      default: "midtrans",
    },

    // For Midtrans payments
    transactionStatus: {
      type: String,
      enum: [
        "pending",
        "settlement",
        "capture",
        "deny",
        "cancel",
        "expire",
        "failure",
      ],
    },
    fraudStatus: {
      type: String,
      enum: ["accept", "deny", "challenge"],
    },
    transactionTime: {
      type: Date,
    },
    settlementTime: {
      type: Date,
    },
    midtransResponse: {
      type: Schema.Types.Mixed,
    },

    // For cicilan installments
    cicilanOrderId: {
      type: String,
      trim: true,
    },
    installmentNumber: {
      type: Number,
      min: 1,
    },
    totalInstallments: {
      type: Number,
      min: 1,
    },
    installmentAmount: {
      type: Number,
      min: 0,
    },
    paymentTerm: {
      type: String,
      enum: ["monthly", "quarterly", "semiannual", "annual"],
    },
    dueDate: {
      type: Date,
    },
    minConsecutiveTenor: {
      type: Number,
      min: 1,
    },

    // Payment proof
    proofImageUrl: {
      type: String,
      trim: true,
    },
    proofDescription: {
      type: String,
      trim: true,
    },

    // Admin review
    adminStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminReviewDate: {
      type: Date,
    },
    adminReviewBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    adminNotes: {
      type: String,
      trim: true,
    },

    // Product info
    productName: {
      type: String,
      trim: true,
    },
    productId: {
      type: String,
      trim: true,
    },

    // Customer details for registration
    customerData: {
      fullName: String,
      nik: String,
      email: String,
      phoneNumber: String,
      dateOfBirth: Date,
      // KTP Address
      ktpAddress: String,
      ktpVillage: String,
      ktpCity: String,
      ktpProvince: String,
      ktpPostalCode: String,
      // Domisili Address
      domisiliAddress: String,
      domisiliVillage: String,
      domisiliCity: String,
      domisiliProvince: String,
      domisiliPostalCode: String,
      occupation: String,
      // Beneficiary Information
      beneficiaryName: String,
      beneficiaryNik: String,
      beneficiaryDateOfBirth: Date,
      beneficiaryRelationship: String,
      password: String,
      ktpImageUrl: String,
      faceImageUrl: String,
    },

    // Status tracking
    isProcessed: {
      type: Boolean,
      default: false,
    },
    processingError: {
      type: String,
    },
    
    // Contract redirect URL (for investment payments after successful processing)
    contractRedirectUrl: {
      type: String,
      trim: true,
    },
    
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "rejected", "completed", "cancelled"],
      default: "pending",
    },

    // Marketing referral code
    referralCode: {
      type: String,
      trim: true,
      match: [/^[A-Z0-9]{6}$/, 'Referral code must be 6 alphanumeric characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
PaymentSchema.index({ transactionStatus: 1 });
PaymentSchema.index({ transactionTime: 1 });
PaymentSchema.index({ isProcessed: 1 });

export default mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", PaymentSchema);
