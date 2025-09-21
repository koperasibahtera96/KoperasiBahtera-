// src/app/api/finance/daily-export-helper/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import mongoose, { Schema, Model, models } from "mongoose";

export const runtime = "nodejs";

// ---------- Mongo connection ----------
async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    "";
  if (!uri) throw new Error("Env MONGODB_URI tidak ditemukan.");

  if (!(global as any)._mongoConn) {
    (global as any)._mongoConn = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || undefined,
    });
  }
  await (global as any)._mongoConn;
}

// ---------- Minimal models (hanya field yang dipakai) ----------
type TUser = {
  _id: any;
  userCode?: string; // <-- No Anggota
};

type TPlantInstance = {
  _id: any;
  contractNumber?: string; // orderId
  kavling?: string;
  kavlingCode?: string;
  qrCode?: string;
  qrcode?: string;
  incomeRecords?: Array<{ qrCode?: string; qrcode?: string }>;
  instanceName?: string;
  plantType?: string;
};

let UserModel: Model<TUser>;
let PlantInstanceModel: Model<TPlantInstance>;

function ensureModels() {
  if (!models._DailyExportUser) {
    const userSchema = new Schema<TUser>(
      {
        userCode: String,
      },
      { strict: false, collection: "users" }
    );
    UserModel = mongoose.model<TUser>("_DailyExportUser", userSchema);
  } else {
    UserModel = models._DailyExportUser;
  }

  if (!models._DailyExportPlant) {
    const plantSchema = new Schema<TPlantInstance>(
      {
        contractNumber: String,
        kavling: String,
        kavlingCode: String,
        qrCode: String,
        qrcode: String,
        incomeRecords: [
          new Schema(
            { qrCode: String, qrcode: String },
            { _id: false }
          ),
        ],
        instanceName: String,
        plantType: String,
      },
      { strict: false, collection: "plantinstances" }
    );
    PlantInstanceModel = mongoose.model<TPlantInstance>(
      "_DailyExportPlant",
      plantSchema
    );
  } else {
    PlantInstanceModel = models._DailyExportPlant;
  }
}

// ---------- Utils ----------
const pickProductName = (p?: TPlantInstance | null) => {
  if (!p) return undefined;
  const fromIncome =
    p.incomeRecords && p.incomeRecords.length
      ? p.incomeRecords[0]?.qrCode || p.incomeRecords[0]?.qrcode
      : undefined;
  return p.qrCode || p.qrcode || fromIncome || p.instanceName || p.plantType;
};

const pickKavling = (p?: TPlantInstance | null) =>
  p?.kavling || p?.kavlingCode || undefined;

// ---------- POST ----------
/**
 * body:
 *  { userIds: string[], orderIds: string[] }
 * return:
 *  {
 *    memberCodes: Record<userId, string>,            // No Anggota (users.userCode)
 *    plantByOrder: Record<orderId, { kavling?: string; productName?: string }>
 *  }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userIds: string[] = Array.isArray(body?.userIds) ? body.userIds : [];
    const orderIds: string[] = Array.isArray(body?.orderIds)
      ? body.orderIds
      : [];

    if (!userIds.length && !orderIds.length) {
      return NextResponse.json(
        { error: "userIds atau orderIds harus diisi (array)" },
        { status: 400 }
      );
    }

    await connectMongo();
    ensureModels();

    // Users -> userCode (No Anggota)
    const users = userIds.length
      ? await UserModel.find({ _id: { $in: userIds } })
          .select("userCode")
          .lean()
      : [];

    const memberCodes: Record<string, string> = {};
    for (const u of users) {
      if (u?.userCode) memberCodes[String(u._id)] = u.userCode;
    }

    // PlantInstances -> kavling + productName by contractNumber
    const plants = orderIds.length
      ? await PlantInstanceModel.find({
          contractNumber: { $in: orderIds },
        })
          .select(
            "contractNumber kavling kavlingCode qrCode qrcode incomeRecords instanceName plantType"
          )
          .lean()
      : [];

    const plantByOrder: Record<
      string,
      { kavling?: string; productName?: string }
    > = {};
    for (const p of plants) {
      const key = p.contractNumber || "";
      if (!key) continue;
      plantByOrder[key] = {
        kavling: pickKavling(p),
        productName: pickProductName(p),
      };
    }

    return NextResponse.json({ memberCodes, plantByOrder });
  } catch (err: any) {
    console.error("[daily-export-helper] error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
