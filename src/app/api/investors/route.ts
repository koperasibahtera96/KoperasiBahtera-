import { ensureConnection } from "@/lib/utils/database";
import { Investor } from "@/models";
import { NextRequest, NextResponse } from "next/server";

// ambil nominal investasi dari berbagai kemungkinan field
const amt = (iv: any) =>
  Number(iv?.totalAmount ?? iv?.amountPaid ?? iv?.amount ?? 0);

export async function GET(req: NextRequest) {
  try {
    await ensureConnection();

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    const investors = await Investor.find({}).lean();

    if (format === "membersLike") {
      // Bentuk yang dipakai UI manajemen-anggota
      const mapped = investors.map((m: any) => {
        const invs = Array.isArray(m?.investments) ? m.investments : [];
        const investments = invs.map((iv: any) => ({
          plantId: String(iv?.plantInstanceId ?? iv?.instanceId ?? ""),
          plantName: String(
            iv?.productName ?? iv?.plantName ?? iv?.name ?? "—"
          ),
          amount: amt(iv),
          profit: 0,
          roi: 0,
          investmentId: String(iv?.investmentId ?? ""),
          investDate: String(
            iv?.investmentDate ?? iv?.createdAt ?? m?.createdAt ?? new Date()
          ),
        }));

        // ✅ selalu dari SUM investments (jangan pakai m.totalInvestasi)
        const totalInvestment = investments.reduce(
          (s: number, x: any) => s + (x.amount || 0),
          0
        );

        return {
          id: String(m?._id ?? m?.id),
          name: m?.name ?? m?.fullName ?? "Tanpa Nama",
          email: m?.email ?? "",
          phone: m?.phoneNumber ?? m?.phone ?? "",
          location: m?.location ?? "",
          joinDate: String(m?.createdAt ?? new Date()),
          investments,
          totalInvestment,
          totalProfit: 0,
          overallROI: 0,
        };
      });

      return NextResponse.json(mapped);
    }

    // default: raw investors
    return NextResponse.json(investors);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch investors" },
      { status: 500 }
    );
  }
}
