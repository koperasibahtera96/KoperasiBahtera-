export interface StaffUser {
  _id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  role: 'staff' | 'spv_staff' | 'admin' | 'finance';
  userCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffFormData {
  fullName: string;
  phoneNumber: string;
  email: string;
  role: 'Staff' | 'SPV Staff' | 'Admin' | 'Finance';
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

export interface PlantRequest {
  _id: string;
  plantId: string;
  requestedBy: {
    _id: string;
    fullName: string;
    email: string;
  };
  requestType: 'delete' | 'update_history' | 'delete_history';
  deleteReason?: string;
  historyId?: number;
  originalDescription?: string;
  newDescription?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  reviewedBy?: {
    _id: string;
    fullName: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface PlantRequestFormData {
  requestType: 'delete' | 'update_history' | 'delete_history';
  deleteReason?: string;
  historyId?: number;
  originalDescription?: string;
  newDescription?: string;
}