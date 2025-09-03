// src/app/api/investors/[id]/route.ts
import { ensureConnection } from "@/lib/utils/utils/database";
import { Investor, PlantInstance, Transaction } from "@/models";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

function ym(d: string | Date) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}
function startOfYear(y: number) {
  return new Date(y, 0, 1);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const { id } = await params;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "rich";
    const year = Number.parseInt(
      url.searchParams.get("year") || new Date().getFullYear().toString()
    );

    const investor = await Investor.findOne({ userId: id });
    if (!investor)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Kumpulkan semua instance yang diinvest oleh investor
    // Use plantInstanceId (ObjectId) instead of productName for matching
    const plantInstanceIds: string[] = (investor.investments ?? [])
      .map((r: any) => r?.plantInstanceId)
      .filter(Boolean);

    const instances = await PlantInstance.find({
      _id: { $in: plantInstanceIds },
    }).lean();

    // Fallback income/expense bila embedded kosong → pakai Transaction
    const tx = await Transaction.find({
      plantInstanceId: { $in: plantInstanceIds.map(id => new mongoose.Types.ObjectId(id)) },
    }).lean();
    const txIncomeByInst: Record<string, number> = {};
    const txExpenseByInst: Record<string, number> = {};
    tx.forEach((t) => {
      const amt = Number(t.amount) || 0;
      const plantId = String(t.plantInstanceId);
      if (t.type === "income")
        txIncomeByInst[plantId] = (txIncomeByInst[plantId] || 0) + amt;
      else
        txExpenseByInst[plantId] = (txExpenseByInst[plantId] || 0) + amt;
    });

    // Total investasi per instance (untuk proporsi) - use plantInstanceId instead of productName
    const totalInvestByInst: Record<string, number> = {};
    (
      await Investor.find(
        { "investments.plantInstanceId": { $in: plantInstanceIds } },
        { investments: 1 }
      ).lean()
    ).forEach((iv) => {
      (iv.investments ?? []).forEach((r: any) => {
        if (!r?.plantInstanceId) return;
        const plantId = String(r.plantInstanceId);
        totalInvestByInst[plantId] =
          (totalInvestByInst[plantId] || 0) + (Number(r.totalAmount) || 0);
      });
    });

    // Map _id -> instance (use ObjectId instead of custom id)
    const instById = new Map<string, any>();
    instances.forEach((p) => instById.set(String(p._id), p));

    // ---------- Hitung investasi per item (profit/roi) dgn rumus lama ----------
    const investments = (investor.investments ?? [])
      .filter((r: any) => r.plantInstanceId) // Only include investments with plantInstanceId
      .map((r: any) => {
        const plantId = String(r.plantInstanceId);
        const inst = instById.get(plantId);
        const plantName = inst?.instanceName || r.productName || plantId;

      const incEmbedded = Array.isArray(inst?.incomeRecords)
        ? inst.incomeRecords.reduce(
            (s: number, it: any) => s + (Number(it.amount) || 0),
            0
          )
        : 0;
      const expEmbedded = Array.isArray(inst?.operationalCosts)
        ? inst.operationalCosts.reduce(
            (s: number, it: any) => s + (Number(it.amount) || 0),
            0
          )
        : 0;

      const totalIncome =
        incEmbedded || expEmbedded ? incEmbedded : txIncomeByInst[plantId] || 0;
      const totalExpense =
        incEmbedded || expEmbedded
          ? expEmbedded
          : txExpenseByInst[plantId] || 0;

      const amount = Number(r.totalAmount) || 0;
      const totalPlantInvest = totalInvestByInst[plantId] || 0;
      const share = totalPlantInvest > 0 ? amount / totalPlantInvest : 0;

      const profit = (totalIncome - totalExpense) * share;
      const roi = amount > 0 ? (profit / amount) * 100 : 0;
      const investDate = r.investmentDate
        ? new Date(r.investmentDate).toISOString().split("T")[0]
        : "";

      return {
        plantId, // This is now the ObjectId string
        plantName,
        amount,
        profit,
        roi,
        investDate,
        totalUang: amount + profit, // sama seperti total_uang lama (initial + net)
      };
    });

    const totalInvestment = investments.reduce(
      (s: number, it: any) => s + it.amount,
      0
    );
    const totalProfit = investments.reduce(
      (s: number, it: any) => s + it.profit,
      0
    );
    const overallROI =
      totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    const joinDate = investor.investments?.length
      ? new Date(
          Math.min(
            ...investor.investments.map((r: any) =>
              new Date(r.investmentDate || Date.now()).getTime()
            )
          )
        )
          .toISOString()
          .split("T")[0]
      : "";

    if (format === "membersLike") {
      return NextResponse.json({
        id: String(investor.userId),
        name: investor.name,
        email: investor.email,
        phone: investor.phoneNumber || "",
        location: "",
        joinDate,
        investments,
        totalInvestment,
        totalProfit,
        overallROI,
      });
    }

    // ---------- Pie data ----------
    const pie = investments.map((it: any) => ({
      name: it.plantName,
      value: it.amount,
    }));

    // ---------- Time-series bulanan (income/expense/profit), proporsional ----------
    const months: string[] = Array.from(
      { length: 12 },
      (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`
    );
    const monthly = months.map((m) => ({
      month: m,
      income: 0,
      expense: 0,
      profit: 0,
    }));

    for (const r of investor.investments ?? []) {
      if (!r.plantInstanceId) continue; // Skip investments without plantInstanceId
      const plantId = String(r.plantInstanceId);
      const inst = instById.get(plantId);
      const amount = Number(r.totalAmount) || 0;
      const totalPlantInvest = totalInvestByInst[plantId] || 0;
      const share = totalPlantInvest > 0 ? amount / totalPlantInvest : 0;

      // gunakan incomeRecords/operationalCosts dulu; sisanya fallback ke transactions
      const inc = Array.isArray(inst?.incomeRecords) ? inst.incomeRecords : [];
      const exp = Array.isArray(inst?.operationalCosts)
        ? inst.operationalCosts
        : [];

      inc.forEach((i: any) => {
        const yymm = ym(i.date);
        const recYear = new Date(i.date).getFullYear();
        if (recYear !== year) return;
        const row = monthly.find((x) => x.month === yymm);
        if (row) row.income += (Number(i.amount) || 0) * share;
      });
      exp.forEach((e: any) => {
        const yymm = ym(e.date);
        const recYear = new Date(e.date).getFullYear();
        if (recYear !== year) return;
        const row = monthly.find((x) => x.month === yymm);
        if (row) row.expense += (Number(e.amount) || 0) * share;
      });

      // fallback per-plant dari transactions bila embedded kosong
      if (inc.length === 0 && exp.length === 0) {
        tx.forEach((t) => {
          if (t.plantInstanceId !== plantId) return;
          const d = new Date(t.date || t.createdAt || startOfYear(year));
          if (d.getFullYear() !== year) return;
          const yymm = ym(d);
          const row = monthly.find((x) => x.month === yymm);
          const amt = (Number(t.amount) || 0) * share;
          if (!row) return;
          if (t.type === "income") row.income += amt;
          else row.expense += amt;
        });
      }
    }
    monthly.forEach((r) => (r.profit = r.income - r.expense));

    // ---------- Kirim juga detail instance untuk panel kelola ----------
    const instanceDetail = instances.map((inst) => ({
      id: String(inst._id), // Use ObjectId for frontend plant selection
      instanceName: inst.instanceName,
      incomeRecords: inst.incomeRecords || [],
      operationalCosts: inst.operationalCosts || [],
    }));

    return NextResponse.json({
      member: {
        id: String(investor.userId),
        name: investor.name,
        email: investor.email,
        phone: investor.phoneNumber || "",
        location: "",
        joinDate,
        totalInvestment,
        totalProfit,
        overallROI,
      },
      investments,
      pie,
      monthly,
      instances: instanceDetail,
      year,
    });
  } catch (e) {
    console.error("GET /api/investors/[id] rich error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
