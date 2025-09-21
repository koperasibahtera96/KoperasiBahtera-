import { ensureConnection } from "@/lib/utils/database";
import { Investor, PlantInstance } from "@/models";
import { NextResponse } from "next/server";

const amt = (iv: any) =>
  Number(iv?.totalAmount ?? iv?.amountPaid ?? iv?.amount ?? 0);

const netOf = (p: any) => {
  const income = (p?.incomeRecords ?? []).reduce(
    (s: number, i: any) => s + Number(i?.amount || 0),
    0
  );
  const cost = (p?.operationalCosts ?? []).reduce(
    (s: number, c: any) => s + Number(c?.amount || 0),
    0
  );
  return income - cost;
};

export async function GET() {
  try {
    await ensureConnection();

    const [investors, plants] = await Promise.all([
      Investor.find({}).lean(),
      PlantInstance.find({}).lean(),
    ]);

    // net profit per instance
    const netById = new Map<string, number>();
    for (const p of plants) {
      const pid = String(p?._id ?? p?.id ?? "");
      if (!pid) continue;
      netById.set(pid, netOf(p));
    }

    // total investasi semua investor per instance (untuk pembagian profit)
    const investById = new Map<string, number>();
    for (const m of investors) {
      for (const iv of m?.investments ?? []) {
        const pid = String(iv?.plantInstanceId ?? iv?.instanceId ?? "");
        const a = amt(iv);
        if (!pid || !a) continue;
        investById.set(pid, (investById.get(pid) || 0) + a);
      }
    }

    // metrik per-anggota
    let totalInvestmentAll = 0;
    let totalProfitAll = 0;

    const members = investors.map((m: any) => {
      const invs = Array.isArray(m?.investments) ? m.investments : [];

      // ✅ selalu dihitung dari daftar investasi (jangan pakai m.totalInvestasi)
      const totalInvestment = invs.reduce((s: number, iv: any) => s + amt(iv), 0);

      let totalProfit = 0;
      for (const iv of invs) {
        const pid = String(iv?.plantInstanceId ?? iv?.instanceId ?? "");
        const a = amt(iv);
        if (!a) continue;
        const net = netById.get(pid) || 0;
        const totalInst = investById.get(pid) || 0;
        const share = totalInst > 0 ? a / totalInst : 0;
        totalProfit += net * share;
      }

      totalInvestmentAll += totalInvestment;
      totalProfitAll += totalProfit;

      const roi =
        totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

      return {
        id: String(m?._id ?? m?.id),
        name: m?.name ?? "",
        totalInvestment: Math.round(totalInvestment),
        totalProfit: Math.round(totalProfit),
        roi,
      };
    });

    const avgROI =
      members.length > 0
        ? members.reduce((s, x) => s + (x.roi || 0), 0) / members.length
        : 0;

    return NextResponse.json({
      totals: {
        totalInvestment: Math.round(totalInvestmentAll),
        totalProfit: Math.round(totalProfitAll),
        avgROI,
        membersCount: members.length,
      },
      members,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to build summary" },
      { status: 500 }
    );
  }
}
