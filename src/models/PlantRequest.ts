import mongoose, { Document, Schema } from 'mongoose';

export interface IPlantRequest extends Document {
  plantId: string; // ID of the plant being requested for action
  requestedBy: string; // SPV Staff who requested the action
  requestType: 'delete' | 'update_history' | 'delete_history';
  
  // For delete requests
  deleteReason?: string;
  
  // For history update requests
  historyId?: number;
  originalDescription?: string;
  newDescription?: string;
  
  // Request metadata
  status: 'pending' | 'approved' | 'rejected';
  requestDate: Date;
  
  // Admin response
  reviewedBy?: string; // Admin who reviewed
  reviewedAt?: Date;
  reviewNotes?: string; // Admin's response/notes
}

const PlantRequestSchema: Schema = new Schema({
  plantId: {
    type: String,
    required: [true, 'Plant ID is required'],
    trim: true,
  },
  requestedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requester is required'],
  },
  requestType: {
    type: String,
    enum: ['delete', 'update_history', 'delete_history'],
    required: [true, 'Request type is required'],
  },
  
  // Delete request fields
  deleteReason: {
    type: String,
    trim: true,
  },
  
  // History update fields
  historyId: {
    type: Number,
  },
  originalDescription: {
    type: String,
    trim: true,
  },
  newDescription: {
    type: String,
    trim: true,
  },
  
  // Request status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    required: true,
  },
  requestDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  
  // Admin review
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
  reviewNotes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
PlantRequestSchema.index({ status: 1 });
PlantRequestSchema.index({ requestedBy: 1 });
PlantRequestSchema.index({ requestType: 1 });
PlantRequestSchema.index({ plantId: 1 });

export default mongoose.models.PlantRequest || mongoose.model<IPlantRequest>('PlantRequest', PlantRequestSchema);