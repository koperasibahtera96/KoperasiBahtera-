import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
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
    const cicilanOrderId = searchParams.get('cicilanOrderId');

    // Build query for cicilan installment payments
    const query: any = { 
      userId: user._id, 
      paymentType: 'cicilan-installment' 
    };
    
    if (cicilanOrderId) {
      query.cicilanOrderId = cicilanOrderId;
    }

    // Get installment payments
    const installments = await Payment.find(query)
      .sort({ cicilanOrderId: 1, installmentNumber: 1 });

    // Group installments by cicilan order ID
    const groupedInstallments = installments.reduce((acc, payment) => {
      const cicilanId = payment.cicilanOrderId;
      if (!acc[cicilanId]) {
        acc[cicilanId] = {
          cicilanPayment: {
            _id: payment.cicilanOrderId,
            orderId: payment.cicilanOrderId,
            productName: payment.productName,
            totalAmount: 0 // Will calculate from installments
          },
          installments: []
        };
      }
      
      // Add up total amount
      acc[cicilanId].cicilanPayment.totalAmount += payment.amount;
      
      acc[cicilanId].installments.push({
        _id: payment._id,
        installmentNumber: payment.installmentNumber,
        amount: payment.amount,
        dueDate: payment.dueDate,
        status: payment.status,
        proofImageUrl: payment.proofImageUrl,
        proofDescription: payment.proofDescription,
        submissionDate: payment.createdAt, // Use createdAt as submission date for now
        adminStatus: payment.adminStatus,
        adminReviewDate: payment.adminReviewDate,
        adminNotes: payment.adminNotes,
        paidDate: payment.status === 'approved' ? payment.adminReviewDate : null,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      });
      return acc;
    }, {} as any);

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