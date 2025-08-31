import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Investor from '@/models/Investor';
import Payment from '@/models/Payment';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    
    // Validate if userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }
    
    await dbConnect();

    // Get investor data
    const investor = await Investor.findOne({ userId }).populate('userId');
    if (!investor) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 });
    }

    // Get user info
    const user = await User.findById(investor.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all payments for this user's cicilan investments
    const payments = await Payment.find({ 
      userId: investor.userId,
      paymentType: 'cicilan-installment'
    });

    // Create a map of payments by cicilanOrderId and installmentNumber for quick lookup
    const paymentsMap = new Map();
    payments.forEach(payment => {
      const key = `${payment.cicilanOrderId}-${payment.installmentNumber}`;
      paymentsMap.set(key, payment);
    });

    // Process investments and merge with payment data
    const cicilanGroups = investor.investments.map(investment => {
      const installmentsWithPayments = investment.installments?.map(installment => {
        const paymentKey = `${investment.investmentId}-${installment.installmentNumber}`;
        const payment = paymentsMap.get(paymentKey);

        // Merge installment data with payment data
        return {
          ...installment.toObject(),
          // Payment-specific fields
          orderId: payment?.orderId || null,
          paymentId: payment?._id?.toString() || null,
          proofImageUrl: payment?.proofImageUrl || installment.proofImageUrl || null,
          proofDescription: payment?.proofDescription || null,
          adminStatus: payment?.adminStatus || 'pending',
          adminNotes: payment?.adminNotes || null,
          adminReviewBy: payment?.adminReviewBy || null,
          adminReviewDate: payment?.adminReviewDate || null,
          submissionDate: payment?.createdAt || null,
          status: payment?.status || (installment.isPaid ? 'approved' : 'pending'),
          // Keep original installment fields
          _id: installment._id.toString(),
          installmentNumber: installment.installmentNumber,
          amount: installment.amount,
          dueDate: installment.dueDate,
          isPaid: installment.isPaid,
          paidDate: installment.paidDate
        };
      }) || [];

      return {
        cicilanOrderId: investment.investmentId,
        productName: investment.productName,
        productId: investment.productId || 'unknown',
        totalAmount: investment.totalAmount,
        totalInstallments: investment.installments?.length || 0,
        installmentAmount: investment.installments?.[0]?.amount || 0,
        paymentTerm: getPaymentTermFromInstallments(investment.installments?.length || 0),
        installments: installmentsWithPayments,
        status: getInvestmentStatus(installmentsWithPayments),
        createdAt: investment.investmentDate
      };
    });

    // Calculate statistics
    const totalInvestments = investor.investments.length;
    const totalAmount = investor.totalInvestasi;
    const totalPaid = investor.totalPaid;
    
    // Count pending reviews (payments with proofImageUrl but adminStatus pending)
    const pendingReviews = payments.filter(p => 
      p.proofImageUrl && p.adminStatus === 'pending'
    ).length;
    
    // Count overdue installments
    const now = new Date();
    const overdueCount = cicilanGroups.reduce((count, group) => {
      return count + group.installments.filter(inst => 
        new Date(inst.dueDate) < now && 
        inst.status === 'pending' && 
        !inst.proofImageUrl
      ).length;
    }, 0);

    const investorDetail = {
      userId: investor.userId.toString(),
      userInfo: {
        _id: user._id.toString(),
        fullName: user.fullName || investor.name,
        email: user.email || investor.email,
        phoneNumber: user.phoneNumber || investor.phoneNumber
      },
      totalInvestments,
      totalAmount,
      totalPaid,
      pendingReviews,
      overdueCount,
      cicilanGroups
    };

    return NextResponse.json({ investor: investorDetail });

  } catch (error) {
    console.error('Error fetching investor detail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to determine payment term from number of installments
function getPaymentTermFromInstallments(installmentCount: number): 'monthly' | 'quarterly' | 'annual' {
  if (installmentCount <= 4) return 'quarterly';
  if (installmentCount <= 12) return 'monthly';
  return 'annual';
}

// Helper function to determine investment status
function getInvestmentStatus(installments: any[]): 'active' | 'completed' | 'overdue' {
  const approvedCount = installments.filter(i => i.status === 'approved').length;
  const totalCount = installments.length;
  
  if (approvedCount === totalCount) return 'completed';
  
  const now = new Date();
  const hasOverdue = installments.some(i => 
    new Date(i.dueDate) < now && 
    i.status === 'pending' && 
    !i.proofImageUrl
  );
  
  return hasOverdue ? 'overdue' : 'active';
}