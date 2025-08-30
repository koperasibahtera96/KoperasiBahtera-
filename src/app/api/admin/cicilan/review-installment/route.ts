import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Payment from '@/models/Payment';
import Investor from '@/models/Investor';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId, action, adminNotes } = await request.json();

    if (!paymentId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    await dbConnect();

    // Find the payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Update payment with admin review
    payment.adminStatus = action === 'approve' ? 'approved' : 'rejected';
    payment.status = action === 'approve' ? 'approved' : 'rejected';
    payment.adminNotes = adminNotes || '';
    payment.adminReviewBy = session.user.id;
    payment.adminReviewDate = new Date();
    await payment.save();

    // If approved, also update the corresponding installment in the investor record
    if (action === 'approve') {
      const investor = await Investor.findOne({ userId: payment.userId });
      if (investor) {
        // Find the investment and installment
        const investment = investor.investments.find(inv => inv.investmentId === payment.cicilanOrderId);
        if (investment) {
          const installment = investment.installments?.find(inst => inst.installmentNumber === payment.installmentNumber);
          if (installment) {
            installment.isPaid = true;
            installment.paidDate = new Date();
            installment.proofImageUrl = payment.proofImageUrl;
          }
          
          // Update investment amount paid
          investment.amountPaid += payment.amount;
        }
        
        // Update total paid amount for the investor
        investor.totalPaid += payment.amount;
        await investor.save();
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully` 
    });

  } catch (error) {
    console.error('Error reviewing installment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}