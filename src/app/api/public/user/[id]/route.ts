import { ensureConnection } from "@/lib/utils/database";
import { Investor, PlantInstance, User } from "@/models";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

/** util angka aman */
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const getAmount = (iv: any) =>
  num(iv?.totalAmount ?? iv?.amountPaid ?? iv?.amount ?? iv?.invested ?? 0);

const netProfitOf = (p: any) => {
  const inc = (p?.incomeRecords ?? []).reduce(
    (s: number, r: any) => s + num(r?.amount),
    0
  );
  const exp = (p?.operationalCosts ?? []).reduce(
    (s: number, r: any) => s + num(r?.amount),
    0
  );
  return inc - exp;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();

    const { id } = await params;
    console.log('Looking for user with ID:', id);

    // --- Find user first (public data only) ---
    let user: any = null;
    if (mongoose.isValidObjectId(id)) {
      console.log('Searching by ObjectId');
      user = await User.findById(id)
        .select('fullName userCode profileImageUrl faceImageUrl role verificationStatus createdAt phoneNumber email dateOfBirth address village city province postalCode occupation occupationCode')
        .lean();
      console.log('User found by ObjectId:', user?._id);
    }

    if (!user) {
      console.log('Searching by userCode');
      // Try to find by userCode
      user = await User.findOne({ userCode: id })
        .select('fullName userCode profileImageUrl faceImageUrl role verificationStatus createdAt phoneNumber email dateOfBirth address village city province postalCode occupation occupationCode')
        .lean();
      console.log('User found by userCode:', user?._id);
    }

    if (!user) {
      console.log('User not found with ID:', id);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // --- Find investor data ---
    console.log('Looking for investor with userId:', user._id);
    const investor = await Investor.findOne({ userId: user._id });
    console.log('Investor found:', investor?._id, 'Investments count:', investor?.investments?.length);

    if (!investor) {
      console.log('No investor found, returning empty data');
      return NextResponse.json({
        success: true,
        user: {
          _id: user._id,
          fullName: user.fullName,
          userCode: user.userCode,
          profileImageUrl: user.profileImageUrl,
          faceImageUrl: user.faceImageUrl,
          role: user.role,
          verificationStatus: user.verificationStatus,
          memberSince: user.createdAt,
          phoneNumber: user.phoneNumber,
          email: user.email,
          dateOfBirth: user.dateOfBirth,
          address: user.address,
          village: user.village,
          city: user.city,
          province: user.province,
          postalCode: user.postalCode,
          occupation: user.occupation,
          occupationCode: user.occupationCode,
          totalInvestment: 0,
          totalPlantInstances: 0,
          investments: [],
          plantInstances: []
        }
      });
    }

    // Get all plant instances for calculating profit shares
    const allPlantInstances = await PlantInstance.find({}).lean();
    const allInvestors = await Investor.find({}).lean();

    // Calculate total investment per plant instance from all investors
    const totalInvestByInstance = new Map<string, number>();
    for (const inv of allInvestors) {
      for (const iv of inv?.investments ?? []) {
        const pid = String(iv?.plantInstanceId ?? iv?.instanceId ?? "");
        if (!pid) continue;
        totalInvestByInstance.set(
          pid,
          (totalInvestByInstance.get(pid) || 0) + getAmount(iv)
        );
      }
    }

    // Create plant instance lookup map
    const plantById = new Map<string, any>();
    for (const p of allPlantInstances) {
      const pid = String(p?._id ?? "");
      if (pid) plantById.set(pid, p);
    }

    // Process user's investments
    const investments = (investor.investments ?? []).map((iv: any) => {
      const pid = String(iv?.plantInstanceId ?? iv?.instanceId ?? "");
      const plant = plantById.get(pid);
      const userAmount = getAmount(iv);
      const totalInstanceInvestment = totalInvestByInstance.get(pid) || 0;
      const sharePercentage = totalInstanceInvestment > 0 ?
        (userAmount / totalInstanceInvestment) * 100 : 0;

      let profitShare = 0;
      if (plant && totalInstanceInvestment > 0) {
        const plantNetProfit = netProfitOf(plant);
        profitShare = (plantNetProfit * userAmount) / totalInstanceInvestment;
      }

      return {
        id: iv?._id,
        plantInstanceId: pid,
        plantType: plant?.plantType || 'Unknown',
        instanceName: plant?.instanceName || 'Unknown Plant',
        amount: userAmount,
        sharePercentage: Number(sharePercentage.toFixed(2)),
        profitShare: Number(profitShare.toFixed(2)),
        investmentDate: iv?.createdAt || iv?.date,
        status: iv?.status || 'active'
      };
    });

    // Get unique plant instances user has invested in
    const userPlantInstanceIds = [...new Set(
      investments.map((iv: any) => iv.plantInstanceId).filter(Boolean)
    )];

    const userPlantInstances = userPlantInstanceIds.map((pid: any) => {
      const plant = plantById.get(pid);
      if (!plant) return null;

      const userInvestments = investments.filter((iv: any) => iv.plantInstanceId === pid);
      const totalUserInvestment = userInvestments.reduce((sum: number, iv: any) => sum + iv.amount, 0);
      const totalProfitShare = userInvestments.reduce((sum: number, iv: any) => sum + iv.profitShare, 0);

      // Combine all history data
      const allHistory = [
        // Plant instance general history
        ...(plant.history || []).map((h: any) => ({
          ...h,
          type: h.type || 'general',
          amount: h.amount || 0,
          date: h.date || h.createdAt || plant.createdAt,
          source: 'history'
        })),
        // Operational costs as history
        ...(plant.operationalCosts || []).map((cost: any) => ({
          id: cost.id,
          type: 'operational_cost',
          date: cost.date || cost.addedAt,
          description: cost.description,
          amount: -Math.abs(cost.amount), // Negative for costs
          addedBy: cost.addedBy,
          source: 'operational'
        })),
        // Income records as history
        ...(plant.incomeRecords || []).map((income: any) => ({
          id: income.id,
          type: 'income',
          date: income.date || income.addedAt,
          description: income.description,
          amount: Math.abs(income.amount), // Positive for income
          addedBy: income.addedBy,
          source: 'income'
        })),
        // User investments as history
        ...userInvestments.map((inv: any) => ({
          id: inv.id,
          type: 'investment',
          date: inv.investmentDate,
          description: `Investasi pada ${plant.instanceName}`,
          amount: inv.amount,
          source: 'investment'
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        _id: plant._id,
        id: plant.id,
        plantType: plant.plantType,
        instanceName: plant.instanceName,
        baseAnnualROI: plant.baseAnnualROI,
        location: plant.location,
        status: plant.status,
        fotoGambar: plant.fotoGambar,
        userTotalInvestment: totalUserInvestment,
        userProfitShare: Number(totalProfitShare.toFixed(2)),
        qrCode: plant.qrCode,
        createdAt: plant.createdAt,
        history: allHistory
      };
    }).filter(Boolean);

    const totalInvestment = investments.reduce((sum: any, iv: any) => sum + iv.amount, 0);
    const totalProfitShare = investments.reduce((sum: any, iv: any) => sum + iv.profitShare, 0);

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        userCode: user.userCode,
        profileImageUrl: user.profileImageUrl,
        faceImageUrl: user.faceImageUrl,
        role: user.role,
        verificationStatus: user.verificationStatus,
        memberSince: user.createdAt,
        phoneNumber: user.phoneNumber,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        village: user.village,
        city: user.city,
        province: user.province,
        postalCode: user.postalCode,
        occupation: user.occupation,
        occupationCode: user.occupationCode,
        totalInvestment: Number(totalInvestment.toFixed(2)),
        totalProfitShare: Number(totalProfitShare.toFixed(2)),
        totalPlantInstances: userPlantInstances.length,
        investments,
        plantInstances: userPlantInstances
      }
    });

  } catch (error) {
    console.error("Error fetching public user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}