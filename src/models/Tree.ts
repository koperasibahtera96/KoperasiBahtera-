import mongoose, { Document, Schema } from 'mongoose';

export interface ITree extends Document {
  spesiesPohon: string;
  pemilik: mongoose.Types.ObjectId; // Reference to Investor
  lokasi: string;
  umur: number; // in months
  tinggi: number; // in cm
  tanggalTanam: Date;
  kondisi: 'sehat' | 'perlu_perawatan' | 'sakit';
  createdAt: Date;
  updatedAt: Date;
}

const TreeSchema: Schema = new Schema({
  spesiesPohon: {
    type: String,
    required: [true, 'Spesies pohon is required'],
    trim: true,
    minlength: [2, 'Spesies pohon must be at least 2 characters'],
    maxlength: [100, 'Spesies pohon cannot exceed 100 characters'],
  },
  pemilik: {
    type: Schema.Types.ObjectId,
    ref: 'Investor',
    required: [true, 'Pemilik is required'],
  },
  lokasi: {
    type: String,
    required: [true, 'Lokasi is required'],
    trim: true,
    minlength: [2, 'Lokasi must be at least 2 characters'],
    maxlength: [200, 'Lokasi cannot exceed 200 characters'],
  },
  umur: {
    type: Number,
    required: [true, 'Umur is required'],
    min: [0, 'Umur cannot be negative'],
  },
  tinggi: {
    type: Number,
    required: [true, 'Tinggi is required'],
    min: [0, 'Tinggi cannot be negative'],
  },
  tanggalTanam: {
    type: Date,
    required: [true, 'Tanggal tanam is required'],
  },
  kondisi: {
    type: String,
    enum: ['sehat', 'perlu_perawatan', 'sakit'],
    default: 'sehat',
    required: [true, 'Kondisi is required'],
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
TreeSchema.index({ pemilik: 1 });
TreeSchema.index({ spesiesPohon: 1 });
TreeSchema.index({ kondisi: 1 });
TreeSchema.index({ tanggalTanam: 1 });

export default mongoose.models.Tree || mongoose.model<ITree>('Tree', TreeSchema);