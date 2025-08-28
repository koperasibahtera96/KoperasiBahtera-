import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CicilanInstallment from '@/models/CicilanInstallment';
import CicilanPayment from '@/models/CicilanPayment';
import Investor from '@/models/Investor';
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

    const { installmentId, action, adminNotes } = await req.json();

    if (!installmentId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Missing required fields: installmentId, action (approve/reject)' 
      }, { status: 400 });
    }

    // Find installment
    const installment = await CicilanInstallment.findById(installmentId)
      .populate('cicilanPaymentId');

    if (!installment) {
      return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
    }

    if (installment.adminStatus !== 'pending') {
      return NextResponse.json({ 
        error: 'This installment has already been reviewed' 
      }, { status: 400 });
    }

    const now = new Date();

    if (action === 'approve') {
      // Update installment status
      installment.status = 'approved';
      installment.adminStatus = 'approved';
      installment.paidDate = now;

      // Update main cicilan payment progress
      const cicilanPayment = installment.cicilanPaymentId;
      cicilanPayment.amountPaid += installment.amount;
      cicilanPayment.remainingAmount = Math.max(0, cicilanPayment.totalAmount - cicilanPayment.amountPaid);
      cicilanPayment.currentInstallment += 1;

      // Check if cicilan payment is completed
      if (cicilanPayment.remainingAmount <= 0 || cicilanPayment.currentInstallment >= cicilanPayment.totalInstallments) {
        cicilanPayment.status = 'completed';
        cicilanPayment.remainingAmount = 0;
      }

      await cicilanPayment.save();
    } else {
      // Reject installment
      installment.status = 'rejected';
      installment.adminStatus = 'rejected';
    }

    // Update admin review details
    installment.adminReviewDate = now;
    installment.adminReviewBy = adminUser._id;
    installment.adminNotes = adminNotes || '';

    // Clear submission details for rejected payments (they can resubmit)
    if (action === 'reject') {
      installment.proofImageUrl = undefined;
      installment.proofDescription = undefined;
      installment.submissionDate = undefined;
    }

    await installment.save();

    // Update investor record
    if (action === 'approve') {
      const investor = await Investor.findOne({ 
        'investments.investmentId': installment.cicilanPaymentId.orderId 
      });
      
      if (investor) {
        const investment = investor.investments.find(
          inv => inv.investmentId === installment.cicilanPaymentId.orderId
        );
        
        if (investment && investment.installments) {
          const installmentSummary = investment.installments.find(
            inst => inst.installmentNumber === installment.installmentNumber
          );
          
          if (installmentSummary) {
            installmentSummary.isPaid = true;
            installmentSummary.paidDate = now;
            installmentSummary.proofImageUrl = installment.proofImageUrl;
            
            // Update totals
            investment.amountPaid += installment.amount;
            investor.totalPaid += installment.amount;
            
            // Check if investment is completed
            const allPaid = investment.installments.every(inst => inst.isPaid);
            if (allPaid) {
              investment.status = 'completed';
              investment.completionDate = now;
            }
            
            await investor.save();
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Installment ${action}d successfully`,
      installment: {
        _id: installment._id,
        installmentNumber: installment.installmentNumber,
        status: installment.status,
        adminStatus: installment.adminStatus,
        paidDate: installment.paidDate,
        adminReviewDate: installment.adminReviewDate,
        adminNotes: installment.adminNotes,
      }
    });

  } catch (error) {
    console.error('Error reviewing installment:', error);
    return NextResponse.json({ error: 'Failed to review installment' }, { status: 500 });
  }
}