import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance } from "@/models";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// sumber: koleksi 'plants'
const LegacyPlantSchema = new mongoose.Schema(
  {
    id: Number,
    name: String,
    qrCode: String,
    owner: String,
    fotoGambar: String,
    memberId: String,
    contractNumber: String,
    location: String,
    plantType: String,
    status: String,
    lastUpdate: String,
    history: [mongoose.Schema.Types.Mixed],
  },
  { collection: "plants", strict: false }
);
const LegacyPlant =
  mongoose.models.__legacy_plants ||
  mongoose.model("__legacy_plants", LegacyPlantSchema);

function chooseType(name?: string, ptype?: string) {
  const n = (name || "").toLowerCase();
  const t = (ptype || "").toLowerCase();
  if (n.includes("alpukat") || t.includes("alpukat")) return "alpukat";
  if (n.includes("gaharu") || t.includes("gaharu")) return "gaharu";
  if (n.includes("jengkol") || t.includes("jengkol")) return "jengkol";
  if (n.includes("aren") || t.includes("aren")) return "aren";
  return "alpukat";
}
const randROI = () => Number((0.1 + Math.random() * 0.1).toFixed(3)); // 0.100–0.200

async function runMigration(dry: boolean) {
  await ensureConnection();
  const src = await LegacyPlant.find({}).lean();

  let upserted = 0;
  const sample: any[] = [];

  for (const p of src) {
    const toId = String(p.id ?? p._id?.toString());

    const doc: any = {
      id: toId,
      plantType: chooseType(p.name, p.plantType),
      instanceName: p.name,
      baseAnnualROI: randROI(),
      // selalu kosong dulu
      operationalCosts: [],
      incomeRecords: [],

      // FIELD TAMBAHAN dari 'plants'
      qrCode: p.qrCode,
      owner: p.owner,
      fotoGambar: p.fotoGambar,
      memberId: p.memberId,
      contractNumber: p.contractNumber,
      location: p.location,
      status: p.status,
      lastUpdate: p.lastUpdate,
      history: Array.isArray(p.history) ? p.history : [],
    };

    if (!dry) {
      // upsert: kalau ada -> update, kalau belum ada -> insert
      await PlantInstance.updateOne(
        { id: toId },
        { $set: doc },
        { upsert: true }
      );
    }

    upserted++;
    if (sample.length < 10)
      sample.push({ from: p.id, to: toId, type: doc.plantType });
  }

  return {
    ok: true,
    dryRun: dry,
    totalSource: src.length,
    upserted,
    sample,
  };
}

export async function GET(req: NextRequest) {
  try {
    const dry = new URL(req.url).searchParams.get("dry") === "1";
    const result = await runMigration(dry);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Migration failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dry = Boolean(body?.dry);
    const result = await runMigration(dry);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Migration failed" },
      { status: 500 }
    );
  }
}
