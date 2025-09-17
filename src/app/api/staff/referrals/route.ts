import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the current user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has marketing role
    if (user.role !== 'marketing') {
      return NextResponse.json({ 
        error: "Access denied. Marketing role required." 
      }, { status: 403 });
    }

    // Get user's referral code
    if (!user.referralCode) {
      return NextResponse.json({
        success: true,
        data: {
          referralCode: null,
          message: "No referral code assigned. Contact admin.",
          referrals: [],
          totalCommission: 0,
          totalReferrals: 0
        }
      });
    }

    // Find all payments using this referral code
    const referralPayments = await Payment.find({
      referralCode: user.referralCode,
      $or: [
        { transactionStatus: "settlement" }, // Paid via Midtrans
        { adminStatus: "approved" } // Approved manually (for cicilan)
      ]
    })
    .populate('userId', 'fullName email phoneNumber')
    .sort({ createdAt: -1 });

    // Calculate commissions (2% of each payment amount)
    let totalCommission = 0;
    const referrals = referralPayments.map(payment => {
      const commission = Math.round(payment.amount * 0.02); // 2% commission
      totalCommission += commission;

      return {
        paymentId: payment._id,
        orderId: payment.orderId,
        customerName: payment.userId?.fullName || 'Unknown',
        customerEmail: payment.userId?.email || 'Unknown',
        customerPhone: payment.userId?.phoneNumber || 'Unknown',
        productName: payment.productName,
        paymentType: payment.paymentType,
        amount: payment.amount,
        commission: commission,
        status: payment.transactionStatus || payment.adminStatus,
        paymentDate: payment.transactionStatus === 'settlement' 
          ? payment.settlementTime || payment.createdAt
          : payment.adminReviewDate || payment.createdAt,
        createdAt: payment.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        staffName: user.fullName,
        staffEmail: user.email,
        referrals,
        totalCommission,
        totalReferrals: referrals.length,
        summary: {
          fullPayments: referrals.filter(r => r.paymentType === 'full-investment').length,
          cicilanPayments: referrals.filter(r => r.paymentType === 'cicilan-installment').length,
          registrations: referrals.filter(r => r.paymentType === 'registration').length,
        }
      }
    });

  } catch (error) {
    console.error("Error fetching referral data:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch referral data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}