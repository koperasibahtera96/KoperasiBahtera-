import { NextResponse, type NextRequest } from "next/server";
import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance, Investor, User } from "@/models";

// angka aman
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// util: ambil kandidat kode blok/paket dari sebuah investment record
function pickProductName(iv: any): string | undefined {
  const direct =
    iv?.productName ||
    iv?.productCode ||
    iv?.blockCode ||
    iv?.packageCode ||
    iv?.packageName;

  if (direct && String(direct).trim()) return String(direct).trim();

  // fallback: coba ekstrak "kav-001" atau "KAV 001" dari qrCode / deskripsi
  const text = [iv?.qrCode, iv?.description, iv?.note, iv?.name]
    .filter(Boolean)
    .map((x: any) => String(x))
    .join(" ");
  if (text) {
    const m = text.match(/kav[\s\-_.]*\d+/i);
    if (m) return m[0].replace(/\s+/g, "-").toUpperCase(); // ex: "KAV-001"
  }
  return undefined;
}

export async function GET(_req: NextRequest) {
  try {
    await ensureConnection();

    // 1) semua plants
    const plants = await PlantInstance.find({}).lean();

    // 2) semua investor (ambil field yang perlu)
    const investors = await Investor.find({})
      .select({ userId: 1, investments: 1 })
      .lean();

    // 3) lookup user (ambil userCode untuk No Anggota & nama)
    const userIds: string[] = Array.from(
      new Set(investors.map((i: any) => String(i.userId || "")).filter(Boolean))
    );
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select({
            _id: 1,
            userCode: 1,
            name: 1,
            fullName: 1,
            username: 1,
            email: 1,
          })
          .lean()
      : [];
    const userMap = new Map<
      string,
      { userCode?: string; displayName?: string }
    >();
    for (const u of users) {
      const displayName =
        (u as any).name ||
        (u as any).fullName ||
        (u as any).username ||
        (u as any).email ||
        "";
      userMap.set(String((u as any)._id), {
        userCode: (u as any).userCode,
        displayName,
      });
    }

    // 4) bangun meta per plantInstanceId
    type Meta = {
      memberCode?: string; // No Anggota
      ownerName?: string;  // Nama User
      productName?: string; // Kode Blok/Paket
    };
    const metaByPlantId = new Map<string, Meta>();

    for (const inv of investors) {
      const uid = String(inv.userId || "");
      const uMeta = userMap.get(uid) || {};
      const memberCode = uMeta.userCode;
      const ownerName = uMeta.displayName;

      const ivs = Array.isArray((inv as any).investments)
        ? (inv as any).investments
        : [];

      for (const iv of ivs) {
        const pid = String(iv?.plantInstanceId || iv?.instanceId || "");
        if (!pid) continue;

        const current = metaByPlantId.get(pid);
        const candidateName = pickProductName(iv);

        if (!current) {
          metaByPlantId.set(pid, {
            memberCode,
            ownerName,
            productName: candidateName,
          });
        } else {
          // jangan timpa jika sudah ada nilai yang tidak kosong
          if (!current.memberCode && memberCode) current.memberCode = memberCode;
          if (!current.ownerName && ownerName) current.ownerName = ownerName;
          if (!current.productName && candidateName)
            current.productName = candidateName;
        }
      }
    }

    // 5) gabungkan dengan plants
    const result = plants.map((p: any) => {
      const pid = String(p?._id || p?.id || "");
      const meta = metaByPlantId.get(pid) || {};

      const id = p?.id || p?._id?.toString?.() || pid;

      return {
        // ---- field bawaan plant instance ----
        _id: p._id,
        id,
        instanceName: p.instanceName || p.name || id,
        plantType: p.plantType || "-",
        contractNumber: p.contractNumber || undefined,
        owner: p.owner || meta.ownerName || undefined,
        qrCode: p.qrCode,
        incomeRecords: (p.incomeRecords || []).map((r: any) => ({
          id: r?.id || r?._id?.toString?.() || undefined, // Kode Transaksi
          _id: r?._id,
          date: r?.date,
          description: r?.description,
          amount: num(r?.amount),
          addedBy: r?.addedBy || undefined,
        })),
        operationalCosts: (p.operationalCosts || []).map((r: any) => ({
          id: r?.id || r?._id?.toString?.() || undefined, // Kode Transaksi
          _id: r?._id,
          date: r?.date,
          description: r?.description,
          amount: num(r?.amount),
          addedBy: r?.addedBy || undefined,
        })),

        // ---- meta tambahan ----
        memberCode: meta.memberCode || undefined,   // No Anggota
        productName: meta.productName || p.qrCode,       // Kode Blok/Paket
        ownerFromUser: meta.ownerName || undefined, // Nama User (dari users)
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/plants-with-meta error:", err);
    return NextResponse.json(
      { error: "Failed to fetch plants with meta" },
      { status: 500 }
    );
  }
}
