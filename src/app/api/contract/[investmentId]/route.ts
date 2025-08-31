import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Investor from '@/models/Investor';
import PlantInstance from '@/models/PlantInstance';

export async function GET(
  request: Request,
  { params }: { params: { investmentId: string } }
) {
  try {
    await dbConnect();

    const { investmentId } = params;

    // Find investor with the specific investment
    const investor = await Investor.findOne({
      'investments.investmentId': investmentId
    });

    if (!investor) {
      return NextResponse.json(
        { success: false, error: 'Investment not found' },
        { status: 404 }
      );
    }

    // Find the specific investment
    const investment = investor.investments.find(
      inv => inv.investmentId === investmentId
    );

    if (!investment) {
      return NextResponse.json(
        { success: false, error: 'Investment not found' },
        { status: 404 }
      );
    }

    // Check if payment is completed (either full payment or all installments paid)
    const isPaymentComplete = investment.paymentType === 'full' 
      ? investment.amountPaid >= investment.totalAmount
      : investment.installments && investment.installments.every(inst => inst.isPaid);

    if (!isPaymentComplete) {
      return NextResponse.json(
        { success: false, error: 'Payment not completed yet' },
        { status: 400 }
      );
    }

    // Get plant instance details
    let plantInstance = null;
    if (investment.plantInstanceId) {
      plantInstance = await PlantInstance.findById(investment.plantInstanceId);
    }

    // Generate contract number and date
    const contractDate = new Date().toISOString();
    const contractNumber = `KIH-${new Date().getFullYear()}-${investmentId.slice(-6).toUpperCase()}`;

    const contractData = {
      investor: {
        name: investor.name,
        email: investor.email,
        phoneNumber: investor.phoneNumber,
        address: investor.address || undefined
      },
      investment: {
        investmentId: investment.investmentId,
        productName: investment.productName,
        totalAmount: investment.totalAmount,
        amountPaid: investment.amountPaid,
        paymentType: investment.paymentType,
        plantInstanceId: investment.plantInstanceId?.toString() || '',
        investmentDate: investment.investmentDate
      },
      plantInstance: plantInstance ? {
        instanceName: plantInstance.instanceName,
        plantType: plantInstance.plantType,
        baseAnnualROI: plantInstance.baseAnnualROI,
        location: plantInstance.location
      } : {
        instanceName: 'Instansi Pohon',
        plantType: 'pohon',
        baseAnnualROI: 0,
        location: 'Akan ditentukan'
      },
      contractNumber,
      contractDate
    };

    return NextResponse.json({
      success: true,
      data: contractData
    });

  } catch (error) {
    console.error('GET /api/contract/[investmentId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contract data' },
      { status: 500 }
    );
  }
}

// POST to mark contract as signed and save signature data
export async function POST(
  request: Request,
  { params }: { params: { investmentId: string } }
) {
  try {
    await dbConnect();

    const { investmentId } = params;
    const body = await request.json();
    const { signatureData, contractNumber } = body;

    // Find investor with the specific investment
    const investor = await Investor.findOne({
      'investments.investmentId': investmentId
    });

    if (!investor) {
      return NextResponse.json(
        { success: false, error: 'Investment not found' },
        { status: 404 }
      );
    }

    // Update investment to mark contract as signed
    const investmentIndex = investor.investments.findIndex(
      inv => inv.investmentId === investmentId
    );

    if (investmentIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Investment not found' },
        { status: 404 }
      );
    }

    // Add contract signing information to the investment
    investor.investments[investmentIndex] = {
      ...investor.investments[investmentIndex],
      contractSigned: true,
      contractNumber,
      contractSignedDate: new Date(),
      signatureData: signatureData || null
    };

    await investor.save();

    return NextResponse.json({
      success: true,
      message: 'Contract signed successfully'
    });

  } catch (error) {
    console.error('POST /api/contract/[investmentId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save contract signature' },
      { status: 500 }
    );
  }
}