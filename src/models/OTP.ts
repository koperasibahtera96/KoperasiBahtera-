import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  createdAt: Date;
}

const OTPSchema: Schema = new Schema({
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index - automatically delete documents after expiresAt
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster lookups
OTPSchema.index({ phoneNumber: 1, createdAt: -1 });

export default mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema);
