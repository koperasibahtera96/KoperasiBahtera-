import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Contract from '@/models/Contract';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const contractId = (await params).contractId;
    
    if (!contractId) {
      return NextResponse.json(
        { success: false, error: 'Contract ID is required' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Try to find contract in the contracts collection
    // Create query conditions based on the contractId format
    const queryConditions = [];
    
    // Only try to match _id if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(contractId)) {
      queryConditions.push({ _id: contractId });
    }
    
    // Always try to match contractId field
    queryConditions.push({ contractId: contractId });
    
    const contract = await Contract.findOne({
      $or: queryConditions
    }).populate('userId');
    
    if (!contract) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      );
    }
    
    // Verify this contract belongs to the current user
    const user = contract.userId;
    if (!user || user.email !== session.user.email) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to access this contract' },
        { status: 403 }
      );
    }
    
    // Only block download if the contract is in draft state
    if (contract.status === 'draft') {
      return NextResponse.json(
        { success: false, error: 'Contract is in draft state and cannot be downloaded yet' },
        { status: 400 }
      );
    }
    

    const contractData = {
        investor: {
          name: user.name || user.email.split('@')[0],
          email: user.email,
          phoneNumber: user.phoneNumber || undefined,
          address: user.address || undefined,
        },
        investment: {
          investmentId: contract.contractId || contractId,
          productName: contract.productName || "Investasi",
          totalAmount: contract.totalAmount || 0,
          amountPaid: contract.amountPaid || 0,
          paymentType: contract.paymentType || "full",
          plantInstanceId: contract.plantInstanceId?.toString() || "",
          investmentDate: contract.createdAt?.toISOString() || new Date().toISOString(),
        },
        plantInstance: {
          instanceName: "Instansi Pohon",
          plantType: contract.plantType || "pohon",
          baseAnnualROI: contract.annualROI || 0.15, // Default 15%
          location: "Jakarta",
        },
        contractNumber: contract.contractNumber || contractId,
        contractDate: contract.createdAt?.toISOString() || new Date().toISOString(),
      };
    
    // Find the last approved signature attempt
    let signatureData = null;
    if (Array.isArray(contract.signatureAttempts)) {
      // Find the last approved attempt (highest attemptNumber)
      const approvedAttempts = contract.signatureAttempts.filter(
        (a: any) => a.reviewStatus === 'approved' && a.signatureData
      );
      if (approvedAttempts.length > 0) {
        // Sort by attemptNumber descending and take the first
        approvedAttempts.sort((a: any, b: any) => b.attemptNumber - a.attemptNumber);
        signatureData = approvedAttempts[0].signatureData;
      } else if (contract.signatureAttempts.length > 0 && contract.signatureAttempts[0].signatureData) {
        // If no approved, use the first attempt's signatureData
        signatureData = contract.signatureAttempts[0].signatureData;
      }
    }

    // Log what data we have for debugging
    console.log('Contract data found:', {
      hasSignature: !!signatureData,
      contractId: contract.contractId,
      status: contract.status,
      dataKeys: Object.keys(contract._doc || contract)
    });

    return NextResponse.json({
      success: true,
      contractData,
      signatureData: signatureData || null,
    });
    
  } catch (error: any) {
    console.error('Error downloading contract:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to download contract' },
      { status: 500 }
    );
  }
}