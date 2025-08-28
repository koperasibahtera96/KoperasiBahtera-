import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CicilanPayment from '@/models/CicilanPayment';
import User from '@/models/User';
import { getServerSession } from 'next-auth/next';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { orderId, action, adminNotes } = await req.json();

    if (!orderId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Missing required fields: orderId, action (approve/reject)' 
      }, { status: 400 });
    }

    // Find cicilan payment
    const cicilanPayment = await CicilanPayment.findOne({ orderId });

    if (!cicilanPayment) {
      return NextResponse.json({ error: 'Cicilan payment not found' }, { status: 404 });
    }

    if (cicilanPayment.adminStatus !== 'pending') {
      return NextResponse.json({ 
        error: 'This payment has already been reviewed' 
      }, { status: 400 });
    }

    const now = new Date();

    if (action === 'approve') {
      // Update payment progress
      cicilanPayment.amountPaid += cicilanPayment.installmentAmount;
      cicilanPayment.remainingAmount = Math.max(0, cicilanPayment.totalAmount - cicilanPayment.amountPaid);
      cicilanPayment.currentInstallment += 1;

      // Check if payment is completed
      if (cicilanPayment.remainingAmount <= 0 || cicilanPayment.currentInstallment >= cicilanPayment.totalInstallments) {
        cicilanPayment.status = 'completed';
        cicilanPayment.remainingAmount = 0;
      } else {
        // Calculate next payment due date
        const nextPaymentDue = new Date(cicilanPayment.nextPaymentDue);
        nextPaymentDue.setMonth(nextPaymentDue.getMonth() + cicilanPayment.paymentTermMonths);
        cicilanPayment.nextPaymentDue = nextPaymentDue;
      }

      cicilanPayment.adminStatus = 'approved';
    } else {
      cicilanPayment.adminStatus = 'rejected';
    }

    // Update admin review details
    cicilanPayment.adminReviewDate = now;
    cicilanPayment.adminReviewBy = adminUser._id;
    cicilanPayment.adminNotes = adminNotes || '';

    // Clear submission details for next payment
    if (action === 'approve' || action === 'reject') {
      cicilanPayment.proofImageUrl = undefined;
      cicilanPayment.proofDescription = undefined;
      cicilanPayment.submissionDate = undefined;
    }

    await cicilanPayment.save();

    return NextResponse.json({
      success: true,
      message: `Payment ${action}d successfully`,
      cicilanPayment: {
        orderId: cicilanPayment.orderId,
        currentInstallment: cicilanPayment.currentInstallment,
        totalInstallments: cicilanPayment.totalInstallments,
        amountPaid: cicilanPayment.amountPaid,
        remainingAmount: cicilanPayment.remainingAmount,
        status: cicilanPayment.status,
        adminStatus: cicilanPayment.adminStatus,
        nextPaymentDue: cicilanPayment.nextPaymentDue,
      }
    });

  } catch (error) {
    console.error('Error reviewing cicilan payment:', error);
    return NextResponse.json({ error: 'Failed to review payment' }, { status: 500 });
  }
}