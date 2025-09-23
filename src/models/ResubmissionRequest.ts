import mongoose, { Document, Schema } from 'mongoose';

export interface IResubmissionRequest extends Document {
  userId: Schema.Types.ObjectId | string;
  ktpImageUrl: string;
  faceImageUrl: string;
  status: 'pending' | 'reviewed' | 'rejected';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResubmissionRequestSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ktpImageUrl: { type: String, required: true, trim: true },
    faceImageUrl: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'rejected'],
      default: 'pending',
    },
    adminNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.ResubmissionRequest ||
  mongoose.model<IResubmissionRequest>('ResubmissionRequest', ResubmissionRequestSchema);
