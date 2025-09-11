// src/app/api/daily-incoming-investor/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB || "investasi-hijau"; // <- sesuaikan bila perlu
let client: MongoClient | null = null;

async function getClient() {
  if (client && (client as any).topology?.isConnected?.()) return client;
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const month = searchParams.get("month") ? Number(searchParams.get("month")) : null; // 1..12 or null
    const day = searchParams.get("day") ? Number(searchParams.get("day")) : null;       // 1..31 or null
    const q = (searchParams.get("q") || "").trim().toLowerCase(); // search by investmentId

    // Buat rentang tanggal UTC
    let start: Date;
    let end: Date;
    if (year && month && day) {
      // per hari
      start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
    } else if (year && month) {
      // per bulan
      start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    } else {
      // per tahun
      start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
      end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
    }

    const cli = await getClient();
    const db = cli.db(DB_NAME);
    const col = db.collection("investors");

    const investors = await col
      .find(
        {},
        {
          projection: {
            _id: 1,
            name: 1,
            email: 1,
            status: 1,
            investments: 1,
          },
        }
      )
      .toArray();

    type Row = {
      investorId: string;
      investorName?: string;
      investmentId: string;
      productName?: string;
      plantInstanceId?: string;
      paymentType?: string;
      status?: string;
      totalAmount: number;
      amountPaid: number;
      date?: string; // ISO
    };

    const rows: Row[] = [];
    for (const inv of investors) {
      const invName = inv.name;
      const invId = String(inv._id);
      const arr: any[] = Array.isArray(inv.investments) ? inv.investments : [];
      for (const it of arr) {
        const iso =
          it.investmentDate || it.contractSignedDate || it.createdAt || null;
        const d = iso ? new Date(iso) : null;
        if (!d) continue;
        if (!(d >= start && d < end)) continue;

        const investmentId = String(it.investmentId || "");
        if (q && !investmentId.toLowerCase().includes(q)) continue;

        rows.push({
          investorId: invId,
          investorName: invName,
          investmentId,
          productName: it.productName,
          plantInstanceId: it.plantInstanceId,
          paymentType: (it.paymentType || "").replace(/[, ]+$/g, "").toLowerCase(),
          status: (it.status || "").replace(/[, ]+$/g, "").toLowerCase(),
          totalAmount: Number(it.totalAmount || 0),
          amountPaid: Number(it.amountPaid || 0),
          date: d.toISOString(),
        });
      }
    }

    // Agregasi sesuai aturan
    let totalMasuk = 0;
    let totalSudahDibayar = 0;
    let totalSisaCicilan = 0;

    for (const r of rows) {
      const isCicilan = r.paymentType === "cicilan" && r.status === "active";
      const isFullCompleted = r.paymentType === "full" && r.status === "completed";

      if (isCicilan) {
        totalMasuk += r.totalAmount;
        totalSudahDibayar += r.amountPaid;
        totalSisaCicilan += Math.max(0, r.totalAmount - r.amountPaid);
      } else if (isFullCompleted) {
        totalMasuk += r.totalAmount;
        totalSudahDibayar += r.amountPaid;
      }
      // investasi yang belum memenuhi dua kategori di atas tidak dihitung ke total
    }

    return NextResponse.json({
      year,
      month,
      day,
      query: q || null,
      summary: {
        totalPemasukan: totalMasuk,
        totalSudahDibayar: totalSudahDibayar,
        totalBelumDibayar: totalSisaCicilan,
        transaksi: rows.length,
      },
      rows,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch daily incoming investor" },
      { status: 500 }
    );
  }
}
