import mongoose, { Schema, Document } from 'mongoose';

export interface IProfileChangeRequest extends Document {
  userId: mongoose.Types.ObjectId;
  changeType: 'fullName' | 'email';
  currentValue: string;
  requestedValue: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileChangeRequestSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  changeType: {
    type: String,
    enum: ['fullName', 'email'],
    required: true
  },
  currentValue: {
    type: String,
    required: true
  },
  requestedValue: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: String
  },
  adminNotes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
ProfileChangeRequestSchema.index({ userId: 1, status: 1 });
ProfileChangeRequestSchema.index({ status: 1, requestedAt: -1 });

export default mongoose.models.ProfileChangeRequest || mongoose.model<IProfileChangeRequest>('ProfileChangeRequest', ProfileChangeRequestSchema);