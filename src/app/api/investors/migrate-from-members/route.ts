import { ensureConnection } from "@/lib/utils/database";
import { Investor, Member } from "@/models"; // tidak pakai User lagi
import { NextResponse } from "next/server";

function trimComma(s?: string) {
  if (!s || typeof s !== "string") return s;
  return s.replace(/,+\s*$/, "").trim();
}

export async function POST() {
  try {
    await ensureConnection();

    const members = await Member.find({}).lean();

    let inserted = 0;
    let updated = 0;

    for (const m of members) {
      const name = trimComma(m.name);
      const email = trimComma(m.email) || "";
      const phone = trimComma(m.phone);
      const memberId = trimComma(m.id); // dipakai untuk investmentId (sesuai instruksi)

      // ---- mapping investments dari members ----
      const investments = (m.investments ?? []).map((r: any) => {
        const productName = trimComma(r.plantInstanceId); // ex: "gaharu-001"
        return {
          investmentId: memberId, // = id di koleksi members
          productName, // = plantInstanceId (string)
          plantInstanceId: String(r._id), // = _id subdoc investments
          totalAmount: Number(r.amount) || 0,
          amountPaid: Number(r.amount) || 0,
          paymentType: "full", // "lunas"
          status: "active",
          investmentDate: new Date(r.startDate), // sama dengan startDate
        };
      });

      const totalInvestasi = investments.reduce(
        (sum: number, it: any) => sum + it.totalAmount,
        0
      );

      // >>>> PENTING: userId diisi dari _id members (ObjectId)
      const payload: any = {
        userId: m._id, // <— sesuai permintaan
        name,
        email,
        phoneNumber: phone,
        jumlahPohon: 0,
        status: "active",
        investments,
        totalInvestasi,
        totalPaid: totalInvestasi,
        // pertahankan cap waktu dari members (opsional tapi sesuai permintaan)
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      };

      // Upsert by userId (unique di schema Investor)
      const existing = await Investor.findOne({ userId: m._id }).lean();
      if (existing) {
        await Investor.updateOne({ userId: m._id }, { $set: payload });
        updated++;
      } else {
        await Investor.create(payload);
        inserted++;
      }
    }

    return NextResponse.json({ inserted, updated });
  } catch (err) {
    console.error("Migrate members->investors error:", err);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
