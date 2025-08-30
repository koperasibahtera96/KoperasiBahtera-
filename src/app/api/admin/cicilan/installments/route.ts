import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import User from '@/models/User';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

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


    const query: any = { paymentType: 'cicilan-installment' };
    if (status) query.status = status;
    if (adminStatus) query.adminStatus = adminStatus;

    // Get total count
    const totalCount = await Payment.countDocuments(query);

    // Get installment payments with related data
    const installments = await Payment.find(query)
      .populate('userId', 'fullName email phoneNumber')
      .populate('adminReviewBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    return NextResponse.json({
      success: true,
      installments: installments.map(payment => ({
        _id: payment._id,
        orderId: payment.orderId,
        cicilanOrderId: payment.cicilanOrderId,
        installmentNumber: payment.installmentNumber,
        amount: payment.amount,
        dueDate: payment.dueDate,
        status: payment.status,
        productName: payment.productName,
        productId: payment.productId,
        proofImageUrl: payment.proofImageUrl,
        proofDescription: payment.proofDescription,
        adminStatus: payment.adminStatus,
        adminReviewDate: payment.adminReviewDate,
        adminReviewBy: payment.adminReviewBy,
        adminNotes: payment.adminNotes,
        userId: payment.userId,
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
    console.error('Error getting admin installments:', error);
    return NextResponse.json({ error: 'Failed to get installments' }, { status: 500 });
  }
}