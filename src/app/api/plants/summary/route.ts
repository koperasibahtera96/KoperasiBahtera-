import { ensureConnection } from "@/lib/utils/utils/database";
import { NextResponse } from "next/server";

// SESUAIKAN path model jika berbeda
import Investor from "@/models/Investor";
import PlantInstance from "@/models/PlantInstance";

export const dynamic = "force-dynamic";

type Lean<T> = T & { _id: any };

const toNum = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number" && isFinite(v)) return v;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? n : 0;
};

const yyyy = (d: Date) => d.getUTCFullYear();
const mm = (d: Date) => d.getUTCMonth(); // 0..11

function parseDate(v: any): Date | null {
  if (!v) return null;
  try {
    const dt =
      typeof v === "string" || typeof v === "number"
        ? new Date(v)
        : v instanceof Date
        ? v
        : null;
    if (!dt || isNaN(dt.getTime())) return null;
    return dt;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  await ensureConnection();

  const { searchParams } = new URL(req.url);
  const typeParam = (
    searchParams.get("type") ||
    searchParams.get("slug") ||
    searchParams.get("plantType") ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();
  const yearParam =
    Number(searchParams.get("year")) || new Date().getUTCFullYear();

  if (!typeParam) {
    return NextResponse.json(
      { error: "Query 'type' is required, e.g. /api/plants?type=jengkol" },
      { status: 400 }
    );
  }

  // 1) Ambil semua instance dengan plantType yang cocok
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
      incomeRecords?: Array<{ amount: number | string; date?: any }>;
      operationalCosts?: Array<{ amount: number | string; date?: any }>;
    }>
  >;

  const targetInsts = instances.filter(
    (x) => (x.plantType || "").toString().toLowerCase() === typeParam
  );
  const instIds = new Set(targetInsts.map((x) => String(x._id)));

  // peta nama -> id untuk fallback investasi yang simpan productName (instanceName)
  const instIdByName = new Map<string, string>();
  for (const pi of targetInsts) {
    if (pi.instanceName)
      instIdByName.set(String(pi.instanceName), String(pi._id));
  }

  // 2) Ambil semua investor + investasinya
  const investors = (await Investor.find(
    {},
    { name: 1, email: 1, investments: 1 }
  ).lean()) as Array<
    Lean<{ name?: string; email?: string; investments?: any[] }>
  >;

  // Per investor & per instance
  const investTotalByInvestor = new Map<string, number>();
  const investByInvestorPerInst = new Map<string, Map<string, number>>();
  let totalInvestment = 0;

  for (const inv of investors) {
    const uid = String(inv._id);
    for (const it of inv.investments || []) {
      const amount =
        toNum(it.amount) ||
        toNum(it.totalAmount) ||
        toNum(it.amountPaid) ||
        toNum(it.total) ||
        toNum(it.investmentAmount);
      if (amount <= 0) continue;

      // temukan instance id
      let instId: string | null = null;
      if (it.plantInstanceId) instId = String(it.plantInstanceId);
      else if (it.instanceId) instId = String(it.instanceId);
      else if (it.productName && instIdByName.has(String(it.productName))) {
        instId = instIdByName.get(String(it.productName))!;
      }

      // hanya yang termasuk tipe tanaman ini
      if (!instId || !instIds.has(instId)) continue;

      totalInvestment += amount;
      investTotalByInvestor.set(
        uid,
        (investTotalByInvestor.get(uid) || 0) + amount
      );

      if (!investByInvestorPerInst.has(instId))
        investByInvestorPerInst.set(instId, new Map());
      const m = investByInvestorPerInst.get(instId)!;
      m.set(uid, (m.get(uid) || 0) + amount);
    }
  }

  // 3) Hitung net profit per instance + per bulan & per tahun
  const netByInst = new Map<string, number>();
  const monthlyNet: number[] = Array.from({ length: 12 }, () => 0);
  const yearlyNet = new Map<number, number>();

  for (const inst of targetInsts) {
    const instId = String(inst._id);
    const income = (inst.incomeRecords || []).reduce((a, r) => {
      const d = parseDate((r as any).date);
      const amt = toNum((r as any).amount);
      if (d) {
        if (yyyy(d) === yearParam) monthlyNet[mm(d)] += amt;
        yearlyNet.set(yyyy(d), (yearlyNet.get(yyyy(d)) || 0) + amt);
      }
      return a + amt;
    }, 0);

    const cost = (inst.operationalCosts || []).reduce((a, r) => {
      const d = parseDate((r as any).date);
      const amt = toNum((r as any).amount);
      if (d) {
        if (yyyy(d) === yearParam) monthlyNet[mm(d)] -= amt;
        yearlyNet.set(yyyy(d), (yearlyNet.get(yyyy(d)) || 0) - amt);
      }
      return a + amt;
    }, 0);

    netByInst.set(instId, income - cost);
  }

  // 4) Total net profit agregat untuk tipe ini
  let netProfit = 0;
  for (const instId of instIds) netProfit += netByInst.get(instId) || 0;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

  // 5) Alokasi profit ke investor (proporsional porsi per instance)
  const profitByInvestor = new Map<string, number>();
  for (const [instId, perInvestor] of investByInvestorPerInst.entries()) {
    const instInvestTotal = Array.from(perInvestor.values()).reduce(
      (a, v) => a + v,
      0
    );
    const instNet = netByInst.get(instId) || 0;
    if (instInvestTotal <= 0 || instNet === 0) continue;
    for (const [uid, amt] of perInvestor.entries()) {
      const share = (amt / instInvestTotal) * instNet;
      profitByInvestor.set(uid, (profitByInvestor.get(uid) || 0) + share);
    }
  }

  // 6) Distribusi investasi per investor (untuk pie chart)
  const investorDistribution = Array.from(investTotalByInvestor.entries()).map(
    ([uid, amount]) => {
      const who = investors.find((x) => String(x._id) === uid);
      const label = who?.name || who?.email || uid;
      return { name: String(label), value: amount };
    }
  );

  // 7) Tabel bulanan (tahun terpilih) & tahunan (semua tahun yang ada)
  const MONTHS_ID = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const monthlyTable = monthlyNet.map((v, i) => ({
    monthIndex: i,
    monthLabel: MONTHS_ID[i],
    netProfit: v,
  }));

  const yearlyTable = Array.from(yearlyNet.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([y, v]) => ({ year: y, netProfit: v }));

  // 8) Tabel per investor (total investasi, total profit, ROI individu)
  const investorsTable = Array.from(investTotalByInvestor.entries()).map(
    ([uid, invAmt]) => {
      const who = investors.find((x) => String(x._id) === uid);
      const label = who?.name || who?.email || uid;
      const p = profitByInvestor.get(uid) || 0;
      const r = invAmt > 0 ? (p / invAmt) * 100 : 0;
      return {
        investorId: uid,
        name: label,
        totalInvestment: invAmt,
        totalProfit: p,
        roi: r,
      };
    }
  );

  // 9) Response sesuai kebutuhan halaman tanaman[id]
  return NextResponse.json(
    {
      type: typeParam,
      displayName: typeParam, // boleh dipakai untuk judul
      totals: {
        totalInvestment,
        netProfit,
        roi,
        investorsCount: investorsTable.length,
      },
      charts: {
        monthlyNetProfit: monthlyTable, // untuk "Net Profit Bulanan {year}"
        investorDistribution, // untuk "Distribusi Investasi per Investor"
      },
      tables: {
        monthly: monthlyTable, // jika halaman butuh tabel bulanan
        yearly: yearlyTable, // jika halaman butuh tabel tahunan
        investors: investorsTable, // tabel investor: investasi, profit, ROI individu
      },
    },
    { status: 200 }
  );
}
