import mongoose, { Document, Schema } from 'mongoose';

// History interface for plant activities
export interface IPlantHistory {
  id: number;
  type: string;
  date: string;
  description: string;
  hasImage: boolean;
  imageUrl?: string | null;
}

export interface IPlant extends Document {
  id: number;
  name: string;
  qrCode: string;
  owner: string;
  fotoGambar?: string | null;
  memberId: string;
  contractNumber: string;
  location: string;
  plantType: string;
  status: string;
  lastUpdate: string;
  height: number; // in cm
  age: number; // in months
  history: IPlantHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const HistorySchema = new Schema({
  id: { type: Number, required: true },
  type: { type: String, required: true },
  date: { type: String, required: true },
  description: { type: String, required: true },
  hasImage: { type: Boolean, default: false },
  imageUrl: { type: String, default: null },
});

const PlantSchema: Schema = new Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, 'Plant name must be at least 2 characters'],
      maxlength: [100, 'Plant name cannot exceed 100 characters'],
    },
    qrCode: {
      type: String,
      required: true,
      trim: true
    },
    owner: {
      type: String,
      required: true,
      trim: true
    },
    fotoGambar: {
      type: String,
      default: null
    },
    memberId: {
      type: String,
      required: true,
      trim: true
    },
    contractNumber: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, 'Location must be at least 2 characters'],
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    plantType: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true,
      trim: true
    },
    lastUpdate: {
      type: String,
      required: true
    },
    height: {
      type: Number,
      required: true,
      min: [0, 'Height cannot be negative'],
      default: 0
    },
    age: {
      type: Number,
      required: true,
      min: [0, 'Age cannot be negative'],
      default: 0
    },
    history: [HistorySchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
PlantSchema.index({ owner: 1 });
PlantSchema.index({ memberId: 1 });
PlantSchema.index({ plantType: 1 });
PlantSchema.index({ status: 1 });
PlantSchema.index({ qrCode: 1 });

// Compound unique constraint: plant name + owner + location must be unique
PlantSchema.index({ name: 1, owner: 1, location: 1 }, {
  unique: true,
  name: 'unique_plant_owner_location'
});

export default mongoose.models.Plant || mongoose.model<IPlant>('Plant', PlantSchema);