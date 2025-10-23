// Cicilan Types - Single Source of Truth

export interface CicilanInstallment {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  paidDate: Date | null;
  _id: string;
}

export interface CicilanInvestment {
  investmentId: string;
  productName: string;
  plantInstanceId: string | null;
  totalAmount: number;
  amountPaid: number;
  paymentType: "cicilan";
  status: "active" | "completed" | "overdue";
  installments: CicilanInstallment[];
  investmentDate: Date;
  contractSigned?: boolean;
  contractSignedDate?: Date;
  contractDownloaded?: boolean;
  contractDownloadedDate?: Date;
  _id: string;
}

export interface Investor {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: "active" | "inactive";
  totalInvestasi: number;
  totalPaid: number;
  jumlahPohon: number;
  investments: CicilanInvestment[];
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface CicilanPayment {
  _id: {
    $oid: string;
  };
  orderId: string;
  userId: {
    $oid: string;
  };
  amount: number;
  currency: "IDR";
  paymentType: "cicilan-installment";
  cicilanOrderId: string;
  installmentNumber: number;
  totalInstallments: number;
  installmentAmount: number;
  paymentTerm: "monthly" | "quarterly" | "annual";
  dueDate: {
    $date: string;
  };
  adminStatus: "pending" | "approved" | "rejected";
  productName: string;
  productId: string;
  isProcessed: boolean;
  status: "pending" | "submitted" | "approved" | "rejected" | "overdue";
  proofImageUrl?: string;
  proofDescription?: string;
  adminNotes?: string;
  adminReviewBy?: {
    $oid: string;
  };
  adminReviewDate?: {
    $date: string;
  };
  createdAt: {
    $date: string;
  };
  updatedAt: {
    $date: string;
  };
  __v: number;
}

// Installment interface matching Payment model fields + API additions
export interface CicilanInstallmentWithPayment {
  // From Payment model when installment exists
  _id?: string;
  orderId?: string; // Payment orderId
  installmentNumber: number;
  amount: number;
  dueDate: Date | string | null;
  status:
    | "pending"
    | "submitted"
    | "approved"
    | "rejected"
    | "completed"
    | "cancelled"
    | "overdue"
    | "not_created";
  adminStatus?: "pending" | "approved" | "rejected" | "not_created";
  proofImageUrl?: string;
  proofDescription?: string;
  adminReviewDate?: Date | string;
  adminNotes?: string;
  adminReviewBy?: any; // Populated User reference
  paidDate?: Date | string;
  submissionDate?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;

  // Payment method for this installment
  paymentMethod?: "midtrans" | "manual-bca";

  // API-added flag to distinguish real vs placeholder installments
  exists?: boolean;
}

export interface CicilanGroup {
  cicilanOrderId: string;
  productName: string;
  productId: string;
  totalAmount: number;
  totalInstallments: number;
  installmentAmount: number;
  paymentTerm: "monthly" | "quarterly" | "semiannual" | "annual" | "full";
  installments: CicilanInstallmentWithPayment[];
  status: "active" | "completed" | "overdue";
  createdAt: Date | string;
  contractSigned?: boolean;
  contractSignedDate?: Date;
  contractDownloaded?: boolean;
  contractDownloadedDate?: Date;
  isFullPayment?: boolean; // Flag to identify full payments
  // Contract admin approval status
  contractApprovalStatus?:
    | "pending"
    | "approved"
    | "rejected"
    | "permanently_rejected";
  contractStatus?:
    | "draft"
    | "signed"
    | "approved"
    | "rejected"
    | "permanently_rejected"
    | "paid";
  contractApprovedDate?: Date | string;
  paymentAllowed?: boolean;
  // Contract retry information
  contractId?: string;
  currentAttempt?: number;
  maxAttempts?: number;
  signatureAttemptsCount?: number;
  hasEverSigned?: boolean;
  isMaxRetryReached?: boolean;
  isPermanentlyRejected?: boolean;
  // Referral code for this investment
  referralCode?: string;
  // Payment method for this cicilan group (set by first installment payment)
  paymentMethod?: "midtrans" | "manual-bca";
  // E-materai stamping status
  emateraiStamped?: boolean;
  emateraiStampedUrl?: string;
}

export interface InvestorDetail {
  userId: string;
  userInfo: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    userCode?: string;
  };
  totalInvestments: number;
  totalAmount: number;
  totalPaid: number;
  pendingReviews: number;
  overdueCount: number;
  cicilanGroups: CicilanGroup[];
  latePayments: number;
}

export interface InvestorGroup {
  userId: string;
  userInfo: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    userCode?: string;
  };
  totalInvestments: number;
  totalAmount: number;
  totalPaid: number;
  pendingReviews: number;
  overdueCount: number;
  latePayments: number;
  investments: {
    investmentId: string;
    productName: string;
    productId: string;
    totalAmount: number;
    installmentCount: number;
    paidCount: number;
    status: "active" | "completed" | "overdue";
    latestActivity: string;
  }[];
}

export interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// API Response types
export interface InvestorGroupsResponse {
  investors: InvestorGroup[];
  pagination: Pagination;
}

export interface InvestorDetailResponse {
  investor: InvestorDetail;
}

export interface ReviewInstallmentRequest {
  paymentId: string;
  action: "approve" | "reject";
  adminNotes: string;
}

export interface ReviewInstallmentResponse {
  success: boolean;
  error?: string;
  message?: string;
}
