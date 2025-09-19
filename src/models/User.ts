import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  fullName: string;
  nik: string;
  phoneNumber: string;
  dateOfBirth: Date;
  // KTP Address
  ktpAddress: string;
  ktpVillage: string;
  ktpCity: string;
  ktpProvince: string;
  ktpPostalCode: string;
  // Domisili Address
  domisiliAddress: string;
  domisiliVillage: string;
  domisiliCity: string;
  domisiliProvince: string;
  domisiliPostalCode: string;
  occupation: string;
  occupationCode?: string; // Auto-generated based on occupation
  userCode?: string; // Auto-generated user code
  ktpImageUrl?: string; // KTP image URL from ImageKit
  faceImageUrl?: string; // Face verification image URL from ImageKit
  profileImageUrl?: string; // Profile image URL from ImageKit
  kartuAnggotaUrl?: string; // Kartu Anggota PDF URL from ImageKit
  role: 'user' | 'staff' | 'spv_staff' | 'admin' | 'finance' | 'staff_finance' | 'ketua' | 'marketing' | 'marketing_head';
  referralCode?: string; // 6-digit alphanumeric code for marketing staff
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
  nik: {
    type: String,
    required: [true, 'NIK is required'],
    unique: true,
    trim: true,
    match: [/^[0-9]{16}$/, 'NIK must be 16 digits'],
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
  // KTP Address
  ktpAddress: {
    type: String,
    required: [true, 'KTP address is required'],
    trim: true,
  },
  ktpVillage: {
    type: String,
    required: [true, 'KTP village is required'],
    trim: true,
  },
  ktpCity: {
    type: String,
    required: [true, 'KTP city is required'],
    trim: true,
  },
  ktpProvince: {
    type: String,
    required: [true, 'KTP province is required'],
    trim: true,
  },
  ktpPostalCode: {
    type: String,
    required: [true, 'KTP postal code is required'],
    trim: true,
    match: [/^[0-9]{5}$/, 'KTP postal code must be 5 digits'],
  },
  // Domisili Address
  domisiliAddress: {
    type: String,
    required: [true, 'Domisili address is required'],
    trim: true,
  },
  domisiliVillage: {
    type: String,
    required: [true, 'Domisili village is required'],
    trim: true,
  },
  domisiliCity: {
    type: String,
    required: [true, 'Domisili city is required'],
    trim: true,
  },
  domisiliProvince: {
    type: String,
    required: [true, 'Domisili province is required'],
    trim: true,
  },
  domisiliPostalCode: {
    type: String,
    required: [true, 'Domisili postal code is required'],
    trim: true,
    match: [/^[0-9]{5}$/, 'Domisili postal code must be 5 digits'],
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
  profileImageUrl: {
    type: String,
    trim: true,
  },
  kartuAnggotaUrl: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'staff', 'spv_staff', 'admin', 'finance', 'staff_finance', 'ketua', 'marketing', 'marketing_head'],
    default: 'user',
    required: [true, 'Role is required'],
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^[A-Z0-9]{6}$/, 'Referral code must be 6 alphanumeric characters'],
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
UserSchema.index({ ktpProvince: 1 });
UserSchema.index({ ktpCity: 1 });
UserSchema.index({ domisiliProvince: 1 });
UserSchema.index({ domisiliCity: 1 });
// Note: nik and userCode already have unique indexes from their schema definition

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);