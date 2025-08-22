import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  dateOfBirth: Date;
  address: string;
  village: string;
  city: string;
  province: string;
  postalCode: string;
  occupation: string;
  occupationCode?: string; // Auto-generated based on occupation
  userCode?: string; // Auto-generated user code
  role: 'user' | 'staff' | 'admin' | 'finance';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [100, 'Full name cannot exceed 100 characters'],
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^(\+62|0)[0-9]{9,13}$/, 'Please enter a valid Indonesian phone number'],
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    minlength: [10, 'Address must be at least 10 characters'],
  },
  village: {
    type: String,
    required: [true, 'Village is required'],
    trim: true,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  province: {
    type: String,
    required: [true, 'Province is required'],
    trim: true,
  },
  postalCode: {
    type: String,
    required: [true, 'Postal code is required'],
    trim: true,
    match: [/^[0-9]{5}$/, 'Postal code must be 5 digits'],
  },
  occupation: {
    type: String,
    required: [true, 'Occupation is required'],
    trim: true,
  },
  occupationCode: {
    type: String,
    trim: true,
  },
  userCode: {
    type: String,
    unique: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'staff', 'admin', 'finance'],
    default: 'user',
    required: [true, 'Role is required'],
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ userCode: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ province: 1 });
UserSchema.index({ city: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);