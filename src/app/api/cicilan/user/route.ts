import dbConnect from '@/lib/mongodb';
import CicilanPayment from '@/models/CicilanPayment';
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

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get URL parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const adminStatus = searchParams.get('adminStatus');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId: user._id };
    if (status) query.status = status;
    if (adminStatus) query.adminStatus = adminStatus;

    // Get cicilan payments
    const cicilanPayments = await CicilanPayment.find(query)
      .sort({ createdAt: -1 })
      .select('-__v');

    return NextResponse.json({
      success: true,
      cicilanPayments: cicilanPayments.map(payment => ({
        orderId: payment.orderId,
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
        adminStatus: payment.adminStatus,
        proofImageUrl: payment.proofImageUrl,
        proofDescription: payment.proofDescription,
        submissionDate: payment.submissionDate,
        adminReviewDate: payment.adminReviewDate,
        adminNotes: payment.adminNotes,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      }))
    });

  } catch (error) {
    console.error('Error getting user cicilan payments:', error);
    return NextResponse.json({ error: 'Failed to get cicilan payments' }, { status: 500 });
  }
}