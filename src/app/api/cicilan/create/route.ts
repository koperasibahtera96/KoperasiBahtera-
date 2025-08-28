import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CicilanPayment from '@/models/CicilanPayment';
import CicilanInstallment from '@/models/CicilanInstallment';
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

    const { productId, productName, totalAmount, paymentTerm } = await req.json();

    if (!productId || !productName || !totalAmount || !paymentTerm) {
      return NextResponse.json({ 
        error: 'Missing required fields: productId, productName, totalAmount, paymentTerm' 
      }, { status: 400 });
    }

    // Validate payment term
    const validTerms = ['monthly', 'quarterly', 'semiannual', 'annual'];
    if (!validTerms.includes(paymentTerm)) {
      return NextResponse.json({ 
        error: 'Invalid payment term. Must be one of: monthly, quarterly, semiannual, annual' 
      }, { status: 400 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate payment terms
    const termToMonths = {
      monthly: 1,
      quarterly: 3,
      semiannual: 6,
      annual: 12
    };

    const paymentTermMonths = termToMonths[paymentTerm as keyof typeof termToMonths];
    const totalInstallments = Math.ceil(24 / paymentTermMonths); // Default 2 years
    const installmentAmount = Math.ceil(totalAmount / totalInstallments);
    
    // First payment is due today (immediate payment)
    const nextPaymentDue = new Date();

    const orderId = `CICILAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const cicilanPayment = new CicilanPayment({
      orderId,
      userId: user._id,
      productId,
      productName,
      totalAmount,
      amountPaid: 0,
      remainingAmount: totalAmount,
      installmentAmount,
      paymentTerm,
      paymentTermMonths,
      totalInstallments,
      currentInstallment: 0,
      nextPaymentDue,
      status: 'active',
      adminStatus: 'pending',
    });

    await cicilanPayment.save();

    // Create individual installment records
    const installments = [];
    const startDate = new Date();
    
    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(startDate);
      // First installment is due today, subsequent installments follow payment term
      // For example: monthly installment 1 = due today (28 Aug)
      //             monthly installment 2 = due in 1 month (28 Sep)  
      //             quarterly installment 1 = due today (28 Aug)
      //             quarterly installment 2 = due in 3 months (28 Nov)
      dueDate.setMonth(dueDate.getMonth() + ((i - 1) * paymentTermMonths));

      const installment = new CicilanInstallment({
        cicilanPaymentId: cicilanPayment._id,
        installmentNumber: i,
        amount: installmentAmount,
        dueDate,
        status: 'pending',
        adminStatus: 'pending',
      });

      installments.push(installment);
    }

    await CicilanInstallment.insertMany(installments);

    // Create or update investor record
    let investor = await Investor.findOne({ userId: user._id });
    
    if (!investor) {
      // Create new investor
      investor = new Investor({
        userId: user._id,
        name: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        totalInvestasi: 0,
        totalPaid: 0,
        jumlahPohon: 0,
        investments: [],
        status: 'active'
      });
    }

    // Add investment record with installment summaries
    const installmentSummaries = installments.map(inst => ({
      installmentNumber: inst.installmentNumber,
      amount: inst.amount,
      dueDate: inst.dueDate,
      isPaid: false,
      paidDate: null,
      proofImageUrl: null
    }));

    const investmentRecord = {
      investmentId: orderId,
      productName,
      plantInstanceId: null, // Will be assigned when plant is allocated
      totalAmount,
      amountPaid: 0,
      paymentType: 'cicilan' as const,
      status: 'active' as const,
      installments: installmentSummaries,
      investmentDate: new Date()
    };

    investor.investments.push(investmentRecord);
    investor.totalInvestasi += totalAmount;
    
    await investor.save();

    return NextResponse.json({
      success: true,
      orderId,
      cicilanPayment: {
        orderId: cicilanPayment.orderId,
        productName: cicilanPayment.productName,
        totalAmount: cicilanPayment.totalAmount,
        installmentAmount: cicilanPayment.installmentAmount,
        paymentTerm: cicilanPayment.paymentTerm,
        totalInstallments: cicilanPayment.totalInstallments,
        nextPaymentDue: cicilanPayment.nextPaymentDue,
        status: cicilanPayment.status,
      }
    });

  } catch (error) {
    console.error('Error creating cicilan payment:', error);
    return NextResponse.json({ error: 'Failed to create cicilan payment' }, { status: 500 });
  }
}