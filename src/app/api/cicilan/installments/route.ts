import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CicilanPayment from '@/models/CicilanPayment';
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

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get URL parameters
    const { searchParams } = new URL(req.url);
    const cicilanPaymentId = searchParams.get('cicilanPaymentId');

    let query = {};
    if (cicilanPaymentId) {
      // Get installments for specific cicilan payment
      query = { cicilanPaymentId };
    }

    // Get user's cicilan payments first
    const userCicilanPayments = await CicilanPayment.find({ userId: user._id }).select('_id orderId productName');
    const cicilanIds = userCicilanPayments.map(cp => cp._id);

    // Get installments for user's cicilan payments
    const installmentsQuery = cicilanPaymentId ? 
      { cicilanPaymentId } : 
      { cicilanPaymentId: { $in: cicilanIds } };

    const installments = await CicilanInstallment.find(installmentsQuery)
      .populate({
        path: 'cicilanPaymentId',
        select: 'orderId productName totalAmount'
      })
      .sort({ dueDate: 1, installmentNumber: 1 });

    // Group installments by cicilan payment
    const groupedInstallments = installments.reduce((acc, installment) => {
      const cicilanId = installment.cicilanPaymentId._id.toString();
      if (!acc[cicilanId]) {
        acc[cicilanId] = {
          cicilanPayment: installment.cicilanPaymentId,
          installments: []
        };
      }
      acc[cicilanId].installments.push({
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
        adminNotes: installment.adminNotes,
        paidDate: installment.paidDate,
        createdAt: installment.createdAt,
        updatedAt: installment.updatedAt,
      });
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      groupedInstallments: Object.values(groupedInstallments),
      totalInstallments: installments.length
    });

  } catch (error) {
    console.error('Error getting installments:', error);
    return NextResponse.json({ error: 'Failed to get installments' }, { status: 500 });
  }
}