// src/app/api/daily-incoming-investor/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Investor } from "@/models";

function parseISODateOnly(iso: string) {
  // iso diharap "yyyy-mm-dd"
  const [y, m, d] = iso.split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  return { y, m, d };
}

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    // ====== PARAM BARU: startDate / endDate (prioritas jika ada) ======
    const startDateStr = (searchParams.get("startDate") || "").trim(); // "yyyy-mm-dd" | ""
    const endDateStr   = (searchParams.get("endDate")   || "").trim(); // "yyyy-mm-dd" | ""
    const hasRange = !!(startDateStr || endDateStr);

    // ====== PARAM LAMA (fallback) ======
    const year  = Number(searchParams.get("year")) || new Date().getFullYear();
    const month = searchParams.get("month") ? Number(searchParams.get("month")) : null; // 1..12 | null
    const day   = searchParams.get("day")   ? Number(searchParams.get("day"))   : null; // 1..31 | null

    const q = (searchParams.get("q") || "").trim().toLowerCase(); // search by investmentId

    // ====== Bangun rentang tanggal UTC ======
    // Catatan:
    // - Untuk "range" (startDate/endDate) dipakai inclusive start, exclusive end+1 hari.
    // - Untuk fallback year/month/day tetap seperti semula.
    let start: Date | null = null;
    let end: Date | null = null;

    if (hasRange) {
      // PRIORITAS: startDate / endDate (gaya bank)
      if (startDateStr) {
        const p = parseISODateOnly(startDateStr);
        if (p) start = new Date(Date.UTC(p.y, p.m - 1, p.d, 0, 0, 0, 0));
      }
      if (endDateStr) {
        const p = parseISODateOnly(endDateStr);
        if (p) {
          // exclusive: tambah 1 hari dari endDate 00:00
          end = new Date(Date.UTC(p.y, p.m - 1, p.d + 1, 0, 0, 0, 0));
        }
      }
    } else {
      // Fallback ke logic lama (year/month/day)
      if (year && month && day) {
        // per hari
        start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        end   = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
      } else if (year && month) {
        // per bulan
        start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        end   = new Date(Date.UTC(year, month, 1, 0, 0, 0));
      } else {
        // per tahun
        start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
        end   = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
      }
    }

    const investors = await Investor.find(
      {},
      {
        _id: 1,
        name: 1,
        email: 1,
        status: 1,
        investments: 1,
      }
    ).lean();

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
      // biar kompatibel ke depan kalau mau dipakai export-helper:
      orderId?: string;
      userId?: string;
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

        // ====== Filter tanggal ======
        // Jika pakai range: (start && d < start) skip; (end && d >= end) skip
        // Jika fallback: keduanya pasti ada (start & end)
        if (start && d < start) continue;
        if (end && d >= end) continue;

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

          // opsional bila belakang butuh:
          orderId: it.orderId || undefined,
          userId: inv.userId || inv._id?.toString?.() || undefined,
        });
      }
    }

    // ====== Agregasi sesuai aturan lama ======
    let totalMasuk = 0;
    let totalSudahDibayar = 0;
    let totalSisaCicilan = 0;

    for (const r of rows) {
      const isCicilan = r.paymentType === "cicilan" && r.status === "active";
      const isFullCompleted =
        r.paymentType === "full" && r.status === "completed";

      if (isCicilan) {
        totalMasuk += r.totalAmount;
        totalSudahDibayar += r.amountPaid;
        totalSisaCicilan += Math.max(0, r.totalAmount - r.amountPaid);
      } else if (isFullCompleted) {
        totalMasuk += r.totalAmount;
        totalSudahDibayar += r.amountPaid;
      }
      // investasi lain tidak dihitung
    }

    return NextResponse.json({
      // Kembalikan info periode agar UI mudah menampilkan label:
      range: hasRange
        ? {
            startDate: startDateStr || null,
            endDate: endDateStr || null,
          }
        : null,
      year: hasRange ? null : year,
      month: hasRange ? null : month,
      day: hasRange ? null : day,
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
