// src/app/api/finance/summary/route.ts
import { NextResponse } from "next/server";
import { ensureConnection } from "@/lib/utils/utils/database";

// ⬇️ Ganti path ini jika modelmu berbeda
import Investor from "@/models/Investor";
import PlantInstance from "@/models/PlantInstance";

export const dynamic = "force-dynamic";

type Lean<T> = T & { _id: any };

// util angka aman
const num = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number" && isFinite(v)) return v;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? n : 0;
};
const sumAmount = (arr: any[] = []) => arr.reduce((a, r) => a + num(r?.amount), 0);

export async function GET() {
  await ensureConnection();

  // 1) PlantInstance → hitung net profit per instance (income - cost)
  const instances = (await PlantInstance.find(
    {},
    {
      _id: 1,
      plantType: 1,
      instanceName: 1,
      treeCount: 1,
      incomeRecords: 1,
      operationalCosts: 1,
    }
  ).lean()) as Array<
    Lean<{
      plantType?: string;
      instanceName?: string;
      treeCount?: number;
      incomeRecords?: Array<{ amount: number | string }>;
      operationalCosts?: Array<{ amount: number | string }>;
    }>
  >;

  const netByInst = new Map<string, number>();
  const instIdByName = new Map<string, string>();
  for (const pi of instances) {
    const income = sumAmount(pi.incomeRecords);
    const cost = sumAmount(pi.operationalCosts);
    netByInst.set(String(pi._id), income - cost);
    if (pi.instanceName) instIdByName.set(String(pi.instanceName), String(pi._id));
  }

  // 2) Investor.investments → total investasi & distribusi
  const investors = (await Investor.find(
    {},
    { investments: 1, status: 1 }
  ).lean()) as Array<Lean<{ status?: string; investments?: any[] }>>;

  type InvRow = {
    userId: string;
    instKey: string; // _id PlantInstance
    plantType: string;
    amount: number;
  };
  const invRows: InvRow[] = [];

  for (const inv of investors) {
    const uid = String(inv._id);
    for (const it of inv.investments || []) {
      // ambil nominal dari berbagai kemungkinan field
      const amount =
        num(it.amount) ||
        num(it.totalAmount) ||
        num(it.amountPaid) ||
        num(it.total) ||
        num(it.investmentAmount);
      if (amount <= 0) continue;

      // referensi instance
      let instKey: string | null = null;
      if (it.plantInstanceId) instKey = String(it.plantInstanceId);
      else if (it.instanceId) instKey = String(it.instanceId);
      else if (it.productName && instIdByName.has(String(it.productName))) {
        instKey = instIdByName.get(String(it.productName))!;
      }
      if (!instKey) continue;

      const pi = instances.find((x) => String(x._id) === instKey);
      const plantType = (pi?.plantType || "lainnya").toString().toLowerCase();

      invRows.push({ userId: uid, instKey, plantType, amount });
    }
  }

  // 3) Total investasi
  const totalInvestment = invRows.reduce((a, r) => a + r.amount, 0);

  // total investasi per instance
  const investByInst = new Map<string, number>();
  for (const r of invRows) {
    investByInst.set(r.instKey, (investByInst.get(r.instKey) || 0) + r.amount);
  }

  // 4) Profit total (agregat sistem) = jumlah net semua instance yg punya investasi
  let totalProfit = 0;
  const profitByType = new Map<string, number>();
  for (const [instKey] of investByInst) {
    const net = netByInst.get(instKey) || 0;
    totalProfit += net;

    const type = (instances.find((x) => String(x._id) === instKey)?.plantType || "lainnya")
      .toString()
      .toLowerCase();
    profitByType.set(type, (profitByType.get(type) || 0) + net);
  }

  const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

  // 5) Distribusi investasi per jenis tanaman
  const investByType = new Map<string, number>();
  for (const r of invRows) {
    investByType.set(r.plantType, (investByType.get(r.plantType) || 0) + r.amount);
  }
  const distribution = Array.from(investByType.entries()).map(([name, value]) => ({ name, value }));

  // 6) Top Investasi Tanaman
  const topPlantTypes = Array.from(investByType.entries()).map(([type, totalInv]) => {
    const insts = instances.filter(
      (pi) => (pi.plantType || "lainnya").toString().toLowerCase() === type
    );
    const treeCount = insts.reduce((a, pi) => a + num(pi.treeCount), 0);
    const activeInvestors = new Set(invRows.filter((r) => r.plantType === type).map((r) => r.userId)).size;
    const paidProfit = profitByType.get(type) || 0;
    const tRoi = totalInv > 0 ? (paidProfit / totalInv) * 100 : 0;

    return {
      type,
      totalInvestment: totalInv,
      paidProfit,
      roi: tRoi,
      treeCount,
      activeInvestors,
    };
  });
  topPlantTypes.sort((a, b) => b.totalInvestment - a.totalInvestment);

  // 7) Jumlah anggota
  const totalMembers =
    (await Investor.countDocuments().catch(() => 0)) || investors.length;

  // 8) Response + alias kunci untuk kompatibilitas UI
  return NextResponse.json(
    {
      totals: {
        // kunci utama
        investment: totalInvestment,
        profit: totalProfit,
        roi,
        members: totalMembers,
        // alias agar komponen lama langsung kebaca
        totalInvestment,
        totalProfit,
        roiPercent: roi,
        totalMembers,
        membersCount: totalMembers,
      },
      distribution,
      topPlantTypes,
    },
    { status: 200 }
  );
}
