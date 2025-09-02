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
    paymentType: 'cicilan';
    status: 'active' | 'completed' | 'overdue';
    installments: CicilanInstallment[];
    investmentDate: Date;
    _id: string;
}

export interface Investor {
    _id: string;
    userId: string;
    name: string;
    email: string;
    phoneNumber: string;
    status: 'active' | 'inactive';
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
    currency: 'IDR';
    paymentType: 'cicilan-installment';
    cicilanOrderId: string;
    installmentNumber: number;
    totalInstallments: number;
    installmentAmount: number;
    paymentTerm: 'monthly' | 'quarterly' | 'annual';
    dueDate: {
        $date: string;
    };
    adminStatus: 'pending' | 'approved' | 'rejected';
    productName: string;
    productId: string;
    isProcessed: boolean;
    status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'overdue';
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

// Combined types for UI components
export interface CicilanInstallmentWithPayment extends CicilanInstallment {
    // Payment details when available
    paymentId?: string;
    orderId?: string; // From payments table: CICILAN-xxx-INST-x format
    proofImageUrl?: string;
    proofDescription?: string;
    adminStatus: 'pending' | 'approved' | 'rejected';
    adminNotes?: string;
    adminReviewBy?: {
        $oid: string;
    };
    adminReviewDate?: {
        $date: string;
    };
    submissionDate?: Date;
    status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'overdue';
}

export interface CicilanGroup {
    cicilanOrderId: string;
    productName: string;
    productId: string;
    totalAmount: number;
    totalInstallments: number;
    installmentAmount: number;
    paymentTerm: 'monthly' | 'quarterly' | 'annual';
    installments: CicilanInstallmentWithPayment[];
    status: 'active' | 'completed' | 'overdue';
    createdAt: Date;
}

export interface InvestorDetail {
    userId: string;
    userInfo: {
        _id: string;
        fullName: string;
        email: string;
        phoneNumber: string;
    };
    totalInvestments: number;
    totalAmount: number;
    totalPaid: number;
    pendingReviews: number;
    overdueCount: number;
    cicilanGroups: CicilanGroup[];
}

export interface InvestorGroup {
    userId: string;
    userInfo: {
        _id: string;
        fullName: string;
        email: string;
        phoneNumber: string;
    };
    totalInvestments: number;
    totalAmount: number;
    totalPaid: number;
    pendingReviews: number;
    overdueCount: number;
    investments: {
        investmentId: string;
        productName: string;
        productId: string;
        totalAmount: number;
        installmentCount: number;
        paidCount: number;
        status: 'active' | 'completed' | 'overdue';
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
    action: 'approve' | 'reject';
    adminNotes: string;
}

export interface ReviewInstallmentResponse {
    success: boolean;
    error?: string;
    message?: string;
}