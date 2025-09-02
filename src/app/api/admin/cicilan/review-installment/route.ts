import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Investor from '@/models/Investor';
import Payment from '@/models/Payment';
import PlantInstance from '@/models/PlantInstance';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

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

    // If approved, handle cicilan payment processing
    if (action === 'approve') {
      // Check if this is the first installment approval - need to create PlantInstance and investor record
      if (payment.installmentNumber === 1) {
        console.log(`First installment approved for cicilan ${payment.cicilanOrderId} - creating PlantInstance and investor record`);

        try {
          // Find the user for this payment
          const user = await User.findById(payment.userId);
          if (!user) {
            throw new Error('User not found for cicilan payment');
          }

          // Create PlantInstance for this cicilan investment
          const plantInstanceId = `PLANT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Map product name to plant type
          const getPlantType = (productName: string): "gaharu" | "alpukat" | "jengkol" | "aren" => {
            const name = productName.toLowerCase();
            if (name.includes('gaharu')) return 'gaharu';
            if (name.includes('alpukat')) return 'alpukat';
            if (name.includes('jengkol')) return 'jengkol';
            if (name.includes('aren')) return 'aren';
            return 'gaharu'; // default
          };

          const getBaseROI = (plantType: "gaharu" | "alpukat" | "jengkol" | "aren"): number => {
            const roiMap = { gaharu: 0.15, alpukat: 0.12, jengkol: 0.10, aren: 0.18 };
            return roiMap[plantType] || 0.12;
          };

          const productName = payment.productName || 'gaharu';
          const plantType = getPlantType(productName);
          const instanceName = `${plantType.charAt(0).toUpperCase() + plantType.slice(1)} - ${user.fullName}`;

          const now = new Date();
          const lastUpdate = String(now.getDate()).padStart(2, "0") + "/" +
                   String(now.getMonth() + 1).padStart(2, "0") + "/" +
                   now.getFullYear();

          const plantInstance = new PlantInstance({
            id: productName,
            plantType,
            instanceName,
            baseAnnualROI: getBaseROI(plantType),
            operationalCosts: [],
            incomeRecords: [],
            qrCode: `QR-${plantInstanceId}`,
            owner: user.fullName,
            fotoGambar: null,
            memberId: user._id.toString(),
            contractNumber: `CONTRACT-${payment.cicilanOrderId}`,
            location: 'TBD',
            status: 'Kontrak Baru', // First installment approved, plant is now active
            lastUpdate,
            history: [{
              action: 'created',
              date: new Date().toISOString(),
              description: `Plant instance created for approved first installment of cicilan ${payment.cicilanOrderId}`,
              addedBy: session.user.id
            }]
          });

          const savedPlantInstance = await plantInstance.save();
          console.log(`PlantInstance created: ${plantInstanceId} for cicilan ${payment.cicilanOrderId}`);

          // Find existing investor record (should exist from cicilan creation)
          const existingInvestor = await Investor.findOne({ userId: user._id });
          if (!existingInvestor) {
            throw new Error('Investor record not found - should have been created during cicilan creation');
          }

          // Find the investment in the investor record and update it
          const investment = existingInvestor.investments.find((inv: any) => inv.investmentId === payment.cicilanOrderId);
          if (!investment) {
            throw new Error('Investment not found in investor record');
          }

          // Update the investment with PlantInstance and mark as active
          investment.plantInstanceId = savedPlantInstance._id.toString();
          investment.status = 'active';
          investment.amountPaid += payment.amount;

          // Find the specific installment and mark as paid
          const installment = investment.installments?.find((inst: any) => inst.installmentNumber === payment.installmentNumber);
          if (installment) {
            installment.isPaid = true;
            installment.paidDate = new Date();
            installment.proofImageUrl = payment.proofImageUrl;
          }

          // Extract tree count from product name
          const extractTreeCount = (productName: string): number => {
            if (!productName) return 1;
            if (productName.includes('1 Pohon')) return 1;
            if (productName.includes('10 Pohon')) return 10;
            return 10; // Default for backward compatibility
          };

          // Update investor totals
          existingInvestor.totalPaid += payment.amount;
          existingInvestor.jumlahPohon += extractTreeCount(payment.productName); // First installment approved = get the plants

          await existingInvestor.save();

          console.log('Investor record created/updated for first cicilan installment approval:', payment.cicilanOrderId);

        } catch (plantInstanceError) {
          console.error('Error creating PlantInstance and investor record for cicilan:', plantInstanceError);
          // Don't fail the approval, just log the error
        }

      } else {
        // For subsequent installments, just update existing investor record
        const investor = await Investor.findOne({ userId: payment.userId });
        if (investor) {
          // Find the investment and installment
          const investment = investor.investments.find((inv: any) => inv.investmentId === payment.cicilanOrderId);
          if (investment) {
            const installment = investment.installments?.find((inst: any) => inst.installmentNumber === payment.installmentNumber);
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

      // After approving any installment (both first and subsequent), create the next installment payment if it doesn't exist yet
      if (payment.installmentNumber < payment.totalInstallments) {
        const nextInstallmentNumber = payment.installmentNumber + 1;

        // Check if next installment payment already exists
        const existingNextPayment = await Payment.findOne({
          cicilanOrderId: payment.cicilanOrderId,
          installmentNumber: nextInstallmentNumber
        });

        if (!existingNextPayment) {
          // Calculate next installment due date based on payment term
          const termToMonths = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };
          const paymentTermMonths = termToMonths[payment.paymentTerm as keyof typeof termToMonths] || 1;

          const nextDueDate = new Date(payment.dueDate);
          nextDueDate.setMonth(nextDueDate.getMonth() + paymentTermMonths);

          // Create next installment payment record
          const nextInstallmentOrderId = `${payment.cicilanOrderId}-INST-${nextInstallmentNumber}`;
          const nextInstallment = new Payment({
            orderId: nextInstallmentOrderId,
            userId: payment.userId,
            amount: payment.installmentAmount,
            currency: 'IDR',
            paymentType: 'cicilan-installment',
            cicilanOrderId: payment.cicilanOrderId,
            installmentNumber: nextInstallmentNumber,
            totalInstallments: payment.totalInstallments,
            installmentAmount: payment.installmentAmount,
            paymentTerm: payment.paymentTerm,
            dueDate: nextDueDate,
            productName: payment.productName,
            productId: payment.productId,
            adminStatus: 'pending',
            status: 'pending',
            isProcessed: false,
          });

          await nextInstallment.save();
          console.log(`Next installment created: ${nextInstallmentOrderId} due ${nextDueDate.toISOString()}`);

          // Also add the next installment to the investor record
          const investorForNextInstallment = await Investor.findOne({ userId: payment.userId });
          if (investorForNextInstallment) {
            const investmentForNextInstallment = investorForNextInstallment.investments.find((inv: any) => inv.investmentId === payment.cicilanOrderId);
            if (investmentForNextInstallment && investmentForNextInstallment.installments) {
              // Check if this installment already exists in investor record
              const existingInstallmentInInvestor = investmentForNextInstallment.installments.find((inst: any)  => inst.installmentNumber === nextInstallmentNumber);

              if (!existingInstallmentInInvestor) {
                investmentForNextInstallment.installments.push({
                  installmentNumber: nextInstallmentNumber,
                  amount: payment.installmentAmount,
                  dueDate: nextDueDate,
                  isPaid: false,
                  paidDate: null,
                  proofImageUrl: null
                });

                await investorForNextInstallment.save();
                console.log(`Added installment ${nextInstallmentNumber} to investor record for ${payment.cicilanOrderId}`);
              }
            }
          }
        }
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