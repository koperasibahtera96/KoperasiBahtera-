import mongoose, { Document, Schema } from 'mongoose';

export interface IFilteredWord extends Document {
  word: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FilteredWordSchema: Schema = new Schema({
  word: {
    type: String,
    required: [true, 'Word is required'],
    trim: true,
    lowercase: true,
    minlength: [2, 'Word must be at least 2 characters'],
    maxlength: [50, 'Word cannot exceed 50 characters'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance - avoid duplicate word index
FilteredWordSchema.index({ word: 1 }, { unique: true });
FilteredWordSchema.index({ isActive: 1 });
FilteredWordSchema.index({ word: 1, isActive: 1 });

export default mongoose.models.FilteredWord || mongoose.model<IFilteredWord>('FilteredWord', FilteredWordSchema);