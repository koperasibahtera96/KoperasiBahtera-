import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Investor from '@/models/Investor';
import Payment from '@/models/Payment';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    await dbConnect();

    // Build query
    const query: any = {
      investments: { $exists: true, $ne: [] }, // Only investors with cicilan investments
      userId: { $ne: null, $exists: true } // Only investors with valid userId
    };

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const totalCount = await Investor.countDocuments(query);

    // Get investors with pagination (don't populate userId to avoid object issues)
    const investors = await Investor.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Filter out investors with null userId and get user info
    const validInvestors = investors.filter(inv => inv.userId != null);
    const userIds = validInvestors.map(inv => inv.userId);
    const users = await User.find({ _id: { $in: userIds } });
    const usersMap = new Map(users.map(user => [user._id.toString(), user]));

    // Get payments for pending reviews count
    const payments = await Payment.find({ 
      userId: { $in: userIds },
      paymentType: 'cicilan-installment'
    });

    const paymentsMap = new Map();
    payments.forEach(payment => {
      const userId = payment.userId.toString();
      if (!paymentsMap.has(userId)) {
        paymentsMap.set(userId, []);
      }
      paymentsMap.get(userId).push(payment);
    });

    // Process investor data
    const investorGroups = validInvestors.map(investor => {
      const user = usersMap.get(investor.userId.toString());
      const userPayments = paymentsMap.get(investor.userId.toString()) || [];
      
      // Count pending reviews
      const pendingReviews = userPayments.filter(p => 
        p.proofImageUrl && p.adminStatus === 'pending'
      ).length;

      // Count overdue installments
      const now = new Date();
      const overdueCount = investor.investments.reduce((count, investment) => {
        return count + (investment.installments?.filter(inst => 
          new Date(inst.dueDate) < now && 
          !inst.isPaid &&
          !userPayments.some(p => 
            p.cicilanOrderId === investment.investmentId && 
            p.installmentNumber === inst.installmentNumber &&
            p.proofImageUrl
          )
        ).length || 0);
      }, 0);

      // Process investments summary
      const investments = investor.investments.map(investment => {
        const paidCount = investment.installments?.filter(i => i.isPaid).length || 0;
        const totalCount = investment.installments?.length || 0;
        
        let investmentStatus: 'active' | 'completed' | 'overdue' = 'active';
        if (paidCount === totalCount) {
          investmentStatus = 'completed';
        } else {
          const hasOverdue = investment.installments?.some(inst => 
            new Date(inst.dueDate) < now && 
            !inst.isPaid &&
            !userPayments.some(p => 
              p.cicilanOrderId === investment.investmentId && 
              p.installmentNumber === inst.installmentNumber &&
              p.proofImageUrl
            )
          );
          if (hasOverdue) investmentStatus = 'overdue';
        }

        return {
          cicilanOrderId: investment.investmentId,
          productName: investment.productName,
          productId: investment.productId || 'unknown',
          totalAmount: investment.totalAmount,
          installmentCount: totalCount,
          paidCount,
          status: investmentStatus,
          latestActivity: investment.investmentDate.toISOString()
        };
      });

      return {
        userId: investor.userId.toString(),
        userInfo: {
          _id: user?._id.toString() || investor.userId.toString(),
          fullName: user?.fullName || investor.name,
          email: user?.email || investor.email,
          phoneNumber: user?.phoneNumber || investor.phoneNumber
        },
        totalInvestments: investor.investments.length,
        totalAmount: investor.totalInvestasi,
        totalPaid: investor.totalPaid,
        pendingReviews,
        overdueCount,
        investments
      };
    });

    // Apply status filter after processing
    let filteredInvestors = investorGroups;
    if (status) {
      filteredInvestors = investorGroups.filter(investor => {
        const approvedCount = investor.investments.filter(inv => inv.status === 'completed').length;
        const totalCount = investor.investments.length;
        const hasOverdue = investor.overdueCount > 0;

        switch (status) {
          case 'completed': return approvedCount === totalCount;
          case 'overdue': return hasOverdue;
          case 'active': return approvedCount < totalCount && !hasOverdue;
          default: return true;
        }
      });
    }

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      investors: filteredInvestors,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching investors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}