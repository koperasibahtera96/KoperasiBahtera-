import mongoose, { Document, Schema } from "mongoose";

export interface IWhatsAppSession extends Document {
  whatsappNumber: string;
  authData: { [key: string]: string }; // Store auth data as key-value pairs (JSON strings)
  qrCode?: string; // Store QR code as base64 data URL
  qrGeneratedAt?: Date; // When the QR code was generated
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'qr';
  isActive: boolean;
  lastConnected: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppSessionSchema: Schema = new Schema(
  {
    whatsappNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    authData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    qrCode: {
      type: String,
      required: false,
    },
    qrGeneratedAt: {
      type: Date,
      required: false,
    },
    connectionStatus: {
      type: String,
      enum: ['connecting', 'connected', 'disconnected', 'qr'],
      default: 'disconnected',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastConnected: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (whatsappNumber already has unique index, so only add isActive)
WhatsAppSessionSchema.index({ isActive: 1 });

export default mongoose.models.WhatsAppSession ||
  mongoose.model<IWhatsAppSession>("WhatsAppSession", WhatsAppSessionSchema);