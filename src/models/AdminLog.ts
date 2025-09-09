import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IAdminLog extends Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  adminEmail: string;
  action: 'create_staff' | 'update_staff' | 'delete_staff' | 'update_plant_prices';
  description: string;
  targetType: 'staff' | 'plant';
  targetId?: string;
  targetName?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AdminLogSchema = new Schema<IAdminLog>({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminName: {
    type: String,
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['create_staff', 'update_staff', 'delete_staff', 'update_plant_prices'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  targetType: {
    type: String,
    enum: ['staff', 'plant'],
    required: true
  },
  targetId: {
    type: String,
    required: false
  },
  targetName: {
    type: String,
    required: false
  },
  oldData: {
    type: Schema.Types.Mixed,
    required: false
  },
  newData: {
    type: Schema.Types.Mixed,
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // We only need createdAt
});

// Add indexes for efficient querying
AdminLogSchema.index({ adminId: 1, createdAt: -1 });
AdminLogSchema.index({ action: 1, createdAt: -1 });
AdminLogSchema.index({ targetType: 1, createdAt: -1 });
AdminLogSchema.index({ createdAt: -1 });

const AdminLog = models.AdminLog || model<IAdminLog>('AdminLog', AdminLogSchema);

export default AdminLog;