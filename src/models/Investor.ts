import mongoose, { Document, Schema } from 'mongoose';

export interface IInvestor extends Document {
  name: string;
  email: string;
  totalInvestasi: number; // in IDR
  jumlahPohon: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const InvestorSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
  },
  totalInvestasi: {
    type: Number,
    required: [true, 'Total investasi is required'],
    min: [0, 'Total investasi cannot be negative'],
    default: 0,
  },
  jumlahPohon: {
    type: Number,
    required: [true, 'Jumlah pohon is required'],
    min: [0, 'Jumlah pohon cannot be negative'],
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    required: [true, 'Status is required'],
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
InvestorSchema.index({ email: 1 });
InvestorSchema.index({ status: 1 });
InvestorSchema.index({ name: 1 });

export default mongoose.models.Investor || mongoose.model<IInvestor>('Investor', InvestorSchema);