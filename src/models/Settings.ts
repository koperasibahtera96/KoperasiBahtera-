import mongoose, { Document, Schema } from "mongoose";

export interface ISettings extends Document {
  type: 'email' | 'notification' | 'system' | 'whatsapp';
  config: {
    // For email settings
    email?: string;
    password?: string;
    service?: 'gmail' | 'outlook' | 'yahoo';

    // For WhatsApp settings
    whatsappNumber?: string;
    status?: 'connected' | 'disconnected' | 'connecting' | 'qr';
    qrCode?: string;
    qrCodeTimestamp?: Date;
    lastConnected?: Date;

    // For system settings
    registrationFee?: number;

    // For other settings
    [key: string]: any;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

const SettingsSchema: Schema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['email', 'notification', 'system', 'whatsapp'],
      unique: true,
    },
    config: {
      type: Schema.Types.Mixed,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (type already has unique index, so only add isActive)
SettingsSchema.index({ isActive: 1 });

export default mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);