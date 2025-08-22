export interface StaffUser {
  _id: string;
  fullName: string;
  phoneNumber: string;
  userCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffFormData {
  fullName: string;
  phoneNumber: string;
  password: string;
}

export interface ProvinceOption {
  value: string;
  label: string;
}

export interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  newStaff: number;
}