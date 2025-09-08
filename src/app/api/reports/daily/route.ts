// src/app/api/reports/daily/route.ts
import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance } from "@/models";
import { NextRequest, NextResponse } from "next/server";

type Entry = {
  kind: "income" | "expense";
  date: string;
  amount: number;
  description: string;
  plantInstanceId: string;
  instanceName: string;
  plantType: string;
  addedBy?: string | null;
};

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function toYmd(d: any): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}
function inRange(ymd: string, from: string, to: string) {
  if (!ymd) return false;
  return ymd >= from && ymd <= to;
}

export async function GET(req: NextRequest) {
  try {
    await ensureConnection();
    const url = new URL(req.url);
    const q = url.searchParams;

    // support both ?date=YYYY-MM-DD or ?from&to
    const date = q.get("date");
    const from = q.get("from") || date;
    const to = q.get("to") || date;

    const fromY = from ? toYmd(from) : toYmd(new Date());
    const toY = to ? toYmd(to) : fromY;

    const plants = await PlantInstance.find(
      {},
      { incomeRecords: 1, operationalCosts: 1, plantType: 1, instanceName: 1 }
    ).lean();

    const entries: Entry[] = [];

    for (const p of plants) {
      const plantType = (p as any)?.plantType ?? "";
      const instanceName = (p as any)?.instanceName ?? "";
      const pid = String((p as any)?._id ?? "");

      // incomes
      const incomes: any[] = Array.isArray((p as any)?.incomeRecords)
        ? (p as any).incomeRecords
        : [];
      for (const r of incomes) {
        const ymd = toYmd(r?.date);
        if (!inRange(ymd, fromY, toY)) continue;
        entries.push({
          kind: "income",
          date: ymd,
          amount: n(r?.amount),
          description: r?.description ?? "Pendapatan",
          plantInstanceId: pid,
          instanceName,
          plantType,
          addedBy: r?.addedBy ?? null,
        });
      }

      // costs
      const costs: any[] = Array.isArray((p as any)?.operationalCosts)
        ? (p as any).operationalCosts
        : [];
      for (const c of costs) {
        const ymd = toYmd(c?.date);
        if (!inRange(ymd, fromY, toY)) continue;
        entries.push({
          kind: "expense",
          date: ymd,
          amount: n(c?.amount),
          description: c?.description ?? "Biaya Operasional",
          plantInstanceId: pid,
          instanceName,
          plantType,
          addedBy: c?.addedBy ?? null,
        });
      }
    }

    // sort by date (ASC) lalu income di atas expense
    entries.sort((a, b) =>
      a.date === b.date
        ? a.kind > b.kind
          ? -1
          : 1
        : a.date.localeCompare(b.date)
    );

    const totalIncome = entries
      .filter((e) => e.kind === "income")
      .reduce((s, e) => s + e.amount, 0);
    const totalExpense = entries
      .filter((e) => e.kind === "expense")
      .reduce((s, e) => s + e.amount, 0);
    const net = totalIncome - totalExpense;

    const byPlantTypeMap = new Map<
      string,
      { plantType: string; income: number; expense: number; net: number }
    >();
    for (const e of entries) {
      const key = e.plantType || "tanpa-jenis";
      if (!byPlantTypeMap.has(key))
        byPlantTypeMap.set(key, {
          plantType: key,
          income: 0,
          expense: 0,
          net: 0,
        });
      const agg = byPlantTypeMap.get(key)!;
      if (e.kind === "income") agg.income += e.amount;
      else agg.expense += e.amount;
      agg.net = agg.income - agg.expense;
    }
    const byPlantType = Array.from(byPlantTypeMap.values()).sort(
      (a, b) => b.net - a.net
    );

    return NextResponse.json({
      range: { from: fromY, to: toY },
      totals: { income: totalIncome, expense: totalExpense, net },
      byPlantType,
      entries,
    });
  } catch (err) {
    console.error("[reports/daily] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
