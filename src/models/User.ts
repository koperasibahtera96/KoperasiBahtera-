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
  ktpImageUrl?: string; // KTP image URL from ImageKit
  faceImageUrl?: string; // Face verification image URL from ImageKit
  role: 'user' | 'staff' | 'admin' | 'finance';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  
  // Verification status fields
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationNotes?: string; // Admin notes for rejection/approval
  verifiedBy?: string; // Admin who verified
  verifiedAt?: Date; // When verification was completed
  canPurchase: boolean; // Whether user can buy products
  
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
  ktpImageUrl: {
    type: String,
    trim: true,
  },
  faceImageUrl: {
    type: String,
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
  
  // Verification status fields
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    required: true,
  },
  verificationNotes: {
    type: String,
    trim: true,
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedAt: {
    type: Date,
  },
  canPurchase: {
    type: Boolean,
    default: false,
  },
  
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ province: 1 });
UserSchema.index({ city: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);