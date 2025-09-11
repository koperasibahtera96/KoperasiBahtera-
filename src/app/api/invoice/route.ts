import { ensureConnection } from "@/lib/utils/database";
import { User } from "@/models";
import Payment from "@/models/Payment";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type JSONish =
  | string
  | number
  | boolean
  | null
  | JSONish[]
  | { [k: string]: JSONish };

// ---- helpers ----
function toPlain(value: any): JSONish {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "object" &&
    (value._bsontype === "ObjectID" || value._bsontype === "ObjectId")
  ) {
    return (value.toHexString?.() ??
      value.toString?.() ??
      String(value)) as string;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPlain) as JSONish;
  if (typeof value === "object") {
    const out: Record<string, JSONish> = {};
    for (const [k, v] of Object.entries(value))
      if (v !== undefined) out[k] = toPlain(v);
    return out;
  }
  if (["string", "number", "boolean"].includes(typeof value))
    return value as JSONish;
  return String(value);
}

function parseDateFromQuery(q: string): { start: Date; end: Date } | null {
  const t = q.trim();

  // YYYY-MM-DD
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const start = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0, 0, 0, 0
    );
    const end = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23, 59, 59, 999
    );
    return { start, end };
  }
  // DD/MM/YYYY atau DD-MM-YYYY
  m = t.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    const start = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0, 0, 0, 0
    );
    const end = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23, 59, 59, 999
    );
    return { start, end };
  }
  // fallback Date.parse
  const d2 = new Date(t);
  if (!isNaN(d2.getTime())) {
    const start = new Date(
      d2.getFullYear(),
      d2.getMonth(),
      d2.getDate(),
      0, 0, 0, 0
    );
    const end = new Date(
      d2.getFullYear(),
      d2.getMonth(),
      d2.getDate(),
      23, 59, 59, 999
    );
    return { start, end };
  }
  return null;
}

function isHex24(s: string) {
  return /^[a-fA-F0-9]{24}$/.test(s);
}

const PER_PAGE = 9;

export async function GET(request: NextRequest) {
  try {
    await ensureConnection();

    const { searchParams } = new URL(request.url);

    // ---- read URL params ----
    const q = searchParams.get("q")?.trim() || "";
    const sortParam = searchParams.get("sort") === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const category = (searchParams.get("category") || "").trim().toLowerCase();

    // ---- build filter ----
    const filter: any = {};
    const or: any[] = [];
    const and: any[] = [];

    if (q) {
      // orderId (regex)
      or.push({ orderId: { $regex: q, $options: "i" } });

      // _id exact (24 hex)
      if (isHex24(q)) {
        or.push({ _id: new Types.ObjectId(q) });
      }

      // tanggal createdAt
      const d = parseDateFromQuery(q);
      if (d) {
        or.push({ createdAt: { $gte: d.start, $lte: d.end } });
      }
    }
    if (or.length) filter.$or = or;

    // ---- category filter (tambahan sesuai permintaan) ----
    // registration => paymentType === "registration"
    // cicilan => paymentType salah satu dari ["cicilan-installment","installment","cicilan"] DAN adminStatus === "Approved"
    // full => paymentType yang mengandung "full" (full / full investment)
    if (category === "registration") {
      and.push({ paymentType: "registration" });
    } else if (category === "cicilan") {
      and.push({
        paymentType: { $in: ["cicilan-installment", "installment", "cicilan"] },
      });
      and.push({ adminStatus: "approved" });
    } else if (category === "full") {
      and.push({
        $or: [
          { paymentType: "full" },
          { paymentType: "full investment" },
          { paymentType: { $regex: "^full", $options: "i" } },
        ],
      });
    }
    if (and.length) {
      filter.$and = filter.$and ? [...filter.$and, ...and] : and;
    }

    const total = await Payment.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const skip = (page - 1) * PER_PAGE;

    const sortDir = sortParam === "asc" ? 1 : -1;

    const raw = await Payment.find(filter)
      .sort({ createdAt: sortDir })
      .skip(skip)
      .limit(PER_PAGE)
      .lean();

    // user lookup
    const userIds = Array.from(
      new Set(
        raw
          .map((p: any) => {
            const u = p.userId;
            if (!u) return null;
            if (
              typeof u === "object" &&
              (u._bsontype === "ObjectID" || u._bsontype === "ObjectId")
            ) {
              return u.toHexString?.() ?? u.toString?.() ?? String(u);
            }
            return String(u);
          })
          .filter(Boolean) as string[]
      )
    );

    const usersById = new Map<
      string,
      {
        name?: string;
        username?: string;
        email?: string;
        profileImageUrl?: string;
      }
    >();

    if (userIds.length) {
      const users = await User.find({ _id: { $in: userIds } })
        .select({ _id: 1, name: 1, username: 1, email: 1, profileImageUrl: 1 })
        .lean();
      for (const u of users) {
        usersById.set(String(u._id), {
          name: (u as any).name,
          username: (u as any).username,
          email: (u as any).email,
          profileImageUrl: (u as any).profileImageUrl,
        });
      }
    }

    // sanitize + inject ref + userName
    const payments = raw.map((p: any) => {
      const plain = toPlain(p) as Record<string, JSONish>;
      const ref = String(plain._id ?? "");
      const userIdStr = plain.userId ? String(plain.userId) : "";
      const u = usersById.get(userIdStr);
      const userName = u?.name || u?.username || u?.email || userIdStr || "—";
      const userImage = u?.profileImageUrl || undefined;
      return { ...plain, ref, userName, userImage };
    });

    return NextResponse.json({
      payments,
      total,
      totalPages,
      currentPage: page,
      perPage: PER_PAGE,
    });
  } catch (error) {
    console.error("GET /api/invoice error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
