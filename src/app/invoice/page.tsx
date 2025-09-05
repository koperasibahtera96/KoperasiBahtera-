import InvoiceCard from "@/components/invoice/InvoiceCard";
import InvoiceControls from "@/components/invoice/InvoiceControls";
import { InvoiceLayout } from "@/components/invoice/InvoiceLayout";
import { ensureConnection } from "@/lib/utils/utils/database";
import { User } from "@/models";
import Payment from "@/models/Payment";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

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
      0,
      0,
      0,
      0
    );
    const end = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
      999
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
      0,
      0,
      0,
      0
    );
    const end = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
      999
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
      0,
      0,
      0,
      0
    );
    const end = new Date(
      d2.getFullYear(),
      d2.getMonth(),
      d2.getDate(),
      23,
      59,
      59,
      999
    );
    return { start, end };
  }
  return null;
}

function isHex24(s: string) {
  return /^[a-fA-F0-9]{24}$/.test(s);
}

const PER_PAGE = 9;

export default async function InvoicePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await ensureConnection();

  // ---- read URL params ----
  const q = (searchParams.q as string)?.trim() || "";
  const sortParam = (searchParams.sort as string) === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt((searchParams.page as string) || "1", 10));

  // ---- build filter ----
  const filter: any = {};
  const or: any[] = [];

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
    { name?: string; username?: string; email?: string }
  >();
  if (userIds.length) {
    const users = await User.find({ _id: { $in: userIds } })
      .select({ _id: 1, name: 1, username: 1, email: 1 })
      .lean();
    for (const u of users) {
      usersById.set(String(u._id), {
        name: (u as any).name,
        username: (u as any).username,
        email: (u as any).email,
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
    return { ...plain, ref, userName };
  });

  return (
    <InvoiceLayout>
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 font-[family-name:var(--font-poppins)]">
        <header>
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] mb-2 sm:mb-4">
              Invoice
            </h1>
            <p className="text-[#889063] text-base sm:text-lg">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-4 sm:p-6 lg:p-8 border border-[#324D3E]/10 shadow-xl">
            {/* Controls */}
            <InvoiceControls
              q={q}
              sort={sortParam}
              page={page}
              totalPages={totalPages}
              total={total}
              perPage={PER_PAGE}
            />

            {/* Grid - Responsive grid that adapts to all screen sizes */}
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
              {payments.map((p: any) => (
                <InvoiceCard key={String(p.ref || p._id)} payment={p} />
              ))}
            </div>

            {payments.length === 0 && (
              <div className="text-center text-[#889063] py-8 sm:py-12 bg-white/60 backdrop-blur-lg rounded-2xl border border-[#324D3E]/10 mt-6 sm:mt-8">
                <div className="text-sm sm:text-base">
                  Tidak ada invoice yang cocok.
                </div>
              </div>
            )}
          </div>
        </header>
      </div>
    </InvoiceLayout>
  );
}
