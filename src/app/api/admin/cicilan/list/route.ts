import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CicilanPayment from '@/models/CicilanPayment';
import User from '@/models/User';
import { getServerSession } from 'next-auth/next';

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get URL parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const adminStatus = searchParams.get('adminStatus');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (adminStatus) query.adminStatus = adminStatus;

    // Get total count
    const totalCount = await CicilanPayment.countDocuments(query);

    // Get cicilan payments with user details
    const cicilanPayments = await CicilanPayment.find(query)
      .populate('userId', 'fullName email phoneNumber')
      .populate('adminReviewBy', 'fullName email')
      .sort({ submissionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    return NextResponse.json({
      success: true,
      cicilanPayments: cicilanPayments.map(payment => ({
        _id: payment._id,
        orderId: payment.orderId,
        user: payment.userId,
        productName: payment.productName,
        totalAmount: payment.totalAmount,
        amountPaid: payment.amountPaid,
        remainingAmount: payment.remainingAmount,
        installmentAmount: payment.installmentAmount,
        paymentTerm: payment.paymentTerm,
        totalInstallments: payment.totalInstallments,
        currentInstallment: payment.currentInstallment,
        nextPaymentDue: payment.nextPaymentDue,
        status: payment.status,
        proofImageUrl: payment.proofImageUrl,
        proofDescription: payment.proofDescription,
        submissionDate: payment.submissionDate,
        adminStatus: payment.adminStatus,
        adminReviewDate: payment.adminReviewDate,
        adminReviewBy: payment.adminReviewBy,
        adminNotes: payment.adminNotes,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      }
    });

  } catch (error) {
    console.error('Error getting admin cicilan payments:', error);
    return NextResponse.json({ error: 'Failed to get cicilan payments' }, { status: 500 });
  }
}