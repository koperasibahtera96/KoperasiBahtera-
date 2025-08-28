import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CicilanInstallment from '@/models/CicilanInstallment';
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
    const totalCount = await CicilanInstallment.countDocuments(query);

    // Get installments with related data
    const installments = await CicilanInstallment.find(query)
      .populate({
        path: 'cicilanPaymentId',
        select: 'orderId productName userId',
        populate: {
          path: 'userId',
          select: 'fullName email phoneNumber'
        }
      })
      .populate('adminReviewBy', 'fullName email')
      .sort({ submissionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    return NextResponse.json({
      success: true,
      installments: installments.map(installment => ({
        _id: installment._id,
        installmentNumber: installment.installmentNumber,
        amount: installment.amount,
        dueDate: installment.dueDate,
        status: installment.status,
        proofImageUrl: installment.proofImageUrl,
        proofDescription: installment.proofDescription,
        submissionDate: installment.submissionDate,
        adminStatus: installment.adminStatus,
        adminReviewDate: installment.adminReviewDate,
        adminReviewBy: installment.adminReviewBy,
        adminNotes: installment.adminNotes,
        paidDate: installment.paidDate,
        cicilanPayment: installment.cicilanPaymentId,
        createdAt: installment.createdAt,
        updatedAt: installment.updatedAt,
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